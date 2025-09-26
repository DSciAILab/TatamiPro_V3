"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import { Athlete } from '@/types';
import { UserRound, Edit, Trash2 } from 'lucide-react';
import { getAthleteDisplayString } from '@/utils/athlete-utils';

interface EventApprovalsTabProps {
  sortedAthletesUnderApproval: Athlete[];
  selectedAthletesForApproval: string[];
  userRole: string | null;
  editingAthlete: Athlete | null;
  setEditingAthlete: (athlete: Athlete | null) => void;
  handleAthleteUpdate: (updatedAthlete: Athlete) => void;
  handleDeleteAthlete: (athleteId: string) => void;
  handleToggleAthleteSelection: (athleteId: string) => void;
  handleSelectAllAthletes: (checked: boolean) => void;
  handleApproveSelected: () => void;
  handleRejectSelected: () => void;
  mandatoryFieldsConfig: { [key: string]: boolean };
}

const EventApprovalsTab: React.FC<EventApprovalsTabProps> = ({
  sortedAthletesUnderApproval,
  selectedAthletesForApproval,
  userRole,
  editingAthlete,
  setEditingAthlete,
  handleAthleteUpdate,
  handleDeleteAthlete,
  handleToggleAthleteSelection,
  handleSelectAllAthletes,
  handleApproveSelected,
  handleRejectSelected,
  mandatoryFieldsConfig,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovações de Inscrição</CardTitle>
        <CardDescription>Revise e aprove ou rejeite as inscrições pendentes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAthletesUnderApproval.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma inscrição aguardando aprovação.</p>
        ) : (
          <>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="selectAll"
                checked={selectedAthletesForApproval.length === sortedAthletesUnderApproval.length && sortedAthletesUnderApproval.length > 0}
                onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean)}
              />
              <Label htmlFor="selectAll">Selecionar Todos</Label>
            </div>
            <div className="flex space-x-2 mb-4">
              <Button onClick={handleApproveSelected} disabled={selectedAthletesForApproval.length === 0}>
                Aprovar Selecionados ({selectedAthletesForApproval.length})
              </Button>
              <Button onClick={handleRejectSelected} disabled={selectedAthletesForApproval.length === 0} variant="destructive">
                Rejeitar Selecionados ({selectedAthletesForApproval.length})
              </Button>
            </div>
            {editingAthlete && (
              <AthleteProfileEditForm
                athlete={editingAthlete}
                onSave={handleAthleteUpdate}
                onCancel={() => setEditingAthlete(null)}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
              />
            )}
            <ul className="space-y-2">
              {sortedAthletesUnderApproval.map((athlete) => (
                <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedAthletesForApproval.includes(athlete.id)}
                      onCheckedChange={() => handleToggleAthleteSelection(athlete.id)}
                    />
                    {athlete.photoUrl ? (
                      <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-grow">
                      <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                      <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                      {athlete.paymentProofUrl && (
                        <p className="text-xs text-blue-500">
                          <a href={athlete.paymentProofUrl} target="_blank" rel="noopener noreferrer">Ver Comprovante</a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-orange-500 font-semibold">Aguardando Aprovação</span>
                    {userRole === 'admin' && (
                      <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.firstName} {athlete.lastName}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EventApprovalsTab;