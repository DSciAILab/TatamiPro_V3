"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Bracket, Division } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Importar Tabs
import { LayoutGrid, Swords, Printer } from 'lucide-react'; // 'ArrowLeft' removido
import MatDistribution from '@/components/MatDistribution';
import BracketView from '@/components/BracketView';
// import { cn } from '@/lib/utils'; // 'cn' removido
import { generateBracketForDivision } from '@/utils/bracket-generator'; // Importar gerador de bracket
import { generateMatFightOrder } from '@/utils/fight-order-generator'; // Importar gerador de ordem de luta
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import FightList from '@/components/FightList';
import MatCategoryList from '@/components/MatCategoryList';

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  bracketsSubTab: string; // NOVO: Receber o estado da sub-aba
  setBracketsSubTab: (value: string) => void; // NOVO: Receber a função de atualização
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  userRole,
  handleUpdateMatAssignments,
  bracketsSubTab, // Usar o estado recebido
  setBracketsSubTab, // Usar a função recebida
}) => {
  const navigate = useNavigate();

  // --- Estados e Memos para a sub-aba "Gerar Brackets" ---
  const [selectedDivisionIdForBracket, setSelectedDivisionIdForBracket] = useState<string | 'all'>('all');
  const [generatedBrackets, setGeneratedBrackets] = useState<Record<string, Bracket>>(() => event.brackets || {});

  useEffect(() => {
    setGeneratedBrackets(event.brackets || {});
  }, [event.brackets]);

  const availableDivisionsForBracketGeneration = useMemo(() => {
    if (!event) return [];
    return event.divisions.filter(div => {
      const athletesInDivision = event.athletes.filter(a =>
        a.registrationStatus === 'approved' &&
        a.checkInStatus === 'checked_in' &&
        a._division?.id === div.id
      );
      return athletesInDivision.length >= 2;
    });
  }, [event]);

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Evento não carregado.");
      return;
    }

    const newBrackets: Record<string, Bracket> = {};
    let divisionsToProcess: Division[] = [];

    if (selectedDivisionIdForBracket === 'all') {
      divisionsToProcess = availableDivisionsForBracketGeneration;
    } else {
      const division = availableDivisionsForBracketGeneration.find(d => d.id === selectedDivisionIdForBracket);
      if (division) {
        divisionsToProcess.push(division);
      } else {
        showError("Divisão selecionada não encontrada ou não tem atletas suficientes.");
        return;
      }
    }

    if (divisionsToProcess.length === 0) {
      showError("Nenhuma divisão com atletas suficientes para gerar brackets.");
      return;
    }

    try {
      const includeThirdPlaceFromEvent = event.includeThirdPlace || false;

      divisionsToProcess.forEach(div => {
        const bracket = generateBracketForDivision(div, event.athletes, { thirdPlace: includeThirdPlaceFromEvent });
        newBrackets[div.id] = bracket;
      });

      const mergedBrackets = { ...event.brackets, ...newBrackets };

      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      setGeneratedBrackets(finalBrackets);
      const updatedEvent = { ...event, brackets: finalBrackets, matFightOrder: newMatFightOrder };
      localStorage.setItem(`event_${event.id}`, JSON.stringify(updatedEvent));
      showSuccess(`${divisionsToProcess.length} bracket(s) gerado(s) com sucesso!`);
    } catch (error: any) {
      console.error("Error generating brackets:", error);
      showError("Erro ao gerar brackets: " + error.message);
    }
  };

  // --- Estados e Memos para a sub-aba "Gerenciar Lutas" ---
  const [selectedMat, setSelectedMat] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedDivisionIdForFightList, setSelectedDivisionIdForFightList] = useState<string | null>(null);

  const matNames = useMemo(() => {
    if (!event?.numFightAreas) return [];
    return Array.from({ length: event.numFightAreas }, (_, i) => `Mat ${i + 1}`);
  }, [event?.numFightAreas]);

  const handleSelectCategory = (categoryKey: string, divisionId: string) => {
    setSelectedCategoryKey(categoryKey);
    setSelectedDivisionIdForFightList(divisionId);
  };

  const handleUpdateBracket = (divisionId: string, updatedBracket: Bracket) => {
    // Esta função agora precisa atualizar o estado do evento no EventDetail
    // Para simplificar, vamos recarregar o evento ou ter uma prop para isso.
    // Por enquanto, vamos apenas atualizar o localStorage e o estado local de brackets.
    const updatedBrackets = {
      ...event.brackets,
      [divisionId]: updatedBracket,
    };
    const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
      ...event,
      brackets: updatedBrackets,
    });
    const updatedEvent = { ...event, brackets: finalBrackets, matFightOrder: newMatFightOrder };
    localStorage.setItem(`event_${event.id}`, JSON.stringify(updatedEvent));
    setGeneratedBrackets(finalBrackets); // Atualiza o estado local para re-renderizar
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
                isBeltGroupingEnabled={event.isBeltGroupingEnabled ?? true}
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
                    const division = event?.divisions.find(d => d.id === bracket.divisionId);
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
                  <CardTitle>Seleção de Mat e Categoria</CardTitle>
                  <CardDescription>Selecione uma área de luta e uma categoria para gerenciar as lutas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="mat-select">Área de Luta (Mat)</Label>
                    <Select value={selectedMat || ''} onValueChange={(value) => { setSelectedMat(value); setSelectedCategoryKey(null); setSelectedDivisionIdForFightList(null); }}>
                      <SelectTrigger id="mat-select">
                        <SelectValue placeholder="Selecione um Mat" />
                      </SelectTrigger>
                      <SelectContent>
                        {matNames.map(mat => (
                          <SelectItem key={mat} value={mat}>{mat}</SelectItem>
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
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketsTab;