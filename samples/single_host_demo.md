# Single-Host Demo

You can test both the server and client on the **same machine** using localhost.

---

## Steps

1️⃣ **Start the broadcaster**
```bash
python src/server_broadcast.py
````

2️⃣ **In another terminal, start the receiver**

```bash
python src/client_receive.py
```

3️⃣ You should see your webcam feed appear in a separate OpenCV window.

---

## Optional

To simulate multiple participants:

* Open **multiple terminals**
* Run multiple clients on **different ports**

  ```bash
  DATA_PORT=12346 python src/client_receive.py
  DATA_PORT=12347 python src/client_receive.py
  ```

Each one will `JOIN` the server separately and receive the same stream.

---

✅ **Tips**

* Press `Ctrl+C` on server or `q` on client to exit gracefully.
* Keep the queue small to minimize latency.
* Adjust `JPEG_QUALITY` in `shared/constants.py` for better quality or performance.
