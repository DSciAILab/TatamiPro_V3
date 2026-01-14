"use client";

import React, { useState, useEffect } from 'react';
import { Athlete, WeightAttempt, Division } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, Scale, CheckSquare } from 'lucide-react';
import { findNextHigherWeightDivision, getWeightDivision } from '@/utils/athlete-utils';
import { showError, showSuccess } from '@/utils/toast';

export type SortKey = keyof Athlete | 'id_number' | 'division_name';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface CheckInTableProps {
  athletes: Athlete[];
  onCheckIn: (updatedAthlete: Athlete) => void;
  isCheckInAllowed: boolean;
  eventDivisions: Division[];
  isWeightCheckEnabled: boolean;
  isOverweightAutoMoveEnabled: boolean;
  isBeltGroupingEnabled: boolean;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}

const CheckInTable: React.FC<CheckInTableProps> = ({
  athletes,
  onCheckIn,
  isCheckInAllowed,
  eventDivisions,
  isWeightCheckEnabled,
  isOverweightAutoMoveEnabled,
  isBeltGroupingEnabled,
  sortConfig,
  onSort,
}) => {
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  // Update selected athletes if the list changes significantly (optional cleanup)
  useEffect(() => {
    // Keep selection valid
    setSelectedAthletes(prev => prev.filter(id => athletes.some(a => a.id === id)));
  }, [athletes]);

  const handleWeightChange = (id: string, value: string) => {
    setWeightInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveRow = (athlete: Athlete) => {
    const inputWeight = weightInputs[athlete.id];
    
    // If no change or empty, ignore
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
        newCheckInStatus = 'checked_in';
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
    if (selectedAthletes.length === athletes.length && athletes.length > 0) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map(a => a.id));
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
        let weightToUse = 0;
        const inputVal = weightInputs[athleteId];
        
        if (inputVal && !isNaN(parseFloat(inputVal))) {
          weightToUse = parseFloat(inputVal);
        } else if (athlete.registered_weight) {
          weightToUse = athlete.registered_weight;
        } else if (athlete.weight) {
           weightToUse = athlete.weight;
        }
        
        processCheckIn(athlete, weightToUse);
        processedCount++;
      }
    });

    setSelectedAthletes([]);
    showSuccess(`${processedCount} atletas processados.`);
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />;
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
                  checked={athletes.length > 0 && selectedAthletes.length === athletes.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {/* ID First */}
              <TableHead className="cursor-pointer" onClick={() => onSort('id_number')}>
                ID / School ID {getSortIcon('id_number')}
              </TableHead>
              {/* Name Second */}
              <TableHead className="w-[250px] cursor-pointer" onClick={() => onSort('first_name')}>
                Atleta {getSortIcon('first_name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('division_name')}>
                Divisão {getSortIcon('division_name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('club')}>
                Clube {getSortIcon('club')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort('check_in_status')}>
                Status {getSortIcon('check_in_status')}
              </TableHead>
              <TableHead className="w-[150px]">Peso (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhum atleta encontrado.
                </TableCell>
              </TableRow>
            ) : (
              athletes.map((athlete) => {
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
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{displayId}</span>
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
                      <div className="flex flex-col text-xs">
                        <span>{athlete._division?.name || 'N/A'}</span>
                        <span className="text-muted-foreground">Max: {athlete._division?.max_weight}kg</span>
                      </div>
                    </TableCell>
                    <TableCell>{athlete.club}</TableCell>
                    <TableCell>
                      {athlete.check_in_status === 'checked_in' && <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> OK</Badge>}
                      {athlete.check_in_status === 'overweight' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Over</Badge>}
                      {athlete.check_in_status === 'pending' && <Badge variant="pending"><Scale className="w-3 h-3 mr-1" /> Pendente</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          className={`h-8 w-24 ${athlete.check_in_status === 'checked_in' ? 'border-success bg-success/10' : ''}`}
                          placeholder="0.0"
                          value={currentInputValue}
                          onChange={(e) => handleWeightChange(athlete.id, e.target.value)}
                          onBlur={() => handleSaveRow(athlete)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
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