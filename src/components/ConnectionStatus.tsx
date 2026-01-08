import React, { useEffect, useState } from 'react';
import { connectionManager, ConnectionMode } from '@/lib/connection-manager';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showLabel = true,
  className 
}) => {
  const [mode, setMode] = useState<ConnectionMode>(connectionManager.mode);

  useEffect(() => {
    // Initialize connection manager if not already done
    connectionManager.init();
    
    const unsubscribe = connectionManager.onModeChange((newMode) => {
      setMode(newMode);
    });
    
    return unsubscribe;
  }, []);

  const getConfig = () => {
    switch (mode) {
      case 'cloud':
        return {
          icon: Wifi,
          label: 'Cloud',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-100'
        };
      case 'local':
        return {
          icon: Server,
          label: 'Local Server',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-100'
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-100'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1',
        config.bgColor,
        config.textColor,
        'border-none',
        className
      )}
    >
      <span className={cn('w-2 h-2 rounded-full animate-pulse', config.color)} />
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </Badge>
  );
};

export default ConnectionStatus;
