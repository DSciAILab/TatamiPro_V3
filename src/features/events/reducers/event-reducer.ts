import { Event, Athlete, Division, Bracket, AgeDivisionSetting } from '@/types/index';

// --- State Interface ---
export interface EventState {
  event: Event | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  filteredAthletes: Athlete[]; // cached filtered list for performance
  selectedAthletesForApproval: string[];
  editingAthlete: Athlete | null;
  // UI filter states can also be part of this or kept local if purely UI ??
  // Let's keep data-centric state here.
}

export const initialState: EventState = {
  event: null,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  filteredAthletes: [],
  selectedAthletesForApproval: [],
  editingAthlete: null,
};

// --- Action Types ---
export type EventAction =
  | { type: 'SET_EVENT'; payload: Event | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'UPDATE_EVENT_FIELD'; payload: { key: keyof Event; value: any } }
  | { type: 'UPDATE_ATHLETE'; payload: Athlete }
  | { type: 'DELETE_ATHLETE'; payload: string } // ID
  | { type: 'BULK_DELETE_ATHLETES'; payload: string[] } // IDs
  | { type: 'UPDATE_REGISTRATION_STATUS'; payload: { ids: string[]; status: 'approved' | 'rejected' } }
  | { type: 'UPDATE_ATTENDANCE'; payload: { id: string; status: any } }
  | { type: 'SET_SELECTED_ATHLETES'; payload: string[] }
  | { type: 'SET_EDITING_ATHLETE'; payload: Athlete | null }
  | { type: 'BATCH_UPDATE_ATHLETES'; payload: Athlete[] }
  | { type: 'UPDATE_BRACKETS'; payload: { brackets: Record<string, Bracket>; fightOrder: Record<string, string[]> } };

// --- Reducer Function ---
export const eventReducer = (state: EventState, action: EventAction): EventState => {
  switch (action.type) {
    case 'SET_EVENT':
      return { ...state, event: action.payload, hasUnsavedChanges: false };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
      
    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };
      
    case 'UPDATE_EVENT_FIELD':
      if (!state.event) return state;
      return {
        ...state,
        event: { ...state.event, [action.payload.key]: action.payload.value },
        hasUnsavedChanges: true,
      };
      
    case 'UPDATE_ATHLETE':
      if (!state.event || !state.event.athletes) return state;
      return {
        ...state,
        event: {
          ...state.event,
          athletes: state.event.athletes.map(a =>
            a.id === action.payload.id ? { ...action.payload, _division: a._division } : a
          ),
        },
        editingAthlete: null, // Close edit modal on update
        // Note: We don't necessarily set hasUnsavedChanges here because athlete updates are usually instant (via service)
        // But if they were optimistic, we might. 
        // In current EventDetail logic, handles invoke service THEN update state. 
        // So state matches DB (mostly). unsavedChanges flag is usually for Event Settings.
      };

    case 'DELETE_ATHLETE':
      if (!state.event || !state.event.athletes) return state;
      return {
        ...state,
        event: {
          ...state.event,
          athletes: state.event.athletes.filter(a => a.id !== action.payload),
        },
      };

    case 'BULK_DELETE_ATHLETES':
      if (!state.event || !state.event.athletes) return state;
      return {
        ...state,
        event: {
          ...state.event,
          athletes: state.event.athletes.filter(a => !action.payload.includes(a.id)),
        },
        selectedAthletesForApproval: [], // Clear selection
      };

    case 'UPDATE_REGISTRATION_STATUS':
      if (!state.event || !state.event.athletes) return state;
      return {
        ...state,
        event: {
          ...state.event,
          athletes: state.event.athletes.map(a =>
            action.payload.ids.includes(a.id)
              ? { ...a, registration_status: action.payload.status }
              : a
          ),
        },
        selectedAthletesForApproval: [],
      };

    case 'UPDATE_ATTENDANCE':
      if (!state.event || !state.event.athletes) return state;
      return {
        ...state,
        event: {
          ...state.event,
          athletes: state.event.athletes.map(a =>
            a.id === action.payload.id
              ? { ...a, attendance_status: action.payload.status }
              : a
          ),
        },
      };

    case 'SET_SELECTED_ATHLETES':
      return { ...state, selectedAthletesForApproval: action.payload };

    case 'SET_EDITING_ATHLETE':
      return { ...state, editingAthlete: action.payload };

    case 'BATCH_UPDATE_ATHLETES':
       if (!state.event || !state.event.athletes) return state;
       const updatedMap = new Map(action.payload.map(a => [a.id, a]));
       return {
         ...state,
         event: {
            ...state.event,
            athletes: state.event.athletes.map(a => updatedMap.get(a.id) || a)
         }
       };

    case 'UPDATE_BRACKETS':
       if (!state.event) return state;
       return {
         ...state,
         event: {
            ...state.event,
            brackets: action.payload.brackets,
            mat_fight_order: action.payload.fightOrder
         },
         hasUnsavedChanges: true, // Brackets updates usually trigger save warning unless auto-saved
       };
      
    default:
      return state;
  }
};
