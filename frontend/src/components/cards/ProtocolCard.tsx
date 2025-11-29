import { cn } from '@/lib/utils';
import { Protocol } from '@/types/metrics';
import { Radio, Network, Layers } from 'lucide-react';

interface ProtocolCardProps {
  protocol: Protocol;
  metrics: {
    bitrate: string;
    latency: string;
    loss: string;
    mos?: string;
  };
  isActive?: boolean;
  onClick?: () => void;
}

const protocolConfig = {
  UDP: {
    icon: Radio,
    color: 'udp',
    description: 'User Datagram Protocol',
    traits: ['Low latency', 'No reliability', 'Real-time'],
  },
  TCP: {
    icon: Network,
    color: 'tcp',
    description: 'Transmission Control Protocol',
    traits: ['Reliable', 'Ordered', 'Flow control'],
  },
  SCTP: {
    icon: Layers,
    color: 'sctp',
    description: 'Stream Control Transmission Protocol',
    traits: ['Multi-stream', 'Partial reliability', 'Message-oriented'],
  },
};

export const ProtocolCard = ({ protocol, metrics, isActive, onClick }: ProtocolCardProps) => {
  const config = protocolConfig[protocol];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl p-5 cursor-pointer transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-xl',
        isActive && `ring-2 ring-${config.color} shadow-glow-${config.color}`
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          `bg-${config.color}/20`
        )}>
          <Icon className={cn('w-6 h-6', `text-${config.color}`)} />
        </div>
        <span className={`protocol-badge-${config.color.toLowerCase()}`}>
          {protocol}
        </span>
      </div>

      <h3 className="font-semibold text-foreground mb-1">{config.description}</h3>
      <div className="flex flex-wrap gap-1 mb-4">
        {config.traits.map((trait) => (
          <span key={trait} className="text-[10px] px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
            {trait}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Bitrate</p>
          <p className="font-mono font-semibold text-sm">{metrics.bitrate}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
          <p className="font-mono font-semibold text-sm">{metrics.latency}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Packet Loss</p>
          <p className="font-mono font-semibold text-sm">{metrics.loss}</p>
        </div>
        {metrics.mos && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">MOS</p>
            <p className="font-mono font-semibold text-sm">{metrics.mos}</p>
          </div>
        )}
      </div>
    </div>
  );
};
