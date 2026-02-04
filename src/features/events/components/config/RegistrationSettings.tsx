
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface RegistrationSettingsProps {
    is_auto_approve_registrations_enabled: boolean;
    set_is_auto_approve_registrations_enabled: (value: boolean) => void;
}

const RegistrationSettings: React.FC<RegistrationSettingsProps> = ({
    is_auto_approve_registrations_enabled,
    set_is_auto_approve_registrations_enabled
}) => {
    return (
        <div className="space-y-6">
             <div className="flex items-center space-x-2 mt-4">
                <Switch
                    id="auto-approve-registrations"
                    checked={is_auto_approve_registrations_enabled}
                    onCheckedChange={set_is_auto_approve_registrations_enabled}
                />
                <Label htmlFor="auto-approve-registrations">Aprovar inscrições automaticamente</Label>
            </div>
        </div>
    );
};

export default RegistrationSettings;
