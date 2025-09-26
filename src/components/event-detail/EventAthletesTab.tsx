"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import { Athlete, Division } from '@/types';
import { UserRound, Edit, Trash2, PlusCircle } from 'lucide-react';
import { getAthleteDisplayString } from '@/utils/athlete-utils';

interface EventAthletesTabProps {
  eventId: string;
  processedApprovedAthletes: Athlete[];
  userRole: string | null;
  editingAthlete: Athlete | null;
  setEditingAthlete: (athlete: Athlete | null) => void;
  handleAthleteUpdate: (updatedAthlete: Athlete) => void;
  handleDeleteAthlete: (athleteId: string) => void;
  mandatoryFieldsConfig: { [key: string]: boolean };
}

const EventAthletesTab: React.FC<EventAthletesTabProps> = ({
  eventId,
  processedApprovedAthletes,
  userRole,
  editingAthlete,
  setEditingAthlete,
  handleAthleteUpdate,
  handleDeleteAthlete,
  mandatoryFieldsConfig,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Inscrições</CardTitle>
        <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
      </CardHeader>
      <CardContent>
        {!editingAthlete && (
          <div className="mb-6">
            <Link to={`/events/${eventId}/registration-options`}>
              <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atleta
              </Button>
            </Link>
          </div>
        )}

        {editingAthlete && (
          <AthleteProfileEditForm
            athlete={editingAthlete}
            onSave={handleAthleteUpdate}
            onCancel={() => setEditingAthlete(null)}
            mandatoryFieldsConfig={mandatoryFieldsConfig}
          />
        )}

        <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({processedApprovedAthletes.length})</h3>
        {processedApprovedAthletes.length === 0 ? (
          <p className="text-muted-foreground">Nenhum atleta aprovado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {processedApprovedAthletes.map((athlete) => (
              <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                <div className="flex items-center space-x-4">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                    <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                    <p className="text-xs text-gray-500">Status: <span className="font-semibold text-green-600">Aprovado</span></p>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                      <Edit className="h-4 w-4" />
                    </Button>
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
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default EventAthletesTab;