import { io, Socket } from 'socket.io-client';

export type ConnectionMode = 'cloud' | 'local' | 'offline';

interface ConnectionManagerConfig {
  localServerUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  autoDetect?: boolean;
}

class ConnectionManager {
  private _mode: ConnectionMode = 'cloud';
  private _localServerUrl: string = 'http://localhost:3001';
  private _supabaseUrl: string = '';
  private _supabaseKey: string = '';
  private _socket: Socket | null = null;
  private _listeners: Set<(mode: ConnectionMode) => void> = new Set();
  private _autoDetect: boolean = true;
  private _checkInterval: NodeJS.Timeout | null = null;

  constructor(config?: ConnectionManagerConfig) {
    if (config?.localServerUrl) {
      this._localServerUrl = config.localServerUrl;
    }
    if (config?.supabaseUrl) {
      this._supabaseUrl = config.supabaseUrl;
    }
    if (config?.supabaseKey) {
      this._supabaseKey = config.supabaseKey;
    }
    if (config?.autoDetect !== undefined) {
      this._autoDetect = config.autoDetect;
    }
  }

  get mode(): ConnectionMode {
    return this._mode;
  }

  get localServerUrl(): string {
    return this._localServerUrl;
  }

  get isLocal(): boolean {
    return this._mode === 'local';
  }

  get isCloud(): boolean {
    return this._mode === 'cloud';
  }

  get isOffline(): boolean {
    return this._mode === 'offline';
  }

  get socket(): Socket | null {
    return this._socket;
  }

  // Initialize connection manager
  async init(): Promise<void> {
    console.log('[ConnectionManager] Initializing...');
    
    if (this._autoDetect) {
      await this.detectMode();
      this.startAutoDetection();
    }
  }

  // Detect the best connection mode
  async detectMode(): Promise<ConnectionMode> {
    // First, try cloud (Supabase)
    if (await this.checkCloudConnection()) {
      await this.setMode('cloud');
      return 'cloud';
    }
    
    // Then, try local server
    if (await this.checkLocalConnection()) {
      await this.setMode('local');
      return 'local';
    }
    
    // Fallback to offline (browser-only mode)
    await this.setMode('offline');
    return 'offline';
  }

  // Check if Supabase is reachable
  private async checkCloudConnection(): Promise<boolean> {
    if (!this._supabaseUrl) {
      console.log('[ConnectionManager] No Supabase URL configured');
      return false;
    }
    
    try {
      const response = await fetch(`${this._supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': this._supabaseKey
        },
        signal: AbortSignal.timeout(3000)
      });
      // A valid response is considered reachable
      const isReachable = response.ok;
      console.log(`[ConnectionManager] Cloud check: ${response.status} - reachable: ${isReachable}`);
      return isReachable;
    } catch (err) {
      console.log('[ConnectionManager] Cloud check failed:', err);
      return false;
    }
  }

  // Check if local server is reachable
  private async checkLocalConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this._localServerUrl}/api/health`, {
        signal: AbortSignal.timeout(2000)
      });
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  // Set connection mode
  async setMode(mode: ConnectionMode): Promise<void> {
    if (this._mode === mode) return;
    
    const previousMode = this._mode;
    this._mode = mode;
    
    console.log(`[ConnectionManager] Mode changed: ${previousMode} -> ${mode}`);
    
    // Connect/disconnect WebSocket based on mode
    if (mode === 'local' && !this._socket?.connected) {
      this.connectSocket();
    } else if (mode !== 'local' && this._socket) {
      this.disconnectSocket();
    }
    
    // Notify listeners
    this._listeners.forEach(listener => listener(mode));
  }

  // Manually switch to local mode
  async switchToLocal(): Promise<boolean> {
    if (await this.checkLocalConnection()) {
      await this.setMode('local');
      return true;
    }
    console.error('[ConnectionManager] Local server not available');
    return false;
  }

  // Manually switch to cloud mode
  async switchToCloud(): Promise<boolean> {
    if (await this.checkCloudConnection()) {
      await this.setMode('cloud');
      return true;
    }
    console.error('[ConnectionManager] Cloud not available');
    return false;
  }

  // Start automatic mode detection
  private startAutoDetection(): void {
    if (this._checkInterval) return;
    
    this._checkInterval = setInterval(async () => {
      const previousMode = this._mode;
      const newMode = await this.detectMode();
      
      if (previousMode !== newMode) {
        console.log(`[ConnectionManager] Auto-switched: ${previousMode} -> ${newMode}`);
      }
    }, 30000); // Check every 30 seconds
  }

  // Connect to local WebSocket server
  private connectSocket(): void {
    if (this._socket?.connected) return;
    
    console.log(`[ConnectionManager] Connecting to WebSocket: ${this._localServerUrl}`);
    
    this._socket = io(this._localServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });
    
    this._socket.on('connect', () => {
      console.log('[ConnectionManager] WebSocket connected');
    });
    
    this._socket.on('disconnect', (reason) => {
      console.log(`[ConnectionManager] WebSocket disconnected: ${reason}`);
    });
  }

  // Disconnect WebSocket
  private disconnectSocket(): void {
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
    }
  }

  // Subscribe to mode changes
  onModeChange(callback: (mode: ConnectionMode) => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Join an event room for real-time updates
  joinEvent(eventId: string): void {
    if (this._socket?.connected) {
      this._socket.emit('join:event', eventId);
    }
  }

  // Leave an event room
  leaveEvent(eventId: string): void {
    if (this._socket?.connected) {
      this._socket.emit('leave:event', eventId);
    }
  }

  // Emit an event through WebSocket
  emit(event: string, data: any): void {
    if (this._socket?.connected) {
      this._socket.emit(event, data);
    }
  }

  // Listen to WebSocket events
  on(event: string, callback: (...args: any[]) => void): void {
    if (this._socket) {
      this._socket.on(event, callback);
    }
  }

  // Stop auto-detection
  destroy(): void {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    this.disconnectSocket();
    this._listeners.clear();
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager({
  localServerUrl: import.meta.env.VITE_LOCAL_SERVER_URL || 'http://localhost:3001',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://otqzzllevufcxbpeavmo.supabase.co',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  autoDetect: true
});

export default connectionManager;
