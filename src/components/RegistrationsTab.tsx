"use client";

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Event, Athlete, AgeDivisionSetting } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserRound, Edit, Trash2, PlusCircle, QrCodeIcon, Share2, Search, Printer } from 'lucide-react';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import QrCodeGenerator from '@/components/QrCodeGenerator';
import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';
import RegistrationsTable from '@/features/events/components/RegistrationsTable';
import BatchEditTab from '@/features/events/components/BatchEditTab';

interface RegistrationsTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  userClub?: string | null;
  inscricoesSubTab: string;
  setInscricoesSubTab: (value: string) => void;
  editingAthlete: Athlete | null;
  setEditingAthlete: (athlete: Athlete | null) => void;
  handleAthleteUpdate: (athlete: Athlete) => Promise<void>;
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
  handleDeleteSelectedAthletes: () => Promise<void>;
  athletesUnderApproval: Athlete[];
  handleSelectAllAthletes: (checked: boolean, athletesToSelect: Athlete[]) => void;
  handleApproveSelected: () => void;
  handleRejectSelected: () => void;
  ageDivisionSettings: AgeDivisionSetting[];
  onBatchUpdate?: (updatedAthletes: Athlete[]) => void;
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
  handleDeleteSelectedAthletes,
  athletesUnderApproval,
  handleSelectAllAthletes,
  handleApproveSelected,
  handleRejectSelected,
  ageDivisionSettings,
  onBatchUpdate,
}) => {
  const { t } = useTranslations();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const handleRegistrationBoxClick = (filterType: 'all' | 'approved' | 'under_approval' | 'rejected') => {
    const newFilter = (registrationStatusFilter === filterType ? 'all' : filterType);
    setRegistrationStatusFilter(newFilter);
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/public/events/${event.id}/register`;
    navigator.clipboard.writeText(url);
    showSuccess("Registration link copied!");
  };

  const filteredAthletes = useMemo(() => {
    let current = filteredAthletesForDisplay;

    if (searchTerm) {
      // Split by comma for multi-term OR search
      const searchTerms = searchTerm.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        current = current.filter(a => {
          const searchableText = `${a.first_name} ${a.last_name} ${a.club} ${a.emirates_id || ''} ${a.school_id || ''} ${getAthleteDisplayString(a, a._division)}`.toLowerCase();
          // Match if ANY search term is found (OR logic)
          return searchTerms.some(term => searchableText.includes(term));
        });
      }
    }

    return current;
  }, [filteredAthletesForDisplay, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Manage Registrations</span>
          {userRole === 'admin' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 no-print">
                <Share2 className="h-4 w-4" /> Athlete Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 no-print">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>Register athletes in the event divisions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={inscricoesSubTab} onValueChange={setInscricoesSubTab}>
          <TabsList className="w-full flex">
            <TabsTrigger value="registered-athletes" className="flex-1">Registered Athletes</TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="approvals" className="flex-1">Approvals ({athletesUnderApproval.length})</TabsTrigger>
            )}
            {userRole === 'admin' && (
              <TabsTrigger value="batch-edit" className="flex-1">Batch Edit</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="registered-athletes" className="mt-6">
            {userRole && (userRole === 'admin' || (userRole === 'coach' && userClub)) && (
              <div className="mb-6 space-y-4">
                <h3 className="text-xl font-semibold">{userRole === 'admin' ? 'All Registrations' : `My Registrations (${userClub})`}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      registrationStatusFilter === 'all' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
                      'hover:bg-blue-100 dark:hover:bg-blue-900'
                    )}
                    onClick={() => handleRegistrationBoxClick('all')}
                  >
                    <p className="text-2xl font-bold text-blue-600">{coachTotalRegistrations}</p>
                    <p className="text-sm text-muted-foreground">{t('all')}</p>
                  </div>
                  <div
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      registrationStatusFilter === 'approved' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
                      'hover:bg-green-100 dark:hover:bg-green-900'
                    )}
                    onClick={() => handleRegistrationBoxClick('approved')}
                  >
                    <p className="text-2xl font-bold text-green-600">{coachTotalApproved}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                  <div
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      registrationStatusFilter === 'under_approval' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
                      'hover:bg-orange-100 dark:hover:bg-orange-900'
                    )}
                    onClick={() => handleRegistrationBoxClick('under_approval')}
                  >
                    <p className="text-2xl font-bold text-orange-600">{coachTotalPending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      registrationStatusFilter === 'rejected' ? 'bg-red-200 dark:bg-red-800 border-red-500' : 'bg-red-50 dark:bg-red-950',
                      registrationStatusFilter === 'rejected' ? 'hover:bg-red-300 dark:hover:bg-red-700' : 'hover:bg-red-100 dark:hover:bg-red-900'
                    )}
                    onClick={() => handleRegistrationBoxClick('rejected')}
                  >
                    <p className="text-2xl font-bold text-red-600">{coachTotalRejected}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>
            )}

            {userRole && !editingAthlete && (
              <div className="mb-6 space-y-2">
                <Link to={`/events/${event.id}/registration-options`}>
                  <Button className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Athlete (Manual)
                  </Button>
                </Link>
                <Link to={`/events/${event.id}/import-athletes`}>
                  <Button className="w-full" variant="secondary">Batch Import Athletes</Button>
                </Link>
              </div>
            )}

            {userRole && editingAthlete && (
              <AthleteProfileEditForm
                athlete={editingAthlete}
                onSave={handleAthleteUpdate}
                onCancel={() => setEditingAthlete(null)}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
                ageDivisionSettings={ageDivisionSettings}
                divisions={event.divisions}
              />
            )}

            <div className="mt-8 mb-4">
              <h3 className="text-xl font-semibold mb-4">Registered Athletes ({filteredAthletes.length})</h3>
              
              <RegistrationsTable
                athletes={filteredAthletes}
                onEdit={setEditingAthlete}
                onDelete={handleDeleteAthlete}
                userRole={userRole}
                divisions={event.divisions}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                viewMode={viewMode === 'table' ? 'list' : 'grid'}
                onViewModeChange={(mode) => setViewMode(mode === 'list' ? 'table' : 'cards')}
                selectedAthletes={selectedAthletesForApproval}
                onToggleSelection={handleToggleAthleteSelection}
              />
            </div>
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="approvals" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Approvals</CardTitle>
                  <CardDescription>Review and approve or reject pending registrations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {athletesUnderApproval.length === 0 ? (
                    <p className="text-muted-foreground">No registrations awaiting approval.</p>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="selectAll"
                          checked={selectedAthletesForApproval.length === athletesUnderApproval.length && athletesUnderApproval.length > 0}
                          onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean, athletesUnderApproval)}
                        />
                        <Label htmlFor="selectAll">Select All</Label>
                      </div>
                      <div className="flex space-x-2 mb-4">
                        <Button onClick={handleApproveSelected} disabled={selectedAthletesForApproval.length === 0}>
                          Approve Selected ({selectedAthletesForApproval.length})
                        </Button>
                        <Button onClick={handleRejectSelected} disabled={selectedAthletesForApproval.length === 0} variant="destructive">
                          Reject Selected ({selectedAthletesForApproval.length})
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
                              {athlete.photo_url ? (
                                <img src={athlete.photo_url} alt={athlete.first_name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <UserRound className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-grow">
                                <p className="font-medium">{athlete.first_name} {athlete.last_name} ({athlete.nationality})</p>
                                <p className="text-sm text-muted-foreground font-semibold">{athlete.club}</p>
                                <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division, t)}</p>
                                {athlete.payment_proof_url && (
                                  <p className="text-xs text-blue-500">
                                    <a href={athlete.payment_proof_url} target="_blank" rel="noopener noreferrer">View Receipt</a>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-orange-500 font-semibold">Awaiting Approval</span>
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
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently remove the registration of {athlete.first_name} {athlete.last_name}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remove</AlertDialogAction>
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
          
          {userRole === 'admin' && (
            <TabsContent value="batch-edit" className="mt-6">
              <BatchEditTab 
                athletes={filteredAthletesForDisplay} // Use filtered or all? Likely all approved/pending for admins? 
                // Using filteredAthletesForDisplay respects the filter logic (except text search inside components).
                // But BatchEditTab has its own internal search.
                // Let's pass filteredAthletesForDisplay but ensure it includes what we want. 
                // Ideally, batch edit should probably access ALL athletes or have its own fetching?
                // For now, consistent with what's on screen.
                divisions={event.divisions || []}
                onUpdatesSaved={(updated) => onBatchUpdate?.(updated)}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RegistrationsTab;