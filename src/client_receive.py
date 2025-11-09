#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time, argparse
import sounddevice as sd
from .shared.constants import *

class AVFlags:
    def __init__(self, audio_on=True, video_on=True):
        self._lock = threading.Lock()
        self.audio_on = audio_on
        self.video_on = video_on
    def set_audio(self, on: bool):
        with self._lock: self.audio_on = on
    def set_video(self, on: bool):
        with self._lock: self.video_on = on
    def is_audio_on(self):
        with self._lock: return self.audio_on
    def is_video_on(self):
        with self._lock: return self.video_on

def segment_send(sock, img_bytes, target):
    size = len(img_bytes)
    count = int(math.ceil(size / float(MAX_IMAGE_DGRAM)))
    start = 0
    remaining = count
    while remaining:
        end = min(size, start + MAX_IMAGE_DGRAM)
        sock.sendto(struct.pack("B", remaining) + img_bytes[start:end], target)
        start = end
        remaining -= 1

def receive_packets(sock, packet_queue, stop_event):
    while not stop_event.is_set():
        try:
            seg, _ = sock.recvfrom(MAX_DGRAM)
            packet_queue.put(seg)
        except:
            continue

def capture_and_uplink_video(server_host, flags: AVFlags, stop_event):
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[WARN] No local camera for video uplink.")
        return
    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, UPLINK_PORT)
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.02); continue
            if not flags.is_video_on():
                time.sleep(0.02); continue
            ok, enc = cv2.imencode(".jpg", frame, encode_param)
            if not ok: continue
            segment_send(uplink, enc.tobytes(), target)
            time.sleep(0.03)
    finally:
        cap.release()
        uplink.close()

def heartbeats(server_host, video_port, audio_port, stop_event, goodbye_event):
    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)
    def send_join():
        try:
            ctrl.sendto(f"JOIN {video_port}".encode(), server)
            ctrl.sendto(f"AJOIN {audio_port}".encode(), server)
        except: pass
    def send_leave():
        try:
            ctrl.sendto(f"LEAVE {video_port}".encode(), server)
            ctrl.sendto(f"ALEAVE {audio_port}".encode(), server)
        except: pass
    send_join()
    try:
        while not stop_event.is_set():
            if goodbye_event.is_set():
                send_leave()
                break
            time.sleep(HEARTBEAT_EVERY)
            try:
                ctrl.sendto(f"HEARTBEAT {video_port}".encode(), server)
                ctrl.sendto(f"AHEARTBEAT {audio_port}".encode(), server)
            except: pass
    finally:
        send_leave()
        ctrl.close()

def audio_capture_uplink(server_host, flags: AVFlags, stop_event):
    seq = 0
    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, AUDIO_UPLINK_PORT)
    def callback(indata, frames, time_info, status):
        nonlocal seq
        if stop_event.is_set(): raise sd.CallbackStop
        if not flags.is_audio_on(): return
        pcm = np.clip(indata[:, 0] * 32767.0, -32768, 32767).astype(np.int16)
        if pcm.shape[0] != AUDIO_SAMPLES: return
        ts_ns = time.time_ns()
        header = struct.pack("!QI", ts_ns, seq)
        seq = (seq + 1) & 0xFFFFFFFF
        try: uplink.sendto(header + pcm.tobytes(), target)
        except: pass
    try:
        with sd.InputStream(samplerate=AUDIO_RATE, channels=1, dtype='float32', blocksize=AUDIO_SAMPLES, callback=callback):
            while not stop_event.is_set(): time.sleep(0.1)
    finally:
        uplink.close()

