#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time, argparse
import sounddevice as sd
import base64, json, sys
from .shared.constants import *
from .shared.metrics import metrics


# -----------------------------
# FLAGS
# -----------------------------
class AVFlags:
    def __init__(self, audio_on=True, video_on=True):
        self._lock = threading.Lock()
        self.audio_on = audio_on
        self.video_on = video_on

    def set_audio(self, on: bool):
        with self._lock:
            self.audio_on = on

    def set_video(self, on: bool):
        with self._lock:
            self.video_on = on

    def is_audio_on(self):
        with self._lock:
            return self.audio_on

    def is_video_on(self):
        with self._lock:
            return self.video_on


# -----------------------------
# VIDEO UPLINK
# -----------------------------
def segment_send(sock, img_bytes, target):
    size = len(img_bytes)
    count = int(math.ceil(size / float(MAX_IMAGE_DGRAM)))
    start = 0
    remaining = count

    try:
        metrics.mark_frame_start(("send", target[0]))
    except:
        pass

    while remaining:
        end = min(size, start + MAX_IMAGE_DGRAM)
        chunk = img_bytes[start:end]
        sock.sendto(struct.pack("B", remaining) + chunk, target)

        try:
            metrics.inc_bytes_sent(len(chunk))
        except:
            pass

        start = end
        remaining -= 1

    try:
        metrics.frame_sent()
    except:
        pass


def receive_packets(sock, packet_queue, stop_event):
    while not stop_event.is_set():
        try:
            seg, addr = sock.recvfrom(MAX_DGRAM)
            packet_queue.put((seg, addr))
        except:
            continue


def capture_and_uplink_video(server_host, flags: AVFlags, stop_event):
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[WARN] No local camera detected.")
        return

    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, UPLINK_PORT)
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]

    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.02)
                continue

            if not flags.is_video_on():
                time.sleep(0.02)
                continue

            t0 = time.perf_counter()
            ok, enc = cv2.imencode(".jpg", frame, encode_param)
            enc_ms = (time.perf_counter() - t0) * 1000

            if ok:
                try:
                    metrics.add_encode_time(enc_ms)
                except:
                    pass
                segment_send(uplink, enc.tobytes(), target)

            time.sleep(0.03)

    finally:
        cap.release()
        uplink.close()


# -----------------------------
# HEARTBEATS
# -----------------------------
def heartbeats(server_host, video_port, audio_port, stop_event, goodbye_event):
    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    srv = (server_host, CTRL_PORT)

    def send_join():
        try:
            ctrl.sendto(f"JOIN {video_port}".encode(), srv)
            ctrl.sendto(f"AJOIN {audio_port}".encode(), srv)
        except:
            pass

    def send_leave():
        try:
            ctrl.sendto(f"LEAVE {video_port}".encode(), srv)
            ctrl.sendto(f"ALEAVE {audio_port}".encode(), srv)
        except:
            pass

    send_join()

    try:
        while not stop_event.is_set():
            if goodbye_event.is_set():
                send_leave()
                break
            time.sleep(HEARTBEAT_EVERY)
            try:
                ctrl.sendto(f"HEARTBEAT {video_port}".encode(), srv)
                ctrl.sendto(f"AHEARTBEAT {audio_port}".encode(), srv)
            except:
                pass
    finally:
        send_leave()
        ctrl.close()


# -----------------------------
# AUDIO UPLINK
# -----------------------------
def audio_capture_uplink(server_host, flags: AVFlags, stop_event):
    seq = 0
    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, AUDIO_UPLINK_PORT)

    def callback(indata, frames, time_info, status):
        nonlocal seq
        if stop_event.is_set():
            raise sd.CallbackStop

        if not flags.is_audio_on():
            return

        pcm = np.clip(indata[:, 0] * 32767.0, -32768, 32767).astype(np.int16)
        if pcm.shape[0] != AUDIO_SAMPLES:
            return

        ts_ns = time.time_ns()
        header = struct.pack("!QI", ts_ns, seq)
        seq = (seq + 1) % (2**32)

        try:
            uplink.sendto(header + pcm.tobytes(), target)
            metrics.inc_bytes_sent(len(header) + pcm.nbytes)
        except:
            pass

    try:
        with sd.InputStream(
            samplerate=AUDIO_RATE,
            channels=1,
            dtype="float32",
            blocksize=AUDIO_SAMPLES,
            callback=callback
        ):
            while not stop_event.is_set():
                time.sleep(0.1)
    finally:
        uplink.close()


