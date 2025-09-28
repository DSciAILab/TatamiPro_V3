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
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onSave}
        disabled={isSaving}
        size="lg"
        className={cn(
          "shadow-lg transition-all duration-300 ease-in-out transform",
          hasUnsavedChanges ? "scale-100 opacity-100" : "scale-90 opacity-0"
        )}
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Save className="mr-2 h-5 w-5" />
        )}
        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
};

export default SaveChangesButton;