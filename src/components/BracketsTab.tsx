"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, Swords, Printer, AlertTriangle } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
import { generateBracketForDivision } from '@/utils/bracket-generator';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import MatCategoryList from '@/components/MatCategory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FightOverview from '@/components/FightOverview';
import DivisionDetailView from './DivisionDetailView'; // Import the new component

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  onUpdateBrackets: (brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>) => void;
  bracketsSubTab: string;
  setBracketsSubTab: (value: string) => void;
  // New props for state restoration
  navSelectedMat: string | null;
  navSelectedDivisionId: string | null;
}

interface DivisionRegenStatus extends Division {
  isOngoing: boolean;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  handleUpdateMatAssignments,
  onUpdateBrackets,
  bracketsSubTab,
  setBracketsSubTab,
  navSelectedMat,
  navSelectedDivisionId,
}) => {
  const navigate = useNavigate();

  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [generatedBrackets, setGeneratedBrackets] = useState<Record<string, Bracket>>(() => event.brackets || {});
  
  // Novo estado para o diálogo de confirmação unificado
  const [showRegenerationOptionsDialog, setShowRegenerationOptionsDialog] = useState(false);
  const [divisionsRequiringConfirmation, setDivisionsRequiringConfirmation] = useState<DivisionRegenStatus[]>([]);
  
  // State for managing fights view
  const [selectedMat, setSelectedMat] = useState<string | 'all-mats' | null>(null);
  const [selectedDivisionForDetail, setSelectedDivisionForDetail] = useState<Division | null>(null);

  useEffect(() => {
    setGeneratedBrackets(event.brackets || {});
  }, [event.brackets]);

  // Effect to restore state from navigation (e.g., returning from FightDetail)
  useEffect(() => {
    if (navSelectedMat && navSelectedDivisionId) {
      setSelectedMat(navSelectedMat);
      const division = event.divisions?.find(d => d.id === navSelectedDivisionId);
      if (division) {
        setSelectedDivisionForDetail(division);
        setBracketsSubTab('manage-fights'); // Restore to manage-fights tab
      }
    }
  }, [navSelectedMat, navSelectedDivisionId, event.divisions, setBracketsSubTab]);


  const availableDivisionsForBracketGeneration = useMemo(() => {
    if (!event) return [];
    return (event.divisions || []).filter(div => {
      const athletesInDivision = (event.athletes || []).filter(a =>
        a.registration_status === 'approved' &&
        a.check_in_status === 'checked_in' &&
        a._division?.id === div.id
      );
      return athletesInDivision.length >= 2;
    });
  }, [event]);

  const hasOngoingFights = (divisionId: string): boolean => {
    const bracket = event.brackets?.[divisionId];
    if (!bracket || !bracket.rounds) return false;
    // Verifica se há pelo menos uma luta com vencedor definido
    return bracket.rounds.flat().some(match => match.winner_id !== undefined);
  };

  const executeBracketGeneration = (divisionsToGenerate: Division[]) => {
    if (!event) {
      showError("Evento não carregado.");
      return;
    }

    const newBrackets: Record<string, Bracket> = {};
    const includeThirdPlaceFromEvent = event.include_third_place || false;

    try {
      divisionsToGenerate.forEach(div => {
        const bracket = generateBracketForDivision(div, event.athletes || [], { thirdPlace: includeThirdPlaceFromEvent });
        newBrackets[div.id] = bracket;
      });

      const mergedBrackets = { ...event.brackets, ...newBrackets };

      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      onUpdateBrackets(finalBrackets, newMatFightOrder);
      showSuccess(`${divisionsToGenerate.length} bracket(s) gerado(s) com sucesso!`);
    } catch (error: any) {
      console.error("Error generating brackets:", error);
      showError("Erro ao gerar brackets: " + error.message);
    }
  };

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Evento não carregado.");
      return;
    }

    let divisionsToConsider: Division[] = [];
    if (selectedDivisionIdForBracket === 'all') {
      divisionsToConsider = availableDivisionsForBracketGeneration;
    } else {
      const division = availableDivisionsForBracketGeneration.find(d => d.id === selectedDivisionIdForBracket);
      if (division) {
        divisionsToConsider.push(division);
      } else {
        showError("Divisão selecionada não encontrada ou não tem atletas suficientes.");
        return;
      }
    }

    if (divisionsToConsider.length === 0) {
      showError("Nenhuma divisão com atletas suficientes para gerar brackets.");
      return;
    }

    const divisionsToGenerateImmediately: Division[] = [];
    const divisionsForConfirmation: DivisionRegenStatus[] = [];

    divisionsToConsider.forEach(div => {
      const hasBracket = !!event.brackets?.[div.id];
      const isOngoing = hasBracket && hasOngoingFights(div.id);

      if (!hasBracket) {
        divisionsToGenerateImmediately.push(div);
      } else {
        divisionsForConfirmation.push({ ...div, isOngoing });
      }
    });

    if (divisionsForConfirmation.length === 0) {
      if (divisionsToGenerateImmediately.length > 0) {
        executeBracketGeneration(divisionsToGenerateImmediately);
      } else {
        showError("Nenhuma ação necessária. Todos os brackets já estão gerados.");
      }
      return;
    }

    // Se houver divisões que precisam de confirmação
    setDivisionsRequiringConfirmation(divisionsForConfirmation);
    setShowRegenerationOptionsDialog(true);
  };

  const handleConfirmRegeneration = (regenerateAll: boolean) => {
    setShowRegenerationOptionsDialog(false);
    
    const divisionsToGenerate: Division[] = [];
    const ongoingDivisions = divisionsRequiringConfirmation.filter(d => d.isOngoing);
    const safeDivisions = divisionsRequiringConfirmation.filter(d => !d.isOngoing);

    // 1. Gerar divisões que não tinham bracket (se houver)
    const divisionsToGenerateImmediately = availableDivisionsForBracketGeneration.filter(div => !event.brackets?.[div.id]);
    divisionsToGenerate.push(...divisionsToGenerateImmediately);

    if (regenerateAll) {
      // Opção 2: Regerar TODOS os selecionados (incluindo os em andamento)
      if (userRole !== 'admin' && ongoingDivisions.length > 0) {
        showError("Apenas administradores podem regerar categorias em andamento.");
        return;
      }
      divisionsToGenerate.push(...ongoingDivisions, ...safeDivisions);
    } else {
      // Opção 1: Gerar SOMENTE os que não estão em andamento
      divisionsToGenerate.push(...safeDivisions);
      if (ongoingDivisions.length > 0) {
        showError(`As seguintes categorias foram ignoradas por estarem em andamento: ${ongoingDivisions.map(d => d.name).join(', ')}`);
      }
    }

    if (divisionsToGenerate.length > 0) {
      executeBracketGeneration(divisionsToGenerate);
    } else {
      showError("Nenhuma divisão foi selecionada para regeração.");
    }
    setDivisionsRequiringConfirmation([]);
  };

  const matNames = useMemo(() => {
    if (!event?.num_fight_areas) return [];
    const names = Array.from({ length: event.num_fight_areas }, (_, i) => `Mat ${i + 1}`);
    return ['all-mats', ...names];
  }, [event?.num_fight_areas]);

  const handleSelectCategory = (_categoryKey: string, divisionId: string) => {
    const division = event.divisions?.find(d => d.id === divisionId);
    if (division) {
      setSelectedDivisionForDetail(division);
      // Stay on manage-fights tab
    }
  };

  // Function to handle back navigation from DivisionDetailView
  const handleBackFromDivisionDetail = () => {
    setSelectedDivisionForDetail(null);
    // If we came from FightOverview (which is now removed), we default back to manage-fights
    setBracketsSubTab('manage-fights'); 
  };

  // If a division is selected for detail, render the detail view directly within the tab content
  if (selectedDivisionForDetail) {
    return (
      <Card>
        <CardHeader>
          {/* FIX 2: Using optional chaining and nullish coalescing */}
          <CardTitle>Gerenciamento de Lutas: {selectedDivisionForDetail?.name ?? 'Detalhes da Divisão'}</CardTitle>
          <CardDescription>Gerencie a lista de atletas, o bracket e a ordem de lutas.</CardDescription>
        </CardHeader>
        <CardContent>
          <DivisionDetailView
            event={event}
            division={selectedDivisionForDetail}
            onBack={handleBackFromDivisionDetail}
          />
        </CardContent>
      </Card>
    );
  }

  const ongoingDivisionsCount = divisionsRequiringConfirmation.filter(d => d.isOngoing).length;
  const safeOverwriteDivisionsCount = divisionsRequiringConfirmation.filter(d => !d.isOngoing).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brackets</CardTitle>
        <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
      </CardHeader>
      <CardContent>
        {userRole && (
          <Tabs value={bracketsSubTab} onValueChange={setBracketsSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mat-distribution">Distribuição dos Mats</TabsTrigger>
              <TabsTrigger value="generate-brackets">
                <LayoutGrid className="mr-2 h-4 w-4" /> Gerar Brackets
              </TabsTrigger>
              <TabsTrigger value="manage-fights">
                <Swords className="mr-2 h-4 w-4" /> Gerenciar Lutas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mat-distribution" className="mt-6">
              <MatDistribution
                event={event}
                onUpdateMatAssignments={handleUpdateMatAssignments}
                isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true}
              />
            </TabsContent>

            <TabsContent value="generate-brackets" className="mt-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Opções de Geração</CardTitle>
                  <CardDescription>Selecione as divisões e opções para gerar os brackets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="division-select">Divisão</Label>
                    <Select value={selectedDivisionIdForBracket} onValueChange={(value: string | 'all') => setSelectedDivisionIdForBracket(value)}>
                      <SelectTrigger id="division-select">
                        <SelectValue placeholder="Selecione uma divisão ou todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Divisões</SelectItem>
                        {availableDivisionsForBracketGeneration.map(div => (
                          <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateBrackets} className="w-full">
                    <LayoutGrid className="mr-2 h-4 w-4" /> Gerar Bracket(s)
                  </Button>
                  {Object.keys(generatedBrackets).length > 0 && (
                    <Button className="w-full mt-2" variant="outline" onClick={() => navigate(`/events/${event.id}/print-brackets`)}>
                      <Printer className="mr-2 h-4 w-4" /> Imprimir Brackets (PDF)
                    </Button>
                  )}
                </CardContent>
              </Card>

              <h2 className="text-2xl font-bold mt-8 mb-4">Brackets Gerados</h2>
              {Object.keys(generatedBrackets).length === 0 ? (
                <p className="text-muted-foreground">Nenhum bracket gerado ainda. Use as opções acima para começar.</p>
              ) : (
                <div className="space-y-8">
                  {Object.values(generatedBrackets).map(bracket => {
                    const division = event?.divisions?.find(d => d.id === bracket.division_id);
                    if (!division) return null;
                    return (
                      <BracketView
                        key={bracket.id}
                        bracket={bracket}
                        allAthletes={event.athletes || []}
                        division={division}
                        eventId={event.id}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage-fights" className="mt-6">
              {selectedDivisionForDetail ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes da Divisão: {selectedDivisionForDetail.name}</CardTitle>
                    <CardDescription>Gerencie a lista de atletas, o bracket e a ordem de lutas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DivisionDetailView
                      event={event}
                      division={selectedDivisionForDetail}
                      onBack={handleBackFromDivisionDetail}
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Seleção de Mat e Categoria</CardTitle>
                      <CardDescription>Selecione uma área de luta e clique em uma categoria para ver os detalhes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="mat-select">Área de Luta (Mat)</Label>
                        <Select value={selectedMat || ''} onValueChange={(value: string | 'all-mats') => {
                          setSelectedMat(value);
                          setSelectedDivisionForDetail(null); // Reset division detail when mat changes
                        }}>
                          <SelectTrigger id="mat-select">
                            <SelectValue placeholder="Selecione um Mat" />
                          </SelectTrigger>
                          <SelectContent>
                            {matNames.map(mat => (
                              <SelectItem key={mat} value={mat}>
                                {mat === 'all-mats' ? 'Todas as Áreas' : mat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedMat && (
                        <MatCategoryList
                          event={event}
                          selectedMat={selectedMat}
                          selectedCategoryKey={selectedDivisionForDetail?.id || null}
                          onSelectCategory={handleSelectCategory}
                        />
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Visão Geral das Lutas</CardTitle>
                      <CardDescription>Lista de todas as categorias com seus mats atribuídos. Clique em uma linha para ver os detalhes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FightOverview
                        event={event}
                        onDivisionSelect={(division) => {
                          setSelectedMat('all-mats'); 
                          setSelectedDivisionForDetail(division);
                        }}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* NOVO DIÁLOGO DE CONFIRMAÇÃO UNIFICADO */}
      <AlertDialog open={showRegenerationOptionsDialog} onOpenChange={setShowRegenerationOptionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              Regerar Brackets Existentes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              As seguintes divisões já possuem brackets gerados. Regerá-los irá apagar os brackets atuais e todos os resultados de lutas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 max-h-60 overflow-y-auto p-2 border rounded-md">
            {divisionsRequiringConfirmation.map(div => (
              <div key={div.id} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: div.isOngoing ? 'rgba(255, 0, 0, 0.05)' : 'rgba(255, 255, 0, 0.05)' }}>
                <span className="font-medium">{div.name}</span>
                <span className={`text-sm font-semibold ${div.isOngoing ? 'text-red-600' : 'text-orange-600'}`}>
                  {div.isOngoing ? 'EM ANDAMENTO' : 'SOBRESCRITA SEGURA'}
                </span>
              </div>
            ))}
          </div>

          <AlertDialogFooter className="flex flex-col space-y-2 pt-4">
            <AlertDialogCancel onClick={() => setShowRegenerationOptionsDialog(false)} className="w-full">Cancelar</AlertDialogCancel>
            
            {/* Opção 1: Gerar somente os seguros */}
            <Button 
              onClick={() => handleConfirmRegeneration(false)} 
              variant="secondary" 
              className="w-full"
            >
              Gerar Somente Seguros ({safeOverwriteDivisionsCount})
            </Button>

            {/* Opção 2: Regerar todos (requer admin se houver ongoing) */}
            <Button 
              onClick={() => handleConfirmRegeneration(true)} 
              disabled={ongoingDivisionsCount > 0 && userRole !== 'admin'}
              variant="destructive" 
              className="w-full"
            >
              Regerar TODOS ({divisionsRequiringConfirmation.length})
              {ongoingDivisionsCount > 0 && userRole !== 'admin' && ' (Admin Requerido)'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REMOVENDO O JSX OBSOLETO QUE CAUSOU OS ERROS 3, 4, 5, 6 e 7 */}
    </Card>
  );
};

export default BracketsTab;