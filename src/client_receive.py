#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time, argparse, sounddevice as sd
from .shared.constants import *

# =============== Video helpers ===============

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

def capture_and_uplink_video(server_host, stop_event):
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
                time.sleep(0.05); continue
            ok, enc = cv2.imencode(".jpg", frame, encode_param)
            if not ok: continue
            segment_send(uplink, enc.tobytes(), target)
            time.sleep(0.03)
    finally:
        cap.release()
        uplink.close()

# =============== Control plane ===============

def heartbeats(server_host, video_port, audio_port, stop_event):
    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)
    # announce both video and audio receiving ports
    ctrl.sendto(f"JOIN {video_port}".encode(), server)
    ctrl.sendto(f"AJOIN {audio_port}".encode(), server)
    try:
        while not stop_event.is_set():
            time.sleep(HEARTBEAT_EVERY)
            ctrl.sendto(f"HEARTBEAT {video_port}".encode(), server)
            ctrl.sendto(f"AHEARTBEAT {audio_port}".encode(), server)
    finally:
        try:
            ctrl.sendto(f"LEAVE {video_port}".encode(), server)
            ctrl.sendto(f"ALEAVE {audio_port}".encode(), server)
        except:
            pass
        ctrl.close()

# =============== Audio capture/playback ===============

def audio_capture_uplink(server_host, stop_event):
    """
    Capture mic at 48kHz mono, 20ms frames, send raw PCM to server on AUDIO_UPLINK_PORT.
    Packet = [uint64 ts_ns][uint32 seq][PCM16 * AUDIO_SAMPLES]
    """
    seq = 0
    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, AUDIO_UPLINK_PORT)

    def callback(indata, frames, time_info, status):
        nonlocal seq
        if stop_event.is_set():
            raise sd.CallbackStop
        if status:  # audio glitches etc.
            pass
        # indata is float32 [-1,1]; convert to int16
        pcm = np.clip(indata[:, 0] * 32767.0, -32768, 32767).astype(np.int16)
        if pcm.shape[0] != AUDIO_SAMPLES:
            # drop partial blocks
            return
        ts_ns = time.time_ns()
        header = struct.pack("!QI", ts_ns, seq)
        seq = (seq + 1) & 0xFFFFFFFF
        try:
            uplink.sendto(header + pcm.tobytes(), target)
        except:
            pass

    try:
        with sd.InputStream(samplerate=AUDIO_RATE, channels=1,
                            dtype='float32', blocksize=AUDIO_SAMPLES,
                            callback=callback):
            while not stop_event.is_set():
                time.sleep(0.1)
    finally:
        uplink.close()

def audio_downlink_receiver_bind(preferred_port):
    """Bind local UDP socket to receive mixed audio."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Audio port {preferred_port} busy, using ephemeral.")
    return sock, sock.getsockname()[1]

def audio_playback_loop(sock, stop_event):
    """
    Receive mixed PCM frames and play. Packet = [uint64 ts_ns][uint32 seq][PCM int16 * AUDIO_SAMPLES]
    """
    header_size = 8 + 4
    outq = queue.Queue(maxsize=32)

    def net_reader():
        while not stop_event.is_set():
            try:
                pkt, _ = sock.recvfrom(4096)
            except:
                continue
            if len(pkt) < header_size:  # malformed
                continue
            payload = pkt[header_size:]
            if len(payload) != AUDIO_SAMPLES * 2:
                continue
            # enqueue bytes
            try:
                outq.put_nowait(payload)
            except queue.Full:
                pass

    t = threading.Thread(target=net_reader, daemon=True)
    t.start()

    def audiogen():
        while not stop_event.is_set():
            try:
                buf = outq.get(timeout=0.1)
            except queue.Empty:
                # play silence if nothing
                yield np.zeros((AUDIO_SAMPLES,), dtype=np.int16)
                continue
            yield np.frombuffer(buf, dtype=np.int16)

    try:
        with sd.OutputStream(samplerate=AUDIO_RATE, channels=1, dtype='int16',
                             blocksize=AUDIO_SAMPLES):
            for block in audiogen():
                sd.play(block, samplerate=AUDIO_RATE, blocking=True)
    finally:
        pass

# =============== Video bind helper ===============

def bind_udp(preferred_port: int):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Port {preferred_port} busy, using ephemeral instead.")
    actual_port = sock.getsockname()[1]
    return sock, actual_port

# =============== Main ===============

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True, help="Server IP/host (Tailscale IP)")
    parser.add_argument("--port", type=int, default=DATA_PORT, help="Local UDP port for VIDEO receiving (0=auto)")
    parser.add_argument("--aport", type=int, default=0, help="Local UDP port for AUDIO receiving (0=auto)")
    parser.add_argument("--no-video", action="store_true", help="Disable local camera uplink")
    parser.add_argument("--no-audio", action="store_true", help="Disable microphone uplink/playback")
    args = parser.parse_args()

    server_host = args.server.strip().split()[0]

    # VIDEO receive socket
    vsock, vport = bind_udp(args.port)
    print(f"[INFO] Video recv on UDP {vport}, server={server_host}")

    # AUDIO receive socket
    asock, aport = audio_downlink_receiver_bind(args.aport)
    print(f"[INFO] Audio recv on UDP {aport}")

    pkt_queue, stop_event = queue.Queue(), threading.Event()

    # start threads
    threading.Thread(target=receive_packets, args=(vsock, pkt_queue, stop_event), daemon=True).start()
    threading.Thread(target=heartbeats, args=(server_host, vport, aport, stop_event), daemon=True).start()

    if not args.no_video:
        threading.Thread(target=capture_and_uplink_video, args=(server_host, stop_event), daemon=True).start()
    if not args.no_audio:
        threading.Thread(target=audio_capture_uplink, args=(server_host, stop_event), daemon=True).start()
        threading.Thread(target=audio_playback_loop, args=(asock, stop_event), daemon=True).start()

    # video window
    dat = b""
    print("[INFO] Receiving mosaic video (press 'q' to quit).")
    try:
        while True:
            try:
                seg = pkt_queue.get(timeout=0.1)
            except queue.Empty:
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
                    break
    except KeyboardInterrupt:
        pass

    stop_event.set()
    vsock.close()
    asock.close()
    cv2.destroyAllWindows()
    print("[INFO] Client stopped.")

if __name__ == "__main__":
    main()
