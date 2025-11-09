MAX_DGRAM = 2**16
MAX_IMAGE_DGRAM = MAX_DGRAM - 64

DATA_PORT = 12345
CTRL_PORT = 15000

HEARTBEAT_TTL = 20       # seconds before a client is considered inactive
HEARTBEAT_EVERY = 5      # seconds between client heartbeats
JPEG_QUALITY = 60        # JPEG compression quality
SEND_WORKERS = 8         # number of threads for sending to participants

UPLINK_PORT = 16001  # clients -> server (their camera)
TILE_W, TILE_H = 320, 240  # mosaic tile size

