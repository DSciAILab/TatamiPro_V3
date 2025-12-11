"use client";

import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface CheckInMandatoryFieldsConfigProps {
  eventId: string;
  initialConfig?: Record<string, boolean>;
}

const defaultMandatoryFields = {
  photo: false,
  emiratesIdFront: false,
  emiratesIdBack: false,
  paymentProof: false,
};

const CheckInMandatoryFieldsConfig: React.FC<CheckInMandatoryFieldsConfigProps> = ({ eventId, initialConfig }) => {
  const [config, setConfig] = useState<Record<string, boolean>>(initialConfig || defaultMandatoryFields);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleToggle = (field: string, checked: boolean) => {
    setConfig(prev => ({ ...prev, [field]: checked }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const loadingToast = showLoading('Saving check-in configuration...');
    try {
      const { error } = await supabase
        .from('events')
        .update({ check_in_config: config })
        .eq('id', eventId);

      if (error) throw error;

      dismissToast(loadingToast);
      showSuccess('Configuration saved to database!');
      setHasChanges(false);
    } catch (error: any) {
      dismissToast(loadingToast);
      showError('Failed to save configuration: ' + error.message);
    }
  };

  const fieldsToConfigure = [
    { key: 'photo', label: 'Profile Photo' },
    { key: 'emiratesIdFront', label: 'ID Front (Emirates/School)' },
    { key: 'emiratesIdBack', label: 'ID Back (Emirates/School)' },
    { key: 'paymentProof', label: 'Payment Proof' },
  ];

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold">Check-in Mandatory Fields</h4>
        {hasChanges && (
          <Button size="sm" onClick={handleSave}>Save Config</Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Core fields (Name, ID Number, Weight, etc.) are always mandatory. 
        Select additional fields required for check-in validation.
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
    </div>
  );
};

export default CheckInMandatoryFieldsConfig;