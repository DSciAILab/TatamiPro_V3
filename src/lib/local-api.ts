import { connectionManager } from './connection-manager';

interface LocalApiResponse<T> {
  data: T | null;
  error: Error | null;
}

class LocalApi {
  private get baseUrl(): string {
    return connectionManager.localServerUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<LocalApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Events
  async getEvents(): Promise<LocalApiResponse<any[]>> {
    return this.request<any[]>('/events');
  }

  async getEvent(id: string): Promise<LocalApiResponse<any>> {
    return this.request<any>(`/events/${id}`);
  }

  async updateEvent(id: string, updates: Record<string, any>): Promise<LocalApiResponse<any>> {
    return this.request<any>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Athletes
  async getAthletes(eventId?: string): Promise<LocalApiResponse<any[]>> {
    const query = eventId ? `?event_id=${eventId}` : '';
    return this.request<any[]>(`/athletes${query}`);
  }

  async getAthlete(id: string): Promise<LocalApiResponse<any>> {
    return this.request<any>(`/athletes/${id}`);
  }

  async updateAthlete(id: string, updates: Record<string, any>): Promise<LocalApiResponse<any>> {
    return this.request<any>(`/athletes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async batchUpdateAthletes(athletes: any[]): Promise<LocalApiResponse<any>> {
    return this.request<any>('/athletes/batch-update', {
      method: 'POST',
      body: JSON.stringify({ athletes }),
    });
  }

  // Health check
  async health(): Promise<LocalApiResponse<{ status: string; mode: string }>> {
    return this.request<{ status: string; mode: string }>('/health');
  }
}

export const localApi = new LocalApi();
export default localApi;
