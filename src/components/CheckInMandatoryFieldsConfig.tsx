"use client";

import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast'; // Removed showError

interface CheckInMandatoryFieldsConfigProps {
  eventId: string;
}

const defaultMandatoryFields = {
  club: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  belt: true,
  weight: true,
  idNumber: true, // Representa Emirates ID ou School ID
  gender: true,
  nationality: true,
  email: true,
  phone: true,
  photo: false, // Photo de perfil
  emiratesIdFront: false,
  emiratesIdBack: false,
  paymentProof: false,
};

const CheckInMandatoryFieldsConfig: React.FC<CheckInMandatoryFieldsConfigProps> = ({ eventId }) => {
  const [config, setConfig] = useState<Record<string, boolean>>(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : defaultMandatoryFields;
  });

  useEffect(() => {
    localStorage.setItem(`mandatoryCheckInFields_${eventId}`, JSON.stringify(config));
  }, [config, eventId]);

  const handleToggle = (field: string, checked: boolean) => {
    setConfig(prev => ({ ...prev, [field]: checked }));
  };

  const fieldsToConfigure = [
    { key: 'photo', label: 'Foto de Perfil' },
    { key: 'emiratesIdFront', label: 'Emirates ID (Frente)' },
    { key: 'emiratesIdBack', label: 'Emirates ID (Verso)' },
    { key: 'paymentProof', label: 'Comprovante de Pagamento' },
  ];

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <h4 className="text-lg font-semibold">Configurar Campos Obrigatórios para Check-in</h4>
      <p className="text-sm text-muted-foreground">
        Os campos "Equipe", "Nome", "ID", "Data de Nascimento", "Faixa", "Peso", "Gênero", "Nacionalidade", "Email" e "Telefone" são sempre obrigatórios.
        Marque abaixo os campos adicionais que devem ser obrigatórios para o check-in.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsToConfigure.map(field => (
          <div key={field.key} className="flex items-center space-x-2">
            <Checkbox
              id={`mandatory-${field.key}`}
              checked={config[field.key]}
              onCheckedChange={(checked: boolean) => handleToggle(field.key, checked)}
            />
            <Label htmlFor={`mandatory-${field.key}`}>{field.label}</Label>
          </div>
        ))}
      </div>
      <Button onClick={() => showSuccess('Configuração salva!')}>Salvar Configuração</Button>
    </div>
  );
};

export default CheckInMandatoryFieldsConfig;