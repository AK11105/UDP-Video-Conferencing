# Video UDP Multiparty Streaming

This project implements a **multithreaded, multi-participant UDP video conferencing system**.

- **Server (`server_broadcast.py`)** captures webcam frames, compresses them once, and broadcasts to all connected participants via UDP.
- **Client (`client_receive.py`)** receives segmented JPEG frames, reassembles them, and displays video in real time.

Both use lightweight control-plane messages (`JOIN`, `LEAVE`, `HEARTBEAT`) to manage participant presence dynamically.

---

## ⚙️ Features

✅ Multithreaded capture, send, and control  
✅ Multiple concurrent participants  
✅ Automatic join/leave detection  
✅ Stateless, low-latency UDP streaming  
✅ Automatic pruning of inactive clients  

---

## 🧩 Architecture Overview

```

Client A/B/C  <-- JOIN/HEARTBEAT -->  [Server Control Port 15000]
Client A/B/C  <-- Video Segments -->   [Server Data Port 12345]

````

- **Data Plane:** JPEG-compressed frames sent in UDP fragments (each ≤64 KB)
- **Control Plane:** Lightweight UDP protocol for registration & liveness

---

## 🚀 Quick Start

1️⃣ Install dependencies:
```bash
pip install -r requirements.txt
````

2️⃣ Run the server:

```bash
python src/server_broadcast.py
```

3️⃣ Run clients (same or different machines):

```bash
python src/client_receive.py
```

Edit `SERVER_HOST` in `client_receive.py` to your server’s IP.

---

## 🧱 Folder Structure

```
video-udp-multiparty/
├── requirements.txt
├── README.md
├── .env.example
├── src/
│   ├── server_broadcast.py
│   ├── client_receive.py
│   ├── shared/
│   │   ├── __init__.py
│   │   └── constants.py
│   └── utils/
│       ├── __init__.py
│       └── net.py
├── scripts/
│   ├── run_server.sh
│   └── run_client.sh
├── tests/
│   ├── test_protocol.py
│   └── test_segmentation.py
└── samples/
    └── single_host_demo.md
```

---

## 📡 Protocol Summary

| Message Type       | Example           | Direction       | Meaning                          |
| ------------------ | ----------------- | --------------- | -------------------------------- |
| `JOIN <port>`      | `JOIN 12345`      | Client → Server | Register for video on given port |
| `HEARTBEAT <port>` | `HEARTBEAT 12345` | Client → Server | Keep alive (every 5s)            |
| `LEAVE <port>`     | `LEAVE 12345`     | Client → Server | Graceful disconnect              |

---

## 💡 Notes

* UDP has no retransmission; expect occasional dropped frames.
* Default video compression quality: `60` (see `shared/constants.py`).
* Server prunes clients inactive for >20 seconds.

---

## 📘 License

MIT License

````

---

## ⚙️ `.env.example`

```env
# Example environment variables for local or network setup

SERVER_HOST=127.0.0.1
DATA_PORT=12345
CTRL_PORT=15000
HEARTBEAT_EVERY=5
HEARTBEAT_TTL=20
JPEG_QUALITY=60
````

---

