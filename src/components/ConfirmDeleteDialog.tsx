import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  itemName?: string;
  requireTyping?: boolean; // If true, user must type item name to confirm
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  requireTyping = false,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  const [typedName, setTypedName] = useState('');

  const isConfirmEnabled = requireTyping 
    ? typedName.toLowerCase() === itemName?.toLowerCase()
    : true;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setTypedName('');
    }
  };

  const handleClose = () => {
    setTypedName('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireTyping && itemName && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <span className="font-semibold text-foreground">"{itemName}"</span> to confirm:
            </p>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={itemName}
              className="mt-1"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDeleteDialog;
