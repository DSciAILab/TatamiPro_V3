
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PointSystemSettingsProps {
    champion_points: number;
    set_champion_points: (value: number) => void;
    runner_up_points: number;
    set_runner_up_points: (value: number) => void;
    third_place_points: number;
    set_third_place_points: (value: number) => void;
    count_single_club_categories: boolean;
    set_count_single_club_categories: (value: boolean) => void;
    count_walkover_single_fight_categories: boolean;
    set_count_walkover_single_fight_categories: (value: boolean) => void;
    count_wo_champion_categories: boolean;
    set_count_wo_champion_categories: (value: boolean) => void;
}

const PointSystemSettings: React.FC<PointSystemSettingsProps> = ({
    champion_points,
    set_champion_points,
    runner_up_points,
    set_runner_up_points,
    third_place_points,
    set_third_place_points,
    count_single_club_categories,
    set_count_single_club_categories,
    count_walkover_single_fight_categories,
    set_count_walkover_single_fight_categories,
    count_wo_champion_categories,
    set_count_wo_champion_categories
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Configuração de Pontos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="championPoints">Pontos Campeão</Label>
                    <Input
                        id="championPoints"
                        type="number"
                        min="0"
                        value={champion_points}
                        onChange={(e) => set_champion_points(Number(e.target.value))}
                    />
                </div>
                <div>
                    <Label htmlFor="runnerUpPoints">Pontos Vice-Campeão</Label>
                    <Input
                        id="runnerUpPoints"
                        type="number"
                        min="0"
                        value={runner_up_points}
                        onChange={(e) => set_runner_up_points(Number(e.target.value))}
                    />
                </div>
                <div>
                    <Label htmlFor="thirdPlacePoints">Pontos 3º Lugar</Label>
                    <Input
                        id="thirdPlacePoints"
                        type="number"
                        min="0"
                        value={third_place_points}
                        onChange={(e) => set_third_place_points(Number(e.target.value))}
                    />
                </div>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4">Regras de Contagem de Pontos</h3>
            <div className="flex items-center space-x-2">
                <Switch
                    id="count-single-club-categories"
                    checked={count_single_club_categories}
                    onCheckedChange={set_count_single_club_categories}
                />
                <Label htmlFor="count-single-club-categories">Categorias com apenas uma equipe contam pontos</Label>
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <Switch
                    id="count-walkover-single-fight-categories"
                    checked={count_walkover_single_fight_categories}
                    onCheckedChange={set_count_walkover_single_fight_categories}
                />
                <Label htmlFor="count-walkover-single-fight-categories">W.O. em lutas únicas (equipes diferentes) contam pontos</Label>
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <Switch
                    id="count-wo-champion-categories"
                    checked={count_wo_champion_categories}
                    onCheckedChange={set_count_wo_champion_categories}
                />
                <Label htmlFor="count-wo-champion-categories">Campeão declarado por W.O. (atleta único) conta pontos</Label>
            </div>
        </div>
    );
};

export default PointSystemSettings;
