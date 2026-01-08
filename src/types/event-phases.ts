/**
 * Event Phases Types
 * Types for event lifecycle phases and sync configuration
 */

/** Event phases - lifecycle of a competition */
export type EventPhase = 
  | 'setup'      // Pré-evento: configurações, import de atletas/divisões
  | 'checkin'    // Check-in ativo: sync intensivo necessário
  | 'brackets'   // Geração de brackets: lock crítico
  | 'running'    // Evento rodando: mats operam independentemente
  | 'finished';  // Pós-evento: consolidação, export

/** Sync modes */
export type SyncMode = 
  | 'realtime'   // WebSocket, updates instantâneos
  | 'periodic'   // A cada X segundos
  | 'on-demand'  // Manual, botão de sync
  | 'offline';   // Sem sync, 100% local

/** Module sync configuration */
export interface ModuleSyncConfig {
  enabled: boolean;
  mode: SyncMode;
  intervalMs?: number; // Para modo periodic
  priority: 'high' | 'normal' | 'low';
}

/**
 * Event Sync Configuration
 * Defines how sync should work for each module in each phase
 */
export interface EventSyncConfig {
  phase: EventPhase;
  globalMode: SyncMode;
  modules: {
    checkin: ModuleSyncConfig;
    attendance: ModuleSyncConfig;
    brackets: ModuleSyncConfig;
    results: ModuleSyncConfig;
  };
}

/**
 * Phase metadata and descriptions
 */
export const PHASE_INFO: Record<EventPhase, {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultSyncConfig: Omit<EventSyncConfig, 'phase'>;
}> = {
  setup: {
    label: 'Configuração',
    description: 'Pré-evento: Importação de atletas, configuração de divisões',
    icon: 'Settings',
    color: 'text-gray-500',
    defaultSyncConfig: {
      globalMode: 'on-demand',
      modules: {
        checkin: { enabled: false, mode: 'offline', priority: 'low' },
        attendance: { enabled: true, mode: 'on-demand', priority: 'normal' },
        brackets: { enabled: false, mode: 'offline', priority: 'low' },
        results: { enabled: false, mode: 'offline', priority: 'low' },
      },
    },
  },
  checkin: {
    label: 'Check-in',
    description: 'Check-in e pesagem ativos. Sincronização em tempo real.',
    icon: 'UserCheck',
    color: 'text-green-500',
    defaultSyncConfig: {
      globalMode: 'realtime',
      modules: {
        checkin: { enabled: true, mode: 'realtime', priority: 'high' },
        attendance: { enabled: true, mode: 'realtime', priority: 'high' },
        brackets: { enabled: false, mode: 'offline', priority: 'low' },
        results: { enabled: false, mode: 'offline', priority: 'low' },
      },
    },
  },
  brackets: {
    label: 'Geração de Brackets',
    description: 'Geração de chaves. Lock crítico para evitar conflitos.',
    icon: 'GitBranch',
    color: 'text-blue-500',
    defaultSyncConfig: {
      globalMode: 'on-demand',
      modules: {
        checkin: { enabled: false, mode: 'offline', priority: 'low' },
        attendance: { enabled: false, mode: 'offline', priority: 'low' },
        brackets: { enabled: true, mode: 'on-demand', priority: 'high' },
        results: { enabled: false, mode: 'offline', priority: 'low' },
      },
    },
  },
  running: {
    label: 'Evento em Andamento',
    description: 'Mats operando independentemente. Sync event-driven.',
    icon: 'Play',
    color: 'text-orange-500',
    defaultSyncConfig: {
      globalMode: 'periodic',
      modules: {
        checkin: { enabled: false, mode: 'offline', priority: 'low' },
        attendance: { enabled: false, mode: 'offline', priority: 'low' },
        brackets: { enabled: true, mode: 'periodic', intervalMs: 10000, priority: 'normal' },
        results: { enabled: true, mode: 'realtime', priority: 'high' },
      },
    },
  },
  finished: {
    label: 'Finalizado',
    description: 'Evento encerrado. Consolidação e export de resultados.',
    icon: 'CheckCircle',
    color: 'text-purple-500',
    defaultSyncConfig: {
      globalMode: 'on-demand',
      modules: {
        checkin: { enabled: false, mode: 'offline', priority: 'low' },
        attendance: { enabled: false, mode: 'offline', priority: 'low' },
        brackets: { enabled: false, mode: 'offline', priority: 'low' },
        results: { enabled: true, mode: 'on-demand', priority: 'normal' },
      },
    },
  },
};

/**
 * Get default sync config for a phase
 */
export function getDefaultSyncConfig(phase: EventPhase): EventSyncConfig {
  return {
    phase,
    ...PHASE_INFO[phase].defaultSyncConfig,
  };
}

/**
 * Check if a module should sync in current phase
 */
export function shouldModuleSync(
  config: EventSyncConfig,
  module: keyof EventSyncConfig['modules']
): boolean {
  return config.modules[module].enabled && config.modules[module].mode !== 'offline';
}

/**
 * Get sync interval for a module (0 if not periodic)
 */
export function getModuleSyncInterval(
  config: EventSyncConfig,
  module: keyof EventSyncConfig['modules']
): number {
  const moduleConfig = config.modules[module];
  if (moduleConfig.mode === 'periodic' && moduleConfig.intervalMs) {
    return moduleConfig.intervalMs;
  }
  return 0;
}