# -----------------------------
# AUDIO DOWNLINK
# -----------------------------
def audio_downlink_receiver_bind(preferred_port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            print(f"[WARN] Audio port {preferred_port} busy -> using random ephemeral port")
            sock.bind(("0.0.0.0", 0))
    return sock, sock.getsockname()[1]


def audio_playback_loop(sock, flags: AVFlags, stop_event):
    header_bytes = 12
    outq = queue.Queue(maxsize=64)

    def reader():
        while not stop_event.is_set():
            try:
                pkt, _ = sock.recvfrom(4096)
            except:
                continue

            if len(pkt) <= header_bytes:
                continue

            payload = pkt[header_bytes:]
            if len(payload) != AUDIO_SAMPLES * 2:
                continue

            try:
                outq.put_nowait(payload)
            except queue.Full:
                pass

    threading.Thread(target=reader, daemon=True).start()

    silence = np.zeros((AUDIO_SAMPLES,), dtype=np.int16)

    try:
        with sd.OutputStream(
            samplerate=AUDIO_RATE,
            channels=1,
            dtype="int16",
            blocksize=AUDIO_SAMPLES,
        ) as stream:
            while not stop_event.is_set():
                if not flags.is_audio_on():
                    stream.write(silence)
                    continue

                try:
                    buf = outq.get(timeout=0.2)
                    block = np.frombuffer(buf, dtype=np.int16)
                except queue.Empty:
                    block = silence

                stream.write(block)
    finally:
        pass


# -----------------------------
# GENERIC UDP BIND
# -----------------------------
def bind_udp(preferred_port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except:
            print(f"[WARN] Port {preferred_port} busy -> using random ephemeral port")
            sock.bind(("0.0.0.0", 0))
    return sock, sock.getsockname()[1]


# -----------------------------
# LOCAL CONTROL SERVER
# -----------------------------
def local_control_server(server_host, flags: AVFlags, stop_event, goodbye_event, ctl_port=0):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("127.0.0.1", ctl_port))
    actual_port = sock.getsockname()[1]

    # BRIDGE USES THIS LINE
    print(f"[LOCALCTL] running at udp://127.0.0.1:{actual_port}", flush=True)

    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)

    while not stop_event.is_set():
        try:
            pkt, _ = sock.recvfrom(256)
        except:
            continue

        cmd = pkt.decode(errors="ignore").strip().upper()

        if cmd == "MUTE":
            flags.set_audio(False)
        elif cmd == "UNMUTE":
            flags.set_audio(True)
        elif cmd == "VIDEO_OFF":
            flags.set_video(False)
            ctrl.sendto(b"VIDOFF", server)
        elif cmd == "VIDEO_ON":
            flags.set_video(True)
            ctrl.sendto(b"VIDON", server)
        elif cmd == "BYE":
            goodbye_event.set()
            break

    sock.close()
    ctrl.close()


# ===============================================================
# ================   VIDEO MOSAIC DOWNLINK LOOP   ===============
# ===============================================================
def video_downlink_loop(pkt_queue, stop_event, goodbye_event):
    """
    Replaces GUI (imshow) with sending base64 JPEG frames to stdout
    so Node bridge can forward to WebSocket → React frontend.
    """

    dat = b""
    print("[INFO] Receiving mosaic frames (stream mode, no GUI)", flush=True)

    try:
        while not stop_event.is_set() and not goodbye_event.is_set():
            try:
                seg, addr = pkt_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            metrics.inc_bytes_recv(len(seg))

            remain = seg[0]
            if len(dat) == 0:
                metrics.mark_frame_start(("recv", addr[0]))

            dat += seg[1:]

            if remain == 1:
                arr = np.frombuffer(dat, dtype=np.uint8)
                t0 = time.perf_counter()
                img = cv2.imdecode(arr, 1)
                dec_ms = (time.perf_counter() - t0) * 1000
                metrics.add_decode_time(dec_ms)

                dat = b""

                if img is not None:
                    metrics.frame_received()
                    metrics.mark_frame_complete(("recv", addr[0]))

                    ok, enc = cv2.imencode(".jpg", img)
                    if ok:
                        b64 = base64.b64encode(enc).decode()
                        sys.stdout.write(json.dumps({
                            "type": "frame",
                            "payload": b64
                        }) + "\n")
                        sys.stdout.flush()
                else:
                    metrics.frame_dropped()

    except KeyboardInterrupt:
        goodbye_event.set()


# -----------------------------
# MAIN
# -----------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    parser.add_argument("--port", type=int, default=DATA_PORT)
    parser.add_argument("--aport", type=int, default=0)
    parser.add_argument("--no-video", action="store_true")
    parser.add_argument("--no-audio", action="store_true")
    parser.add_argument("--localctl", type=int, default=0)

    args = parser.parse_args()
    server_host = args.server.strip()

    flags = AVFlags(audio_on=not args.no_audio, video_on=not args.no_video)

    vsock, vport = bind_udp(args.port)
    asock, aport = audio_downlink_receiver_bind(args.aport)

    print(f"[INFO] Video recv = UDP/{vport}")
    print(f"[INFO] Audio recv = UDP/{aport}")

    pkt_queue = queue.Queue()
    stop_event = threading.Event()
    goodbye_event = threading.Event()

    # Threads
    threading.Thread(target=receive_packets, args=(vsock, pkt_queue, stop_event), daemon=True).start()
    threading.Thread(target=heartbeats, args=(server_host, vport, aport, stop_event, goodbye_event), daemon=True).start()

    if not args.no_video:
        threading.Thread(target=capture_and_uplink_video, args=(server_host, flags, stop_event), daemon=True).start()

    if not args.no_audio:
        threading.Thread(target=audio_capture_uplink, args=(server_host, flags, stop_event), daemon=True).start()
        threading.Thread(target=audio_playback_loop, args=(asock, flags, stop_event), daemon=True).start()

    threading.Thread(target=local_control_server, args=(server_host, flags, stop_event, goodbye_event, args.localctl), daemon=True).start()

    # VIDEO MOSAIC DOWNLINK (NO GUI — STREAM TO STDOUT)
    threading.Thread(target=video_downlink_loop, args=(pkt_queue, stop_event, goodbye_event), daemon=True).start()

    # Wait for BYE
    try:
        while not goodbye_event.is_set():
            time.sleep(0.2)
    except KeyboardInterrupt:
        goodbye_event.set()

    stop_event.set()
    vsock.close()
    asock.close()
    metrics.stop()
    print("[INFO] Client stopped.", flush=True)


if __name__ == "__main__":
    main()