def audio_downlink_receiver_bind(preferred_port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try: sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Audio port {preferred_port} busy, using ephemeral.")
    return sock, sock.getsockname()[1]

def audio_playback_loop(sock, flags: AVFlags, stop_event):
    sock.settimeout(0.5)
    header_size = 8 + 4
    outq = queue.Queue(maxsize=64)
    def net_reader():
        while not stop_event.is_set():
            try: pkt, _ = sock.recvfrom(4096)
            except socket.timeout: continue
            except: continue
            if len(pkt) < header_size: continue
            payload = pkt[header_size:]
            if len(payload) != AUDIO_SAMPLES * 2: continue
            try: outq.put_nowait(payload)
            except queue.Full: pass
    threading.Thread(target=net_reader, daemon=True).start()
    silence = np.zeros((AUDIO_SAMPLES,), dtype=np.int16)
    try:
        with sd.OutputStream(samplerate=AUDIO_RATE, channels=1, dtype='int16', blocksize=AUDIO_SAMPLES) as stream:
            while not stop_event.is_set():
                if not flags.is_audio_on():
                    stream.write(silence); continue
                try:
                    buf = outq.get(timeout=0.2)
                    block = np.frombuffer(buf, dtype=np.int16)
                except queue.Empty:
                    block = silence
                stream.write(block)
    finally:
        pass

def bind_udp(preferred_port: int):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try: sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Port {preferred_port} busy, using ephemeral instead.")
    actual_port = sock.getsockname()[1]
    return sock, actual_port

def local_control_server(server_host, flags: AVFlags, stop_event, goodbye_event, ctl_port=0):
    """
    UDP control on 127.0.0.1:<ctl_port>.
      MUTE/UNMUTE, VIDEO_OFF/VIDEO_ON, BYE
    Also sends VIDOFF/VIDON to the conferencing server immediately.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("127.0.0.1", ctl_port))
    actual = sock.getsockname()[1]
    print(f"[LOCALCTL] 127.0.0.1:{actual}", flush=True)

    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)

    while not stop_event.is_set():
        try: pkt, _ = sock.recvfrom(256)
        except: continue
        cmd = pkt.decode(errors="ignore").strip().upper()
        if cmd == "MUTE":
            flags.set_audio(False)
            print("[LOCALCTL] Audio muted", flush=True)
        elif cmd == "UNMUTE":
            flags.set_audio(True)
            print("[LOCALCTL] Audio unmuted", flush=True)
        elif cmd == "VIDEO_OFF":
            flags.set_video(False)
            try: ctrl.sendto(b"VIDOFF", server)
            except: pass
            print("[LOCALCTL] Video off", flush=True)
        elif cmd == "VIDEO_ON":
            flags.set_video(True)
            try: ctrl.sendto(b"VIDON", server)
            except: pass
            print("[LOCALCTL] Video on", flush=True)
        elif cmd == "BYE":
            goodbye_event.set()
            break
        else:
            print(f"[LOCALCTL] Unknown command: {cmd}", flush=True)

    sock.close()
    ctrl.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True, help="Server IP/host (Tailscale IP)")
    parser.add_argument("--port", type=int, default=DATA_PORT, help="Local UDP port for VIDEO receiving (0=auto)")
    parser.add_argument("--aport", type=int, default=0, help="Local UDP port for AUDIO receiving (0=auto)")
    parser.add_argument("--no-video", action="store_true", help="Disable local camera uplink")
    parser.add_argument("--no-audio", action="store_true", help="Disable microphone uplink/playback")
    parser.add_argument("--localctl", type=int, default=0, help="Local control UDP port (0=auto)")
    args = parser.parse_args()

    server_host = args.server.strip().split()[0]
    flags = AVFlags(audio_on=not args.no_audio, video_on=not args.no_video)

    vsock, vport = bind_udp(args.port)
    print(f"[INFO] Video recv on UDP {vport}, server={server_host}")
    asock, aport = audio_downlink_receiver_bind(args.aport)
    print(f"[INFO] Audio recv on UDP {aport}")

    pkt_queue = queue.Queue()
    stop_event = threading.Event()
    goodbye_event = threading.Event()

    threading.Thread(target=receive_packets, args=(vsock, pkt_queue, stop_event), daemon=True).start()
    threading.Thread(target=heartbeats, args=(server_host, vport, aport, stop_event, goodbye_event), daemon=True).start()
    if not args.no_video:
        threading.Thread(target=capture_and_uplink_video, args=(server_host, flags, stop_event), daemon=True).start()
    if not args.no_audio:
        threading.Thread(target=audio_capture_uplink, args=(server_host, flags, stop_event), daemon=True).start()
        threading.Thread(target=audio_playback_loop, args=(asock, flags, stop_event), daemon=True).start()
    threading.Thread(target=local_control_server, args=(server_host, flags, stop_event, goodbye_event, args.localctl), daemon=True).start()

    dat = b""
    print("[INFO] Receiving mosaic video (press 'q' to quit).")
    try:
        while not stop_event.is_set() and not goodbye_event.is_set():
            try:
                seg = pkt_queue.get(timeout=0.1)
            except queue.Empty:
                if goodbye_event.is_set(): break
                continue
            remain = struct.unpack("B", seg[0:1])[0]
            dat += seg[1:]
            if remain == 1:
                arr = np.frombuffer(dat, dtype=np.uint8)
                img = cv2.imdecode(arr, 1)
                dat = b""
                if img is not None:
                    cv2.imshow("Multiparty Stream", img)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    goodbye_event.set()
                    break
    except KeyboardInterrupt:
        goodbye_event.set()

    stop_event.set()
    try: vsock.close()
    except: pass
    try: asock.close()
    except: pass
    cv2.destroyAllWindows()
    print("[INFO] Client stopped.")

if __name__ == "__main__":
    main()
