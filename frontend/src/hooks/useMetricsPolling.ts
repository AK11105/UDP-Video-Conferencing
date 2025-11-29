

import { useEffect, useCallback, useRef } from "react";
import { useMetricsStore } from "@/store/metricsStore";
import { fetchMetricsCSV } from "@/utils/csvParser";

// Change this to false when AV system is connected
const USE_MOCK_DATA = false;

// const METRICS_URL = "/metrics/metrics.csv";
const METRICS_URL = 'http://localhost:8000/metrics/metrics.csv';

// ----------- SMOOTH TIMESTAMP FUNCTION (fix invalid date forever) ----------
const toISO = (ts: any) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export const useMetricsPolling = () => {
  const {
    setRawData,
    setLoading,
    setError,
    isPolling,
    pollingInterval,
    rawData,
  } = useMetricsStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ------------- PREGENERATED MOCK DATA (only used if enabled) -------------
  const mockRef = useRef<any[]>([]);
  const mockCount = useRef(0);

  const generateMockRecord = () => {
    mockCount.current++;

    return {
      ts: new Date().toISOString(),
      protocol: mockCount.current % 3 === 0 ? "SCTP" : mockCount.current % 2 === 0 ? "TCP" : "UDP",
      bitrate_kbps: 3000 + Math.random() * 500,
      throughput_kbps: 2800 + Math.random() * 500,
      goodput_kbps: 2600 + Math.random() * 500,

      latency_ms_avg: 20 + Math.random() * 10,
      jitter_ms_avg: 5 + Math.random() * 3,
      packet_loss_rate: Math.random() * 0.01,

      encode_ms_avg: 3 + Math.random(),
      decode_ms_avg: 4 + Math.random(),
      reassembly_ms_avg: 2 + Math.random(),

      cpu_pct: 20 + Math.random() * 10,
      mem_pct: 30 + Math.random() * 10,
      proc_cpu_pct: 10 + Math.random() * 5,

      // audio
      audio_latency_ms: 25 + Math.random() * 5,
      audio_jitter_ms: 4 + Math.random(),
      audio_packet_loss_rate: Math.random() * 0.005,
      audio_bitrate: 48 + Math.random() * 4,
      audio_levels: -25 + Math.random() * 5,
    };
  };

  // ---------------------- MAIN DATA FETCHER -----------------------
  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK_DATA) {
        // mock generator
        const newRec = generateMockRecord();

        mockRef.current = [
          ...mockRef.current.slice(-499),
          newRec,
        ];

        setRawData(mockRef.current);
        return;
      }

      // ---- REAL CSV FETCH ----
      setLoading(true);

      const parsed = await fetchMetricsCSV(METRICS_URL);

      // convert timestamps properly for charts
      const safeData = parsed.map((row) => ({
        ...row,
        ts: toISO(row.ts),
      }));

      setRawData(safeData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Metrics fetch failed";
      setError(msg);
      console.error("Metrics polling error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------- POLLING LOOP -----------------------
  useEffect(() => {
    fetchData(); // initial

    if (isPolling) {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, pollingInterval]);

  return {
    refetch: fetchData,
    dataCount: rawData.length,
  };
};
