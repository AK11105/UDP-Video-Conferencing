import { useEffect, useCallback, useRef } from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import { fetchMetricsCSV } from '@/utils/csvParser';

// FINAL URL for your Python server:
const METRICS_URL = 'http://localhost:8000/metrics/metrics.csv';

export const useMetricsPolling = () => {
  const { 
    setRawData, 
    setLoading, 
    setError, 
    pollingInterval, 
    isPolling,
    rawData 
  } = useMetricsStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch REAL CSV
      const data = await fetchMetricsCSV(METRICS_URL);

      // Store it
      setRawData(data);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch metrics';
      setError(message);
      console.error('Metrics fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [setRawData, setLoading, setError]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Polling
    if (isPolling) {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, pollingInterval, isPolling]);

  return {
    refetch: fetchData,
    dataCount: rawData.length,
  };
};
