"use client";

import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOffline } from '@/context/offline-context';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Athlete, Event } from '@/types/index';
import { useAuth } from '@/context/auth-context';

interface UseAthleteActionsProps {
  event: Event | null;
  fetchEventData: (type?: 'initial' | 'refresh' | 'subscription') => Promise<void>;
}

interface UseAthleteActionsResult {
  selectedAthletesForApproval: string[];
  setSelectedAthletesForApproval: React.Dispatch<React.SetStateAction<string[]>>;
  editingAthlete: Athlete | null;
  setEditingAthlete: React.Dispatch<React.SetStateAction<Athlete | null>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  scannedAthleteId: string | null;
  setScannedAthleteId: React.Dispatch<React.SetStateAction<string | null>>;
  checkInFilter: 'pending' | 'checked_in' | 'overweight' | 'all';
  setCheckInFilter: React.Dispatch<React.SetStateAction<'pending' | 'checked_in' | 'overweight' | 'all'>>;
  registrationStatusFilter: 'all' | 'approved' | 'under_approval' | 'rejected';
  setRegistrationStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'approved' | 'under_approval' | 'rejected'>>;
  isScannerOpen: boolean;
  setIsScannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  athletesUnderApproval: Athlete[];
  processedApprovedAthletes: Athlete[];
  allAthletesForInscricoesTab: Athlete[];
  coachStats: { total: number; approved: number; pending: number; rejected: number; };
  filteredAthletesForDisplayInscricoes: Athlete[];
  filteredAthletesForCheckIn: Athlete[];

  handleAthleteUpdate: (updatedAthlete: Athlete) => Promise<void>;
  handleDeleteAthlete: (athleteId: string) => Promise<void>;
  handleDeleteSelectedAthletes: () => Promise<void>;
  handleApproveReject: (status: 'approved' | 'rejected') => Promise<void>;
  handleUpdateAthleteAttendance: (athleteId: string, status: Athlete['attendance_status']) => Promise<void>;
  handleCheckInAthlete: (updatedAthlete: Athlete) => Promise<void>;
  handleToggleAthleteSelection: (athleteId: string) => void;
  handleSelectAllAthletes: (checked: boolean, athletesToSelect: Athlete[]) => void;
}

