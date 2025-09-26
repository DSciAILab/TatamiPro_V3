"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { showWarning } from '@/utils/toast';

interface ColumnMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileHeaders: string[];
  expectedFields: { key: string; label: string; required: boolean }[];
  onConfirm: (mapping: Record<string, string>) => void;
}

const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
  isOpen,
  onClose,
  fileHeaders,
  expectedFields,
  onConfirm,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const initialMapping: Record<string, string> = {};
      expectedFields.forEach(field => {
        // Tenta encontrar uma correspondência exata ou case-insensitive
        const foundHeader = fileHeaders.find(header =>
          header.toLowerCase() === field.key.toLowerCase() ||
          header.toLowerCase() === field.label.toLowerCase()
        );
        // Se não encontrar, define como 'ignore-column' em vez de vazio
        initialMapping[field.key] = foundHeader || 'ignore-column';
      });
      setMapping(initialMapping);
    }
  }, [isOpen, fileHeaders, expectedFields]);

  const handleSelectChange = (fieldKey: string, selectedHeader: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: selectedHeader }));
  };

  const handleConfirm = () => {
    const requiredFieldsMissing = expectedFields.filter(field => field.required && mapping[field.key] === 'ignore-column');
    if (requiredFieldsMissing.length > 0) {
      showWarning(`Por favor, mapeie todos os campos obrigatórios: ${requiredFieldsMissing.map(f => f.label).join(', ')}.`);
      return;
    }
    // Remove 'ignore-column' entries before confirming, so the actual mapping doesn't contain them
    const finalMapping: Record<string, string> = {};
    for (const key in mapping) {
      if (mapping[key] !== 'ignore-column') {
        finalMapping[key] = mapping[key];
      }
    }
    onConfirm(finalMapping);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapear Colunas do Arquivo</DialogTitle>
          <DialogDescription>
            Associe as colunas do seu arquivo CSV aos campos esperados para a importação.
            Campos marcados com <span className="text-red-500">*</span> são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {expectedFields.map(field => (
            <div key={field.key} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field.key} className="text-right">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={mapping[field.key] || 'ignore-column'} // Default to 'ignore-column'
                onValueChange={(value) => handleSelectChange(field.key, value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={`Selecione a coluna para ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {fileHeaders.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                  <SelectItem value="ignore-column">(Ignorar)</SelectItem> {/* Changed value */}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar Mapeamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;