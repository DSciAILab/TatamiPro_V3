"use client";

import React, { useState } from 'react';
import { Event, Bracket, Division } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import DivisionDetailView from './DivisionDetailView';
import MatCategoryList from '@/components/MatCategory';

interface BracketsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  handleUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  onUpdateBrackets: (brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>) => void;
  bracketsSubTab: string;
  setBracketsSubTab: (value: string) => void;
  navSelectedMat: string | null;
  navSelectedDivisionId: string | null;
}

const BracketsTab: React.FC<BracketsTabProps> = ({
  event,
  setBracketsSubTab,
}) => {
  const [showRegenerationOptionsDialog, setShowRegenerationOptionsDialog] = useState(false);
  // Fix Error 4: Removed unused setter. Initializing to 'all-mats' for default view.
  const [selectedMat] = useState<string>('all-mats'); 
  const [selectedDivisionForDetail, setSelectedDivisionForDetail] = useState<Division | null>(null);

  const handleBackFromDivisionDetail = () => {
    setSelectedDivisionForDetail(null);
    setBracketsSubTab('manage-fights');
  };

  const handleSelectCategory = (_categoryKey: string, divisionId: string) => {
    const division = event.divisions?.find(d => d.id === divisionId);
    if (division) {
      setSelectedDivisionForDetail(division);
    }
  };

  if (selectedDivisionForDetail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Lutas: {selectedDivisionForDetail.name}</CardTitle>
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

  return (
    <Card>
      <MatCategoryList
        event={event}
        selectedMat={selectedMat}
        selectedCategoryKey={(selectedDivisionForDetail as Division)?.id || null}
        onSelectCategory={handleSelectCategory}
      />

      <AlertDialog 
        open={showRegenerationOptionsDialog} 
        onOpenChange={setShowRegenerationOptionsDialog}
      >
        <AlertDialogContent>
          {/* Dialog content */}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BracketsTab;