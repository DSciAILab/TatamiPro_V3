"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, X } from 'lucide-react';
import QrScanner from './QrScanner';

interface QRScannerDialogProps {
  onScan: (decodedText: string) => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerClassName?: string;
  title?: string;
  description?: string;
}

const QRScannerDialog: React.FC<QRScannerDialogProps> = ({
  onScan,
  triggerLabel = "Escanear QR Code",
  triggerVariant = "outline",
  triggerClassName = "w-full",
  title = "Escanear QR Code",
  description = "Aponte a câmera para o QR Code para fazer login automaticamente."
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    setIsOpen(false);
    onScan(decodedText);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          <QrCode className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-4">
          {isOpen && (
            <div className="w-full max-w-sm rounded-lg overflow-hidden border bg-muted/30">
              <QrScanner onScanSuccess={handleScanSuccess} />
            </div>
          )}
        </div>
        
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerDialog;
