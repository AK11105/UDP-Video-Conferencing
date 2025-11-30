/**
 * Audio Player Module
 * 
 * Handles playback of PCM audio data from the conferencing system.
 * Supports:
 * - PCM int16 mono 8kHz input
 * - Jitter buffer for smooth playback
 * - Resampling to browser's sample rate
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private bufferQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private sampleRate: number = 8000; // Input sample rate from Python
  private jitterBufferMs: number = 100;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    this.nextPlayTime = this.audioContext.currentTime;
  }

  /**
   * Add PCM audio data to the playback queue
   * @param pcmData - Int16 PCM data as base64 string
   */
  async addAudioChunk(pcmData: string): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const audioContext = this.audioContext!;

    // Decode base64 to Int16Array
    const binaryString = atob(pcmData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to Int16Array (little-endian)
    const int16Data = new Int16Array(bytes.buffer);

    // Convert to Float32 and normalize
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    // Resample if necessary
    const resampledData = this.resample(float32Data, this.sampleRate, audioContext.sampleRate);

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(
      1, // mono
      resampledData.length,
      audioContext.sampleRate
    );
    audioBuffer.getChannelData(0).set(resampledData);

    this.bufferQueue.push(audioBuffer);
    this.schedulePlayback();
  }

  private resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return data;

    const ratio = toRate / fromRate;
    const newLength = Math.round(data.length * ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1);
      const t = srcIndex - srcIndexFloor;

      // Linear interpolation
      result[i] = data[srcIndexFloor] * (1 - t) + data[srcIndexCeil] * t;
    }

    return result;
  }

  private schedulePlayback(): void {
    if (!this.audioContext || this.bufferQueue.length === 0) return;

    const currentTime = this.audioContext.currentTime;
    
    // Add jitter buffer delay
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + this.jitterBufferMs / 1000;
    }

    while (this.bufferQueue.length > 0) {
      const buffer = this.bufferQueue.shift()!;
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
    }
  }

  /**
   * Stop playback and clear buffers
   */
  stop(): void {
    this.bufferQueue = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Get playback latency
   */
  getLatency(): number {
    if (!this.audioContext) return 0;
    return Math.max(0, (this.nextPlayTime - this.audioContext.currentTime) * 1000);
  }
}

// Singleton instance
export const audioPlayer = new AudioPlayer();
