
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download,  Share2, UserPlus, Globe } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslations } from '@/hooks/use-translations';
import { useLayoutSettings } from '@/context/layout-settings-context';
import { Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface GeneralSettingsProps {
    event: Event;
    event_name: string;
    set_event_name: (name: string) => void;
    event_description: string;
    set_event_description: (description: string) => void;
    is_active: boolean;
    set_is_active: (value: boolean) => void;
    is_lead_capture_enabled: boolean;
    set_is_lead_capture_enabled: (value: boolean) => void;
    theme?: string;
    set_theme?: (value: string) => void;
    handleExportJson: () => void;
    handleShare: (type: 'public_event' | 'public_registration') => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    event,
    event_name,
    set_event_name,
    event_description,
    set_event_description,
    is_active,
    set_is_active,
    is_lead_capture_enabled,
    set_is_lead_capture_enabled,
    theme,
    set_theme,
    handleExportJson,
    handleShare
}) => {
    const { t } = useTranslations();
    const { isWideLayout, setIsWideLayout } = useLayoutSettings();

    const handleApplyThemeToAll = async () => {
        if (!theme) return;
        if (!window.confirm(`Isso irá aplicar o tema "${theme}" em TODOS os eventos. Tem certeza?`)) return;
        
        const toastId = showLoading('Aplicando tema globalmente...');
        try {
            const { error } = await supabase
                .from('sjjp_events')
                .update({ theme })
                .not('id', 'is', null); // Supabase requires at least one filter for bulk updates
                
            if (error) throw error;
            showSuccess('Tema aplicado como padrão para todos os eventos!');
        } catch (error) {
            console.error('[ApplyTheme] Error:', error);
            showError('Erro ao aplicar tema globalmente.');
        } finally {
            dismissToast(toastId);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold flex items-center justify-between mb-2">
                    {t('generalSettings')}
                    <LanguageToggle />
                </h3>
                <p className="text-muted-foreground">{t('languageDemo')}</p>

                <div className="mt-4">
                    <Label htmlFor="eventName">Nome do Evento</Label>
                    <Input
                        id="eventName"
                        value={event_name}
                        onChange={(e) => set_event_name(e.target.value)}
                        placeholder="Ex: Campeonato Aberto de Verão"
                    />
                </div>
                <div className="mt-4">
                    <Label htmlFor="eventDescription">Descrição</Label>
                    <Textarea
                        id="eventDescription"
                        value={event_description}
                        onChange={(e) => set_event_description(e.target.value)}
                        placeholder="Uma breve descrição do evento..."
                        rows={3}
                    />
                </div>

                <div className="flex items-center space-x-2 mt-4">
                    <Switch
                        id="event-active"
                        checked={is_active}
                        onCheckedChange={set_is_active}
                    />
                    <Label htmlFor="event-active">Evento Ativo (Visível Publicamente)</Label>
                </div>
                {is_active && (
                    <div className="flex items-center space-x-2 mt-2 ml-6">
                        <Switch
                            id="lead-capture-enabled"
                            checked={is_lead_capture_enabled}
                            onCheckedChange={set_is_lead_capture_enabled}
                        />
                        <Label htmlFor="lead-capture-enabled" className="text-sm">
                            Capturar dados de visitantes (nome, email ou telefone)
                        </Label>
                    </div>
                )}
                
                <div className="flex items-center space-x-2 mt-4">
                    <Switch
                        id="wide-layout"
                        checked={isWideLayout}
                        onCheckedChange={setIsWideLayout}
                    />
                    <Label htmlFor="wide-layout">Layout Amplo (Todas as Páginas)</Label>
                </div>

                <div className="mt-4">
                    <Label htmlFor="eventTheme">Tema Visual do Evento</Label>
                    <div className="flex gap-2 items-start mt-1">
                        <select
                            id="eventTheme"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={theme || 'default'}
                            onChange={(e) => set_theme?.(e.target.value)}
                        >
                            <option value="default">Padrão (Pergaminho)</option>
                            <option value="neon">Neon (Magenta/Preto)</option>
                            <option value="premium-dojo">Premium Dojo</option>
                            <option value="deep-elite">Deep Elite</option>
                            <option value="desert-gold">Desert Gold</option>
                            <option value="coastal-dusk">Coastal Dusk</option>
                        </select>
                        <Button 
                            variant="secondary" 
                            className="whitespace-nowrap"
                            onClick={handleApplyThemeToAll}
                            disabled={!theme || theme === 'default'}
                            title="Definir este tema como padrão para todos os eventos"
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            Aplicar a Todos
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={handleExportJson} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Dados (JSON)
                    </Button>
                    <Button onClick={() => handleShare('public_event')} variant="secondary">
                        <Share2 className="mr-2 h-4 w-4" />
                        Copiar Link Público
                    </Button>
                    <Button onClick={() => handleShare('public_registration')} variant="secondary">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Copiar Link de Inscrição
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
