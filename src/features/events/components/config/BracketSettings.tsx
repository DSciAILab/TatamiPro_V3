
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface BracketSettingsProps {
    is_bracket_splitting_enabled: boolean;
    set_is_bracket_splitting_enabled: (value: boolean) => void;
    max_athletes_per_bracket: number;
    set_max_athletes_per_bracket: (value: number) => void;
    enable_team_separation: boolean;
    set_enable_team_separation: (value: boolean) => void;
}

const BracketSettings: React.FC<BracketSettingsProps> = ({
    is_bracket_splitting_enabled,
    set_is_bracket_splitting_enabled,
    max_athletes_per_bracket,
    set_max_athletes_per_bracket,
    enable_team_separation,
    set_enable_team_separation
}) => {
    return (
        <div className="mt-8 border-t pt-4">
            <h4 className="text-lg font-semibold mb-3">Configuração de Chaves (Brackets)</h4>
            <div className="flex items-center space-x-2">
                <Switch
                    id="bracket-splitting-enabled"
                    checked={is_bracket_splitting_enabled}
                    onCheckedChange={set_is_bracket_splitting_enabled}
                />
                <Label htmlFor="bracket-splitting-enabled">Dividir Categorias Grandes Automaticalmente</Label>
            </div>
            {is_bracket_splitting_enabled && (
                <div className="mt-4 max-w-xs">
                    <Label htmlFor="max-athletes">Máximo de Atletas por Chave</Label>
                    <Input
                        id="max-athletes"
                        type="number"
                        min="2"
                        value={max_athletes_per_bracket || 0}
                        onChange={(e) => set_max_athletes_per_bracket(Number(e.target.value))}
                        placeholder="Ex: 16"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Se uma categoria exceder este número, ela será dividida em chaves menores (Grupo A, Grupo B...).
                        Recomendado: 16 ou 32.
                    </p>
                </div>
            )}
            <div className="flex items-center space-x-2 mt-4">
                <Switch
                    id="enable-team-separation"
                    checked={enable_team_separation}
                    onCheckedChange={set_enable_team_separation}
                />
                <Label htmlFor="enable-team-separation">Evitar Lutas entre Mesma Equipe (Team Separation)</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-12">
                Se ativado, o sistema tentará colocar atletas da mesma equipe em lados opostos da chave.
            </p>
        </div>
    );
};

export default BracketSettings;
