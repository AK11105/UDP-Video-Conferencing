# Backend Setup Guide

This React application is the frontend UI for a UDP-based real-time AV conferencing system. To fully integrate with your Python conferencing backend, you'll need a bridge server.

## Architecture Overview

```
┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│   React Frontend    │◄──────────────────►│   Bridge Server     │
│   (This Project)    │                    │   (Node/Electron)   │
└─────────────────────┘                    └─────────────────────┘
                                                     │
                                                     │ Spawns & Controls
                                                     ▼
                                           ┌─────────────────────┐
                                           │   Python Client     │
                                           │   (Your Scripts)    │
                                           └─────────────────────┘
                                                     │
                                                     │ UDP
                                                     ▼
                                           ┌─────────────────────┐
                                           │   UDP Server        │
                                           │   (Conference Host) │
                                           └─────────────────────┘
```

## Bridge Server Requirements

The bridge server needs to:

1. **Spawn Python Client Process**
   - Start your Python conference client with appropriate arguments
   - Parse stdout for the `[LOCALCTL] udp://127.0.0.1:<port>` line
   - Stream stdout/stderr to the frontend

2. **Send UDP Control Commands**
   - Receive commands from frontend via HTTP/WebSocket
   - Send UDP packets to 127.0.0.1:<localctl_port>
   - Commands: MUTE, UNMUTE, VIDEO_ON, VIDEO_OFF, BYE, WHO

3. **Stream Video Frames**
   - Receive mosaic JPEG frames from Python client
   - Forward to frontend via WebSocket

4. **Health Monitoring**
   - Track heartbeats
   - Detect disconnections
   - Report metrics

## Example Node.js Bridge Server

```typescript
// server.ts
import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import dgram from 'dgram';

const app = express();
const port = 3001;

app.use(express.json());

let pythonProcess: any = null;
let localCtlPort: number | null = null;
const udpSocket = dgram.createSocket('udp4');

// Start Python client
app.post('/api/client/start', (req, res) => {
  const { serverIp, serverPort, quality } = req.body;
  
  pythonProcess = spawn('python', [
    'your_client.py',
    '--server', serverIp,
    '--port', serverPort.toString(),
    '--quality', quality || 'medium'
  ]);

  pythonProcess.stdout.on('data', (data: Buffer) => {
    const output = data.toString();
    console.log('[Python]', output);
    
    // Parse local control port
    const match = output.match(/\[LOCALCTL\] udp:\/\/127\.0\.0\.1:(\d+)/);
    if (match) {
      localCtlPort = parseInt(match[1]);
      res.json({ success: true, localControlPort: localCtlPort });
    }
    
    // Broadcast to WebSocket clients
    broadcastLog(output);
  });

  pythonProcess.stderr.on('data', (data: Buffer) => {
    console.error('[Python Error]', data.toString());
    broadcastLog(data.toString(), 'error');
  });
});

// Send UDP command
app.post('/api/control', (req, res) => {
  const { command, host, port } = req.body;
  
  if (!port) {
    return res.status(400).json({ error: 'No control port specified' });
  }

  const message = Buffer.from(command);
  udpSocket.send(message, port, host, (err) => {
    if (err) {
      console.error('UDP send error:', err);
      return res.status(500).json({ error: 'Failed to send command' });
    }
    res.json({ success: true });
  });
});

// Stop client
app.post('/api/client/stop', (req, res) => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    localCtlPort = null;
  }
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    pythonRunning: pythonProcess !== null,
    localCtlPort 
  });
});

// WebSocket for real-time updates
const server = app.listen(port);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastLog(message: string, level = 'info') {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type: 'log', payload: { level, message } }));
  });
}

function broadcastFrame(frameData: string) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type: 'frame', payload: frameData }));
  });
}

console.log(`Bridge server running on port ${port}`);
```

## Electron Alternative

For a desktop application, you can use Electron:

```typescript
// main.ts (Electron main process)
import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import dgram from 'dgram';

let pythonProcess: any = null;
const udpSocket = dgram.createSocket('udp4');

ipcMain.handle('start-client', async (event, config) => {
  pythonProcess = spawn('python', ['client.py', ...args]);
  // ... handle stdout/stderr
});

ipcMain.handle('send-command', async (event, { command, port }) => {
  return new Promise((resolve, reject) => {
    udpSocket.send(Buffer.from(command), port, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
});
```

## Running the Frontend

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The frontend will be available at `http://localhost:8080`

4. Configure the backend URL in `src/lib/udpBridge.ts` if needed

## Integration Points

### 1. Connection Screen
- User enters server IP and selects devices
- On "Join Session", calls bridge server to spawn Python client
- Waits for local control port to be reported

### 2. Call Screen
- Receives video frames via WebSocket
- Sends control commands (mute/unmute/video) via HTTP
- Displays metrics and logs from Python stdout

### 3. Control Commands
The frontend sends these commands to the bridge:
- `MUTE` - Mute microphone
- `UNMUTE` - Unmute microphone
- `VIDEO_ON` - Enable camera
- `VIDEO_OFF` - Disable camera
- `WHO` - Request participant list
- `BYE` - Leave conference

## Customization

### Video Frame Format
The frontend expects JPEG frames as base64 strings. Modify `VideoMosaic.tsx` if your format differs.

### Audio Playback
See `src/lib/audioPlayer.ts` for PCM int16 mono 8kHz playback. Adjust sample rate if needed.

### Metrics
Update the metrics structure in `src/lib/types.ts` to match your Python client's output.
