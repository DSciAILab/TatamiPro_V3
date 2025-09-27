"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Event, Athlete } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserRound, Edit, Trash2, PlusCircle, QrCodeIcon } from 'lucide-react';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import QrCodeGenerator from '@/components/QrCodeGenerator';
import { getAthleteDisplayString } from '@/utils/athlete-utils';

interface RegistrationsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  userClub?: string | null;
  inscricoesSubTab: string;
  setInscricoesSubTab: (value: string) => void;
  editingAthlete: Athlete | null;
  setEditingAthlete: (athlete: Athlete | null) => void;
  handleAthleteUpdate: (athlete: Athlete) => void;
  mandatoryFieldsConfig: Record<string, boolean>;
  filteredAthletesForDisplay: Athlete[];
  registrationStatusFilter: 'all' | 'approved' | 'under_approval' | 'rejected';
  setRegistrationStatusFilter: (value: 'all' | 'approved' | 'under_approval' | 'rejected') => void;
  coachTotalRegistrations: number;
  coachTotalApproved: number;
  coachTotalPending: number;
  coachTotalRejected: number;
  selectedAthletesForApproval: string[];
  handleToggleAthleteSelection: (id: string) => void;
  handleDeleteAthlete: (id: string) => void;
  athletesUnderApproval: Athlete[];
  handleSelectAllAthletes: (checked: boolean) => void;
  handleApproveSelected: () => void;
  handleRejectSelected: () => void;
}

const RegistrationsTab: React.FC<RegistrationsTabProps> = ({
  event,
  userRole,
  userClub,
  inscricoesSubTab,
  setInscricoesSubTab,
  editingAthlete,
  setEditingAthlete,
  handleAthleteUpdate,
  mandatoryFieldsConfig,
  filteredAthletesForDisplay,
  registrationStatusFilter,
  setRegistrationStatusFilter,
  coachTotalRegistrations,
  coachTotalApproved,
  coachTotalPending,
  coachTotalRejected,
  selectedAthletesForApproval,
  handleToggleAthleteSelection,
  handleDeleteAthlete,
  athletesUnderApproval,
  handleSelectAllAthletes,
  handleApproveSelected,
  handleRejectSelected,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Inscrições</CardTitle>
        <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={inscricoesSubTab} onValueChange={setInscricoesSubTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered-athletes">Atletas Inscritos</TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="approvals">Aprovações ({athletesUnderApproval.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="registered-athletes" className="mt-6">
            {userRole && !editingAthlete && (
              <div className="mb-6 space-y-2">
                <Link to={`/events/${event.id}/registration-options`}>
                  <Button className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atleta
                  </Button>
                </Link>
                <Link to={`/events/${event.id}/import-athletes`}>
                  <Button className="w-full" variant="secondary">Importar Atletas em Lote</Button>
                </Link>
              </div>
            )}

            {userRole === 'coach' && userClub && (
              <div className="mb-6 space-y-4">
                <h3 className="text-xl font-semibold">Minhas Inscrições ({userClub})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950">
                    <p className="text-2xl font-bold text-blue-600">{coachTotalRegistrations}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 border rounded-md bg-green-50 dark:bg-green-950">
                    <p className="text-2xl font-bold text-green-600">{coachTotalApproved}</p>
                    <p className="text-sm text-muted-foreground">Aprovadas</p>
                  </div>
                  <div className="p-3 border rounded-md bg-orange-50 dark:bg-orange-950">
                    <p className="text-2xl font-bold text-orange-600">{coachTotalPending}</p>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="p-3 border rounded-md bg-red-50 dark:bg-red-950">
                    <p className="text-2xl font-bold text-red-600">{coachTotalRejected}</p>
                    <p className="text-sm text-muted-foreground">Recusadas</p>
                  </div>
                </div>

                {userRole && (
                  <div className="mb-4 flex justify-center">
                    <ToggleGroup type="single" value={registrationStatusFilter} onValueChange={(value: 'all' | 'approved' | 'under_approval' | 'rejected') => value && setRegistrationStatusFilter(value)}>
                      <ToggleGroupItem value="all" aria-label="Mostrar todos">
                        Todos ({coachTotalRegistrations})
                      </ToggleGroupItem>
                      <ToggleGroupItem value="approved" aria-label="Mostrar aprovados">
                        Aprovados ({coachTotalApproved})
                      </ToggleGroupItem>
                      <ToggleGroupItem value="under_approval" aria-label="Mostrar pendentes">
                        Pendentes ({coachTotalPending})
                      </ToggleGroupItem>
                      <ToggleGroupItem value="rejected" aria-label="Mostrar recusados">
                        Recusados ({coachTotalRejected})
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                )}
              </div>
            )}

            {userRole && editingAthlete && (
              <AthleteProfileEditForm
                athlete={editingAthlete}
                onSave={handleAthleteUpdate}
                onCancel={() => setEditingAthlete(null)}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
              />
            )}

            <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({filteredAthletesForDisplay.length})</h3>
            {filteredAthletesForDisplay.length === 0 ? (
              <p className="text-muted-foreground">Nenhum atleta encontrado com os critérios atuais.</p>
            ) : (
              <ul className="space-y-2">
                {filteredAthletesForDisplay.map((athlete) => (
                  <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-2 border rounded-md">
                    <div className="flex items-center space-x-4">
                      {userRole && <Checkbox
                        checked={selectedAthletesForApproval.includes(athlete.id)}
                        onCheckedChange={() => handleToggleAthleteSelection(athlete.id)}
                        className={athlete.registrationStatus !== 'under_approval' ? 'invisible' : ''}
                      />}
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
                        <p className="text-xs text-gray-500">Status: <span className={`font-semibold ${athlete.registrationStatus === 'approved' ? 'text-green-600' : athlete.registrationStatus === 'under_approval' ? 'text-orange-500' : 'text-red-600'}`}>{athlete.registrationStatus === 'under_approval' ? 'Aguardando Aprovação' : athlete.registrationStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}</span></p>
                        {athlete.moveReason && (
                          <p className="text-xs text-blue-500">
                            <span className="font-semibold">Movido:</span> {athlete.moveReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {athlete.registrationQrCodeId && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon">
                              <QrCodeIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <QrCodeGenerator value={athlete.registrationQrCodeId} size={100} />
                            <p className="text-xs text-center mt-1 text-muted-foreground">ID: {athlete.registrationQrCodeId}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                      {userRole && (
                        <>
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
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="approvals" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aprovações de Inscrição</CardTitle>
                  <CardDescription>Revise e aprove ou rejeite as inscrições pendentes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {athletesUnderApproval.length === 0 ? (
                    <p className="text-muted-foreground">Nenhuma inscrição aguardando aprovação.</p>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="selectAll"
                          checked={selectedAthletesForApproval.length === athletesUnderApproval.length && athletesUnderApproval.length > 0}
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
                      <ul className="space-y-2">
                        {athletesUnderApproval.map((athlete) => (
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
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RegistrationsTab;