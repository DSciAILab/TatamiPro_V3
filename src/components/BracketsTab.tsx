"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, Swords, Printer, Columns, Rows, GitMerge } from 'lucide-react';
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
import { generateBracketForDivision } from '@/utils/bracket-generator';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import FightList from '@/components/FightList';
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

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  bracketsSubTab: string;
  setBracketsSubTab: (value: string) => void;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  handleUpdateMatAssignments,
  bracketsSubTab,
  setBracketsSubTab,
}) => {
  const navigate = useNavigate();

  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [generatedBrackets, setGeneratedBrackets] = useState<Record<string, Bracket>>(() => event.brackets || {});
  const [showRegenerateConfirmDialog, setShowRegenerateConfirmDialog] = useState(false);
  const [divisionsToConfirmRegenerate, setDivisionsToConfirmRegenerate] = useState<Division[]>([]);
  const [showOngoingWarningDialog, setShowOngoingWarningDialog] = useState(false);
  const [divisionToRegenerateOngoing, setDivisionToRegenerateOngoing] = useState<Division | null>(null);
  const [fightViewMode, setFightViewMode] = useState<'grid3' | 'grid2' | 'grid1' | 'bracket'>('grid3');

  useEffect(() => {
    setGeneratedBrackets(event.brackets || {});
  }, [event.brackets]);

  const availableDivisionsForBracketGeneration = useMemo(() => {
    if (!event) return [];
    return event.divisions.filter(div => {
      const athletesInDivision = event.athletes.filter(a =>
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
        const bracket = generateBracketForDivision(div, event.athletes, { thirdPlace: includeThirdPlaceFromEvent });
        newBrackets[div.id] = bracket;
      });

      const mergedBrackets = { ...event.brackets, ...newBrackets };

      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      setGeneratedBrackets(finalBrackets);
      const updatedEvent = { ...event, brackets: finalBrackets, mat_fight_order: newMatFightOrder };
      localStorage.setItem(`event_${event.id}`, JSON.stringify(updatedEvent));
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

    const divisionsWithOngoingFights = divisionsToConsider.filter(div => hasOngoingFights(div.id));

    if (selectedDivisionIdForBracket !== 'all' && divisionsWithOngoingFights.length > 0) {
      if (userRole === 'admin') {
        setDivisionToRegenerateOngoing(divisionsWithOngoingFights[0]);
        setShowOngoingWarningDialog(true);
      } else {
        showError("Você não tem permissão para regerar brackets de categorias em andamento.");
      }
      return;
    }

    const divisionsToActuallyGenerate = divisionsToConsider.filter(div => !hasOngoingFights(div.id));
    const divisionsThatWillBeRegenerated = divisionsToActuallyGenerate.filter(div => event.brackets?.[div.id]);

    if (divisionsThatWillBeRegenerated.length > 0) {
      setDivisionsToConfirmRegenerate(divisionsThatWillBeRegenerated);
      setShowRegenerateConfirmDialog(true);
    } else {
      executeBracketGeneration(divisionsToActuallyGenerate);
    }
  };

  const confirmRegenerateAction = () => {
    executeBracketGeneration(divisionsToConfirmRegenerate);
    setShowRegenerateConfirmDialog(false);
    setDivisionsToConfirmRegenerate([]);
  };

  const confirmRegenerateOngoingAction = () => {
    if (divisionToRegenerateOngoing) {
      executeBracketGeneration([divisionToRegenerateOngoing]);
    }
    setShowOngoingWarningDialog(false);
    setDivisionToRegenerateOngoing(null);
  };

  const [selectedMat, setSelectedMat] = useState<string | 'all-mats' | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedDivisionIdForFightList, setSelectedDivisionIdForFightList] = useState<string | null>(null);

  const matNames = useMemo(() => {
    if (!event?.num_fight_areas) return [];
    const names = Array.from({ length: event.num_fight_areas }, (_, i) => `Mat ${i + 1}`);
    return ['all-mats', ...names];
  }, [event?.num_fight_areas]);

  const handleSelectCategory = (categoryKey: string, divisionId: string) => {
    setSelectedCategoryKey(categoryKey);
    setSelectedDivisionIdForFightList(divisionId);
  };

  const handleUpdateBracket = (divisionId: string, updatedBracket: Bracket) => {
    const updatedBrackets = {
      ...event.brackets,
      [divisionId]: updatedBracket,
    };
    const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
      ...event,
      brackets: updatedBrackets,
    });
    const updatedEvent = { ...event, brackets: finalBrackets, mat_fight_order: newMatFightOrder };
    localStorage.setItem(`event_${event.id}`, JSON.stringify(updatedEvent));
    setGeneratedBrackets(finalBrackets);
  };

  const toggleFightView = () => {
    const modes: ('grid3' | 'grid2' | 'grid1' | 'bracket')[] = ['grid3', 'grid2', 'grid1', 'bracket'];
    const currentIndex = modes.indexOf(fightViewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFightViewMode(modes[nextIndex]);
  };

  const ViewModeIcon = ({ mode }: { mode: typeof fightViewMode }) => {
    switch (mode) {
      case 'grid3': return <LayoutGrid className="h-4 w-4" />;
      case 'grid2': return <Columns className="h-4 w-4" />;
      case 'grid1': return <Rows className="h-4 w-4" />;
      case 'bracket': return <GitMerge className="h-4 w-4" />;
      default: return <LayoutGrid className="h-4 w-4" />;
    }
  };

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
                    const division = event?.divisions.find(d => d.id === bracket.division_id);
                    if (!division) return null;
                    return (
                      <BracketView
                        key={bracket.id}
                        bracket={bracket}
                        allAthletes={event.athletes}
                        division={division}
                        eventId={event.id}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage-fights" className="mt-6">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Seleção de Mat e Categoria</CardTitle>
                      <CardDescription>Selecione uma área de luta e uma categoria para gerenciar as lutas.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={toggleFightView} title={`Alterar visualização (Atual: ${fightViewMode})`}>
                      <ViewModeIcon mode={fightViewMode} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="mat-select">Área de Luta (Mat)</Label>
                    <Select value={selectedMat || ''} onValueChange={(value: string | 'all-mats') => { setSelectedMat(value); setSelectedCategoryKey(null); setSelectedDivisionIdForFightList(null); }}>
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
                      selectedCategoryKey={selectedCategoryKey}
                      onSelectCategory={handleSelectCategory}
                      hasOngoingFights={hasOngoingFights}
                    />
                  )}
                </CardContent>
              </Card>

              {selectedMat && selectedCategoryKey && selectedDivisionIdForFightList && event.brackets && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Swords className="mr-2 h-6 w-6" /> Lutas da Categoria: {selectedCategoryKey}
                    </CardTitle>
                    <CardDescription>Clique em uma luta para registrar o resultado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FightList
                      event={event}
                      selectedMat={selectedMat}
                      selectedCategoryKey={selectedCategoryKey}
                      selectedDivisionId={selectedDivisionIdForFightList}
                      onUpdateBracket={handleUpdateBracket}
                      fightViewMode={fightViewMode}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog open={showRegenerateConfirmDialog} onOpenChange={setShowRegenerateConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regerar Brackets Existentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Você selecionou divisões que já possuem brackets gerados. Regerá-los irá apagar os brackets atuais e quaisquer resultados de lutas não iniciadas.
              {divisionsToConfirmRegenerate.length > 0 && (
                <ul className="list-disc list-inside mt-2">
                  {divisionsToConfirmRegenerate.map(div => (
                    <li key={div.id} className="font-medium">{div.name}</li>
                  ))}
                </ul>
              )}
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRegenerateConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerateAction}>Regerar Brackets</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showOngoingWarningDialog} onOpenChange={setShowOngoingWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aviso: Categoria em Andamento!</AlertDialogTitle>
            <AlertDialogDescription>
              A divisão "{divisionToRegenerateOngoing?.name}" já possui lutas com resultados registrados.
              Regerar o bracket desta divisão irá apagar todos os resultados existentes e o progresso das lutas.
              {userRole === 'admin' ? (
                <>
                  <p className="mt-2 font-semibold text-red-600">Esta é uma ação crítica e irreversível.</p>
                  <p className="mt-1">Tem certeza que deseja continuar como administrador?</p>
                </>
              ) : (
                <p className="mt-2 font-semibold text-red-600">Você não tem permissão para regerar brackets de categorias em andamento.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOngoingWarningDialog(false)}>Cancelar</AlertDialogCancel>
            {userRole === 'admin' && (
              <AlertDialogAction onClick={confirmRegenerateOngoingAction} className="bg-red-600 hover:bg-red-700">
                Regerar (Admin Override)
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BracketsTab;