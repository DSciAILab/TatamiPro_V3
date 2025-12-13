"use client";

import React, { useState } from 'react';
import { Athlete, WeightAttempt, Division } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, CheckCircle, XCircle, Scale, CheckSquare } from 'lucide-react';
import { findNextHigherWeightDivision, getWeightDivision } from '@/utils/athlete-utils';
import { showError, showSuccess } from '@/utils/toast';

interface CheckInTableProps {
  athletes: Athlete[];
  onCheckIn: (updatedAthlete: Athlete) => void;
  isCheckInAllowed: boolean;
  eventDivisions: Division[];
  isWeightCheckEnabled: boolean;
  isOverweightAutoMoveEnabled: boolean;
  isBeltGroupingEnabled: boolean;
}

const CheckInTable: React.FC<CheckInTableProps> = ({
  athletes,
  onCheckIn,
  isCheckInAllowed,
  eventDivisions,
  isWeightCheckEnabled,
  isOverweightAutoMoveEnabled,
  isBeltGroupingEnabled,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Athlete | 'id_number' | 'division_name'; direction: 'asc' | 'desc' } | null>(null);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  const handleSort = (key: keyof Athlete | 'id_number' | 'division_name') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAthletes = React.useMemo(() => {
    let sortableItems = [...athletes];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Athlete];
        let bValue: any = b[sortConfig.key as keyof Athlete];

        if (sortConfig.key === 'id_number') {
          aValue = a.emirates_id || a.school_id || '';
          bValue = b.emirates_id || b.school_id || '';
        } else if (sortConfig.key === 'division_name') {
          aValue = a._division?.name || '';
          bValue = b._division?.name || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [athletes, sortConfig]);

  const handleWeightChange = (id: string, value: string) => {
    setWeightInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveRow = (athlete: Athlete) => {
    const inputWeight = weightInputs[athlete.id];
    
    // Se não houve alteração ou está vazio, ignora (a menos que seja para limpar, mas aqui focamos em registrar)
    if (inputWeight === undefined || inputWeight === '') return;

    const newWeight = parseFloat(inputWeight);
    
    if (isNaN(newWeight)) {
      showError("Por favor insira um peso válido.");
      return;
    }

    if (!isCheckInAllowed) {
      showError("Check-in não permitido no momento.");
      return;
    }

    processCheckIn(athlete, newWeight);
  };

  const processCheckIn = (athlete: Athlete, newRegisteredWeight: number) => {
    let newCheckInStatus: 'checked_in' | 'overweight';
    let updatedAthlete: Athlete = { ...athlete };
    let currentDivision = athlete._division;
    const divisionMaxWeight = currentDivision?.max_weight;

    if (isWeightCheckEnabled) {
      if (divisionMaxWeight !== undefined && newRegisteredWeight <= divisionMaxWeight) {
        newCheckInStatus = 'checked_in';
      } else if (divisionMaxWeight === undefined) {
        newCheckInStatus = 'checked_in'; // Assume OK se não tiver limite definido (ex: absoluto)
      } else {
        // Overweight Logic
        if (isOverweightAutoMoveEnabled && currentDivision) {
          const nextHigherDivision = findNextHigherWeightDivision(
            athlete,
            currentDivision,
            eventDivisions,
            newRegisteredWeight,
            isBeltGroupingEnabled
          );

          if (nextHigherDivision) {
            updatedAthlete = {
              ...updatedAthlete,
              age_division: nextHigherDivision.age_category_name,
              weight_division: getWeightDivision(newRegisteredWeight),
              belt: nextHigherDivision.belt === 'Todas' ? updatedAthlete.belt : nextHigherDivision.belt as Athlete['belt'],
              gender: nextHigherDivision.gender === 'Ambos' ? updatedAthlete.gender : nextHigherDivision.gender as Athlete['gender'],
              moved_to_division_id: nextHigherDivision.id,
              move_reason: `Movido automaticamente para ${nextHigherDivision.name} por excesso de peso (${newRegisteredWeight}kg).`,
            };
            newCheckInStatus = 'checked_in';
            showSuccess(`Atleta movido para ${nextHigherDivision.name}`);
          } else {
            newCheckInStatus = 'overweight';
            showError(`Atleta acima do peso da categoria (${divisionMaxWeight}kg) e sem categoria superior.`);
          }
        } else {
          newCheckInStatus = 'overweight';
          showError(`Atleta acima do peso (${divisionMaxWeight}kg).`);
        }
      }
    } else {
      newCheckInStatus = 'checked_in';
    }

    const newAttempt: WeightAttempt = {
      weight: newRegisteredWeight,
      timestamp: new Date(),
      status: newCheckInStatus,
    };

    const updatedWeightAttempts = [...(athlete.weight_attempts || []), newAttempt];

    updatedAthlete = {
      ...updatedAthlete,
      registered_weight: newRegisteredWeight,
      check_in_status: newCheckInStatus,
      weight_attempts: updatedWeightAttempts,
    };

    onCheckIn(updatedAthlete);
  };

  const toggleSelectAll = () => {
    if (selectedAthletes.length === sortedAthletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(sortedAthletes.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedAthletes(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleBulkCheckIn = () => {
    if (!isCheckInAllowed) {
      showError("Check-in não permitido no momento.");
      return;
    }
    
    let processedCount = 0;
    
    selectedAthletes.forEach(athleteId => {
      const athlete = athletes.find(a => a.id === athleteId);
      if (athlete) {
        // Determine weight to use:
        // 1. Value in input (weightInputs)
        // 2. Existing registered_weight
        // 3. 0 if weight check disabled or fallback
        let weightToUse = 0;
        const inputVal = weightInputs[athleteId];
        
        if (inputVal && !isNaN(parseFloat(inputVal))) {
          weightToUse = parseFloat(inputVal);
        } else if (athlete.registered_weight) {
          weightToUse = athlete.registered_weight;
        }
        
        processCheckIn(athlete, weightToUse);
        processedCount++;
      }
    });

    setSelectedAthletes([]);
    showSuccess(`${processedCount} atletas processados.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {selectedAthletes.length} selecionado(s)
        </div>
        <Button 
          onClick={handleBulkCheckIn} 
          disabled={selectedAthletes.length === 0 || !isCheckInAllowed}
        >
          <CheckSquare className="mr-2 h-4 w-4" /> 
          Confirmar Check-in ({selectedAthletes.length})
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={sortedAthletes.length > 0 && selectedAthletes.length === sortedAthletes.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[250px] cursor-pointer" onClick={() => handleSort('first_name')}>
                Atleta <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('id_number')}>
                ID / School ID <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('division_name')}>
                Divisão <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead>Clube</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Peso (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAthletes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhum atleta encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sortedAthletes.map((athlete) => {
                const displayId = athlete.emirates_id || athlete.school_id || '-';
                const currentInputValue = weightInputs[athlete.id] !== undefined ? weightInputs[athlete.id] : (athlete.registered_weight?.toString() || '');
                
                return (
                  <TableRow key={athlete.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedAthletes.includes(athlete.id)}
                        onCheckedChange={() => toggleSelectOne(athlete.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{athlete.first_name} {athlete.last_name}</span>
                        {athlete.move_reason && (
                          <span className="text-xs text-blue-500 mt-1">{athlete.move_reason}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{displayId}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{athlete._division?.name || 'N/A'}</span>
                        <span className="text-muted-foreground">Max: {athlete._division?.max_weight}kg</span>
                      </div>
                    </TableCell>
                    <TableCell>{athlete.club}</TableCell>
                    <TableCell>
                      {athlete.check_in_status === 'checked_in' && <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> OK</Badge>}
                      {athlete.check_in_status === 'overweight' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Over</Badge>}
                      {athlete.check_in_status === 'pending' && <Badge variant="outline" className="text-orange-500 border-orange-500"><Scale className="w-3 h-3 mr-1" /> Pendente</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          className={`h-8 w-24 ${athlete.check_in_status === 'checked_in' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
                          placeholder="0.0"
                          value={currentInputValue}
                          onChange={(e) => handleWeightChange(athlete.id, e.target.value)}
                          onBlur={() => handleSaveRow(athlete)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur(); // Triggers onBlur to save
                            }
                          }}
                          disabled={!isCheckInAllowed}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CheckInTable;