import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Radio,
  Network,
  Layers,
  GitCompare,
  BarChart3,
  Activity,
  Database,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'UDP Metrics', path: '/udp', icon: Radio, badge: 'Live' },
  { label: 'TCP Metrics', path: '/tcp', icon: Network },
  { label: 'SCTP Metrics', path: '/sctp', icon: Layers },
  { label: 'Comparison', path: '/comparison', icon: GitCompare },
  { label: 'QoS Analysis', path: '/qos', icon: BarChart3 },
  { label: 'System Health', path: '/system', icon: Activity },
  { label: 'Raw Data', path: '/raw-data', icon: Database },
  { label: 'Export', path: '/export', icon: FileDown },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-glow">
            <Wifi className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-sidebar-foreground">Protocol</h1>
              <p className="text-xs text-muted-foreground">Metrics Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'sidebar-item group relative',
                isActive && 'sidebar-item-active'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-success/20 text-success animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
