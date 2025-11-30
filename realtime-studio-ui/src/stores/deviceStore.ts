import { create } from 'zustand';
import type { DeviceInfo } from '@/lib/types';

interface DeviceStore {
  cameras: DeviceInfo[];
  microphones: DeviceInfo[];
  speakers: DeviceInfo[];
  
  selectedCamera: string | null;
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  
  localStream: MediaStream | null;
  audioLevel: number;
  
  isLoadingDevices: boolean;
  deviceError: string | null;
  
  // Actions
  loadDevices: () => Promise<void>;
  selectCamera: (deviceId: string) => void;
  selectMicrophone: (deviceId: string) => void;
  selectSpeaker: (deviceId: string) => void;
  startLocalPreview: () => Promise<void>;
  stopLocalPreview: () => void;
  setAudioLevel: (level: number) => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  cameras: [],
  microphones: [],
  speakers: [],
  selectedCamera: null,
  selectedMicrophone: null,
  selectedSpeaker: null,
  localStream: null,
  audioLevel: 0,
  isLoadingDevices: false,
  deviceError: null,

  loadDevices: async () => {
    set({ isLoadingDevices: true, deviceError: null });
    
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()));
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'videoinput' }));
      
      const microphones = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audioinput' }));
      
      const speakers = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audiooutput' }));
      
      set({
        cameras,
        microphones,
        speakers,
        selectedCamera: cameras[0]?.deviceId || null,
        selectedMicrophone: microphones[0]?.deviceId || null,
        selectedSpeaker: speakers[0]?.deviceId || null,
        isLoadingDevices: false,
      });
    } catch (error) {
      set({
        deviceError: error instanceof Error ? error.message : 'Failed to load devices',
        isLoadingDevices: false,
      });
    }
  },

  selectCamera: (deviceId) => set({ selectedCamera: deviceId }),
  selectMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
  selectSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),

  startLocalPreview: async () => {
    const { selectedCamera, selectedMicrophone, stopLocalPreview } = get();
    
    stopLocalPreview();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true,
      });
      
      set({ localStream: stream });
      
      // Set up audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkLevel = () => {
        if (get().localStream !== stream) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        set({ audioLevel: Math.min(100, average * 2) });
        requestAnimationFrame(checkLevel);
      };
      checkLevel();
      
    } catch (error) {
      set({
        deviceError: error instanceof Error ? error.message : 'Failed to start preview',
      });
    }
  },

  stopLocalPreview: () => {
    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      set({ localStream: null, audioLevel: 0 });
    }
  },

  setAudioLevel: (level) => set({ audioLevel: level }),
}));
