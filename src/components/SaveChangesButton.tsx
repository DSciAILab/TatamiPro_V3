"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveChangesButtonProps {
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const SaveChangesButton: React.FC<SaveChangesButtonProps> = ({ onSave, isSaving, hasUnsavedChanges }) => {
  if (!hasUnsavedChanges) {
    return null;
  }

  return (
    <div className="fixed top-24 right-8 z-[100]">
      <Button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          "h-16 px-10 text-lg rounded-2xl shadow-2xl font-bold transition-all duration-300 ease-in-out transform bg-success text-success-foreground hover:bg-success/90 hover:shadow-[0_0_30px_rgba(22,163,74,0.6)] hover:scale-105 border border-success/20",
          hasUnsavedChanges ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        {isSaving ? (
          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        ) : (
          <Save className="mr-3 h-6 w-6" />
        )}
        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
};

export default SaveChangesButton;