"use client";

import React from 'react';
import { useOffline } from '@/context/offline-context';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, CloudDownload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { version } from '../../package.json';

const OfflineIndicator: React.FC = () => {
  const { isOfflineMode, toggleOfflineMode, syncData, hasPendingChanges, isSyncing } = useOffline();

  return (
    <div className="flex items-center gap-2">
      {hasPendingChanges && (
        <Badge variant="secondary" className="hidden md:flex bg-orange-100 text-orange-800 hover:bg-orange-200">
          Alterações Pendentes
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isOfflineMode ? "destructive" : "outline"} 
            size="sm"
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isOfflineMode ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4 text-green-600" />
            )}
            <span className="hidden md:inline">{isOfflineMode ? 'Modo Offline' : 'Online'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Status da Conexão</span>
            <span className="text-xs text-muted-foreground font-normal">v{version}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={syncData} disabled={isSyncing}>
            <CloudDownload className="mr-2 h-4 w-4" />
            Sincronizar Agora
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleOfflineMode}>
            {isOfflineMode ? (
              <>
                <Wifi className="mr-2 h-4 w-4" /> Ir para Online
              </>
            ) : (
              <>
                <WifiOff className="mr-2 h-4 w-4" /> Ir para Offline
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.reload()} className="text-destructive focus:text-destructive">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar (Force Reload)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default OfflineIndicator;