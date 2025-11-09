# --- UDP sizes ---
MAX_DGRAM = 2**16
MAX_IMAGE_DGRAM = MAX_DGRAM - 64

# --- Video ports (unchanged) ---
DATA_PORT  = 12345   # server -> clients (mosaic)
CTRL_PORT  = 15000   # clients -> server (JOIN/LEAVE/HEARTBEAT)
UPLINK_PORT = 16001  # clients -> server (video uplink)

# --- Audio ports (NEW) ---
AUDIO_UPLINK_PORT   = 17001  # clients -> server (audio uplink)
AUDIO_DOWNLINK_PORT = 17002  # server -> clients (audio downlink)

# --- Liveness ---
HEARTBEAT_TTL   = 20
HEARTBEAT_EVERY = 5

# --- Video quality ---
JPEG_QUALITY = 60
SEND_WORKERS = 8
TILE_W, TILE_H = 320, 240

# --- Audio parameters ---
AUDIO_RATE       = 48000       # Hz
AUDIO_CHANNELS   = 1           # mono mix
AUDIO_DT_MS      = 20          # frame size (ms)
AUDIO_SAMPLES    = int(AUDIO_RATE * AUDIO_DT_MS / 1000)  # 960
AUDIO_DTYPE      = "int16"     # PCM 16-bit
AUDIO_PAYLOAD_MAX_AGE_MS = 100 # ignore talkers older than this in the mix