export const useAthleteActions = ({ event, fetchEventData }: UseAthleteActionsProps): UseAthleteActionsResult => {
  const { id: eventId } = useParams<{ id: string }>();
  const { isOfflineMode, trackChange } = useOffline();
  const { profile } = useAuth();
  const userClub = profile?.club;

  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'checked_in' | 'overweight' | 'all'>('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<'all' | 'approved' | 'under_approval' | 'rejected'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const athletesUnderApproval = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'under_approval'), [event]);
  const processedApprovedAthletes = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'approved'), [event]);
  
  const allAthletesForInscricoesTab = useMemo(() => {
    let athletes = event?.athletes || [];
    const userRole = profile?.role; 
    if (userRole === 'coach' && userClub) {
      athletes = athletes.filter(a => a.club === userClub);
    }
    return athletes;
  }, [event?.athletes, profile?.role, userClub]);

  const coachStats = useMemo(() => ({
    total: allAthletesForInscricoesTab.length,
    approved: allAthletesForInscricoesTab.filter(a => a.registration_status === 'approved').length,
    pending: allAthletesForInscricoesTab.filter(a => a.registration_status === 'under_approval').length,
    rejected: allAthletesForInscricoesTab.filter(a => a.registration_status === 'rejected').length,
  }), [allAthletesForInscricoesTab]);

  const filteredAthletesForDisplayInscricoes = useMemo(() => {
    let athletes = allAthletesForInscricoesTab;
    const userRole = profile?.role;
    if (!userRole) athletes = athletes.filter(a => a.registration_status === 'approved');
    else if (registrationStatusFilter !== 'all') athletes = athletes.filter(a => a.registration_status === registrationStatusFilter);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.first_name} ${a.last_name} ${a.club} ${a.age_division} ${a.weight_division} ${a.belt}`.toLowerCase().includes(lower));
    }
    return athletes;
  }, [allAthletesForInscricoesTab, profile?.role, registrationStatusFilter, searchTerm]);

  const filteredAthletesForCheckIn = useMemo(() => {
    let athletes = processedApprovedAthletes;
    if (event?.is_attendance_mandatory_before_check_in) athletes = athletes.filter(a => a.attendance_status === 'present');
    if (scannedAthleteId) return athletes.filter(a => a.registration_qr_code_id === scannedAthleteId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.first_name} ${a.last_name} ${a.club} ${a.age_division} ${a.weight_division} ${a.belt}`.toLowerCase().includes(lower));
    }
    if (checkInFilter !== 'all') athletes = athletes.filter(a => a.check_in_status === checkInFilter);
    return athletes;
  }, [processedApprovedAthletes, event?.is_attendance_mandatory_before_check_in, scannedAthleteId, searchTerm, checkInFilter]);

  const handleAthleteUpdate = useCallback(async (updatedAthlete: Athlete) => {
    if (!eventId) return;
    const toastId = showLoading('Updating athlete...');
    try {
      const { _division, ...athleteToUpdate } = updatedAthlete;
      const { error } = await supabase.from('athletes').update({
        ...athleteToUpdate,
        date_of_birth: athleteToUpdate.date_of_birth.toISOString(),
        consent_date: athleteToUpdate.consent_date.toISOString(),
        weight_attempts: athleteToUpdate.weight_attempts,
      }).eq('id', updatedAthlete.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Athlete updated successfully!');
      setEditingAthlete(null);
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to update athlete: ' + error.message);
    }
  }, [eventId, fetchEventData]);

  const handleDeleteAthlete = useCallback(async (athleteId: string) => {
    if (!eventId) return;
    const toastId = showLoading('Deleting athlete...');
    try {
      if (isOfflineMode) {
        await trackChange('athletes', 'delete', { id: athleteId, event_id: eventId });
      } else {
        const { error } = await supabase.from('athletes').delete().eq('id', athleteId);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess('Athlete deleted successfully!');
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to delete athlete: ' + error.message);
    }
  }, [eventId, isOfflineMode, trackChange, fetchEventData]);

  const handleDeleteSelectedAthletes = useCallback(async () => {
    if (selectedAthletesForApproval.length === 0) {
      showError('Nenhum atleta selecionado para exclusão.');
      return;
    }
    const toastId = showLoading(`Deletando ${selectedAthletesForApproval.length} atletas...`);
    try {
      if (isOfflineMode) {
        for (const athleteId of selectedAthletesForApproval) {
          await trackChange('athletes', 'delete', { id: athleteId, event_id: eventId });
        }
      } else {
        const { error } = await supabase
          .from('athletes')
          .delete()
          .in('id', selectedAthletesForApproval);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess(`${selectedAthletesForApproval.length} atletas deletados com sucesso!`);
      setSelectedAthletesForApproval([]);
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError('Falha ao deletar atletas: ' + error.message);
    }
  }, [selectedAthletesForApproval, eventId, isOfflineMode, trackChange, fetchEventData]);

  const handleApproveReject = useCallback(async (status: 'approved' | 'rejected') => {
    if (selectedAthletesForApproval.length === 0) {
      showError('Nenhum atleta selecionado para aprovação/rejeição.');
      return;
    }
    const toastId = showLoading(`${status === 'approved' ? 'Aprovando' : 'Rejeitando'} atletas...`);
    try {
      if (isOfflineMode) {
        for (const athleteId of selectedAthletesForApproval) {
          const athlete = event?.athletes?.find(a => a.id === athleteId);
          if (athlete) {
            await trackChange('athletes', 'update', { id: athleteId, registration_status: status });
          }
        }
      } else {
        const { error } = await supabase
          .from('athletes')
          .update({ registration_status: status })
          .in('id', selectedAthletesForApproval);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess(`Atletas ${status === 'approved' ? 'aprovados' : 'rejeitados'} com sucesso!`);
      setSelectedAthletesForApproval([]);
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to ${status} athletes: ` + error.message);
    }
  }, [selectedAthletesForApproval, isOfflineMode, trackChange, fetchEventData]);

  const handleUpdateAthleteAttendance = useCallback(async (athleteId: string, status: Athlete['attendance_status']) => {
    if (!eventId) return;
    const toastId = showLoading('Updating attendance...');
    try {
      if (isOfflineMode) {
        await trackChange('athletes', 'update', { id: athleteId, attendance_status: status });
      } else {
        const { error } = await supabase
          .from('athletes')
          .update({ attendance_status: status })
          .eq('id', athleteId);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess('Attendance updated successfully!');
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to update attendance: ' + error.message);
    }
  }, [eventId, isOfflineMode, trackChange, fetchEventData]);

  const handleCheckInAthlete = useCallback(async (updatedAthlete: Athlete) => {
    if (!eventId) return;
    const toastId = showLoading('Performing check-in...');
    try {
      const { _division, ...athleteToUpdate } = updatedAthlete;
      const { error } = await supabase.from('athletes').update({
        check_in_status: athleteToUpdate.check_in_status,
        registered_weight: athleteToUpdate.registered_weight,
        weight_attempts: athleteToUpdate.weight_attempts,
        age_division: athleteToUpdate.age_division,
        weight_division: athleteToUpdate.weight_division,
        belt: athleteToUpdate.belt,
        gender: athleteToUpdate.gender,
        moved_to_division_id: athleteToUpdate.moved_to_division_id,
        move_reason: athleteToUpdate.move_reason,
      }).eq('id', updatedAthlete.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Check-in successful!');
      await fetchEventData('refresh'); // Background refresh
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to perform check-in: ' + error.message);
    }
  }, [eventId, fetchEventData]);

  const handleToggleAthleteSelection = useCallback((athleteId: string) => {
    setSelectedAthletesForApproval(prev =>
      prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]
    );
  }, []);

  const handleSelectAllAthletes = useCallback((checked: boolean, athletesToSelect: Athlete[]) => {
    if (checked) {
      setSelectedAthletesForApproval(athletesToSelect.map(a => a.id));
    } else {
      setSelectedAthletesForApproval([]);
    }
  }, []);

  return {
    selectedAthletesForApproval,
    setSelectedAthletesForApproval,
    editingAthlete,
    setEditingAthlete,
    searchTerm,
    setSearchTerm,
    scannedAthleteId,
    setScannedAthleteId,
    checkInFilter,
    setCheckInFilter,
    registrationStatusFilter,
    setRegistrationStatusFilter,
    isScannerOpen,
    setIsScannerOpen,
    
    athletesUnderApproval,
    processedApprovedAthletes,
    allAthletesForInscricoesTab,
    coachStats,
    filteredAthletesForDisplayInscricoes,
    filteredAthletesForCheckIn,

    handleAthleteUpdate,
    handleDeleteAthlete,
    handleDeleteSelectedAthletes,
    handleApproveReject,
    handleUpdateAthleteAttendance,
    handleCheckInAthlete,
    handleToggleAthleteSelection,
    handleSelectAllAthletes,
  };
};