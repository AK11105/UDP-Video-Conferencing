import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useMetricsPolling } from "@/hooks/useMetricsPolling";

import Overview from "./pages/Overview";
import UdpMetrics from "./pages/UdpMetrics";
import TcpMetrics from "./pages/TcpMetrics";
import SctpMetrics from "./pages/SctpMetrics";
import ProtocolComparison from "./pages/ProtocolComparison";
import QosAnalysis from "./pages/QosAnalysis";
import SystemHealth from "./pages/SystemHealth";
import RawDataViewer from "./pages/RawDataViewer";
import ReportExport from "./pages/ReportExport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useMetricsPolling();
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/udp" element={<UdpMetrics />} />
        <Route path="/tcp" element={<TcpMetrics />} />
        <Route path="/sctp" element={<SctpMetrics />} />
        <Route path="/comparison" element={<ProtocolComparison />} />
        <Route path="/qos" element={<QosAnalysis />} />
        <Route path="/system" element={<SystemHealth />} />
        <Route path="/raw-data" element={<RawDataViewer />} />
        <Route path="/export" element={<ReportExport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
