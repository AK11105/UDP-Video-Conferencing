import { useState, useMemo } from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import { MetricRecord, Protocol } from '@/types/metrics';
import { formatTimestamp } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Database,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  Filter,
} from 'lucide-react';

type SortField = keyof MetricRecord;
type SortDirection = 'asc' | 'desc';

export const RawDataViewer = () => {
  const { rawData } = useMetricsStore();
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<Protocol | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('ts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filter and sort data
  const filteredData = useMemo(() => {
    let data = [...rawData];

    // Protocol filter
    if (protocolFilter !== 'all') {
      data = data.filter(d => d.protocol === protocolFilter);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      data = data.filter(d =>
        Object.values(d).some(v =>
          String(v).toLowerCase().includes(searchLower)
        )
      );
    }

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [rawData, protocolFilter, search, sortField, sortDirection]);

  // Paginate
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownload = () => {
    const headers = ['ts', 'protocol', 'role', 'bytes_sent', 'bytes_recv', 'latency_ms_avg', 'jitter_ms_avg', 'packet_loss_rate', 'bitrate_kbps', 'cpu_pct', 'mem_pct'];
    const csv = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(h => row[h as keyof MetricRecord] ?? '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: { key: SortField; label: string }[] = [
    { key: 'ts', label: 'Timestamp' },
    { key: 'protocol', label: 'Protocol' },
    { key: 'bytes_sent', label: 'Bytes Sent' },
    { key: 'bytes_recv', label: 'Bytes Recv' },
    { key: 'latency_ms_avg', label: 'Latency' },
    { key: 'jitter_ms_avg', label: 'Jitter' },
    { key: 'packet_loss_rate', label: 'Loss %' },
    { key: 'bitrate_kbps', label: 'Bitrate' },
    { key: 'cpu_pct', label: 'CPU %' },
    { key: 'mem_pct', label: 'Mem %' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raw Data Viewer</h1>
          <p className="text-muted-foreground">{filteredData.length} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value as Protocol | 'all')}
              className="h-10 px-3 text-sm bg-secondary text-secondary-foreground rounded-lg border-0 focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Protocols</option>
              <option value="UDP">UDP</option>
              <option value="TCP">TCP</option>
              <option value="SCTP">SCTP</option>
            </select>
          </div>

          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, i) => (
                <tr key={`${row.ts}-${i}`} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}>
                  <td className="px-4 py-2 text-xs font-mono">{formatTimestamp(row.ts)}</td>
                  <td className="px-4 py-2">
                    <span className={`protocol-badge-${row.protocol.toLowerCase()}`}>
                      {row.protocol}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{row.bytes_sent?.toLocaleString() ?? 'N/A'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.bytes_recv?.toLocaleString() ?? 'N/A'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.latency_ms_avg?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.jitter_ms_avg?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.packet_loss_rate?.toFixed(2) ?? 'N/A'}%</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.bitrate_kbps?.toFixed(0) ?? 'N/A'}</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.cpu_pct?.toFixed(1) ?? 'N/A'}%</td>
                  <td className="px-4 py-2 text-xs font-mono">{row.mem_pct?.toFixed(1) ?? 'N/A'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredData.length)} of {filteredData.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawDataViewer;
