"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { exportEventDataToCsv } from '@/utils/event-utils';
import { Event } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';

interface DeleteEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventData: Event | null;
  onConfirmDelete: (eventId: string) => void;
}

const DeleteEventDialog: React.FC<DeleteEventDialogProps> = ({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventData,
  onConfirmDelete,
}) => {
  const handleDownloadBackup = async (dataType: 'athletes' | 'divisions') => {
    if (!eventData) {
      showError('Dados do evento não disponíveis para backup.');
      return;
    }

    let fullEventData = { ...eventData };

    // If athlete/division data is missing, fetch it on-demand
    if (!fullEventData.athletes || !fullEventData.divisions) {
      const loadingToast = showLoading('Carregando dados para backup...');
      try {
        const { data: athletes, error: athletesError } = await supabase.from('athletes').select('*').eq('event_id', eventId);
        if (athletesError) throw athletesError;

        const { data: divisions, error: divisionsError } = await supabase.from('divisions').select('*').eq('event_id', eventId);
        if (divisionsError) throw divisionsError;

        fullEventData.athletes = athletes || [];
        fullEventData.divisions = divisions || [];
        dismissToast(loadingToast);
      } catch (error: any) {
        dismissToast(loadingToast);
        showError(`Falha ao carregar dados para backup: ${error.message}`);
        return;
      }
    }

    try {
      const blob = exportEventDataToCsv(fullEventData as Required<Event>, dataType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataType}_${eventData.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(`Backup de ${dataType} do evento "${eventName}" baixado com sucesso!`);
    } catch (error: any) {
      showError(`Falha ao baixar backup de ${dataType}: ${error.message}`);
      console.error('Backup error:', error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja deletar o evento "{eventName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Todos os dados associados a este evento (atletas, divisões, brackets, etc.) serão permanentemente removidos.
            Recomendamos fazer um backup antes de prosseguir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col space-y-2 mt-4">
          <Button variant="outline" onClick={() => handleDownloadBackup('athletes')}>
            <Download className="mr-2 h-4 w-4" /> Backup de Atletas (CSV)
          </Button>
          <Button variant="outline" onClick={() => handleDownloadBackup('divisions')}>
            <Download className="mr-2 h-4 w-4" /> Backup de Divisões (CSV)
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirmDelete(eventId)} className="bg-red-600 hover:bg-red-700 text-white">
            <Trash2 className="mr-2 h-4 w-4" /> Deletar Evento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEventDialog;