"use client";

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Event, Athlete, AgeDivisionSetting } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserRound, Trash2, PlusCircle, Share2, Download, RotateCcw } from 'lucide-react';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';

import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { showSuccess } from '@/utils/toast';
import { generateCheckInPdf } from '@/utils/pdf-checkin-generator';
import RegistrationsTable from '@/features/events/components/RegistrationsTable';
import BatchEditTab from '@/features/events/components/BatchEditTab';
import DivisionSummaryTab from '@/features/events/components/DivisionSummaryTab';
import { useTranslations } from '@/hooks/use-translations';
import DataPageToolbar, { type ToolbarFilter } from '@/components/ui/DataPageToolbar';

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
  handleRevertApprovalStatus: () => void;
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
  handleRevertApprovalStatus,
  ageDivisionSettings,
  onBatchUpdate,
}) => {
  const { t } = useTranslations();

  const [searchTerm, setSearchTerm] = useState<string>('');


  const handleRegistrationBoxClick = (filterType: 'all' | 'approved' | 'under_approval' | 'rejected') => {
    const newFilter = (registrationStatusFilter === filterType ? 'all' : filterType);
    setRegistrationStatusFilter(newFilter);
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/p/events/${event.id}/register`;
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
          const searchableText = `${a.first_name} ${a.last_name} ${a.club} ${a.emirates_id || ''} ${a.school_id || ''} ${getAthleteDisplayString(a, a._division, t)}`.toLowerCase();
          // Match if ANY search term is found (OR logic)
          return searchTerms.some(term => searchableText.includes(term));
        });
      }
    }

    return current;
  }, [filteredAthletesForDisplay, searchTerm]);

  return (
    <div className="space-y-6">
      <Tabs value={inscricoesSubTab} onValueChange={setInscricoesSubTab} className="w-full">
        <TabsList className="w-full flex mb-6">
          <TabsTrigger value="registered-athletes" className="flex-1">Registered Athletes</TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="division-summary" className="flex-1">Division Summary</TabsTrigger>
          )}
          {userRole === 'admin' && (
            <TabsTrigger value="approvals" className="flex-1">Approvals ({athletesUnderApproval.length})</TabsTrigger>
          )}
          {userRole === 'admin' && (
            <TabsTrigger value="batch-edit" className="flex-1">Batch Edit</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="registered-athletes">
        {(() => {
          const registrationFilters: ToolbarFilter[] = userRole && (userRole === 'admin' || (userRole === 'coach' && userClub))
            ? [
                {
                  label: t('all'),
                  count: coachTotalRegistrations,
                  value: 'all',
                  colorClass: 'border-info text-info hover:bg-info/10',
                  activeColorClass: 'bg-info text-white border-info hover:bg-info/90',
                },
                {
                  label: 'Approved',
                  count: coachTotalApproved,
                  value: 'approved',
                  colorClass: 'border-success text-success hover:bg-success/10',
                  activeColorClass: 'bg-success text-white border-success hover:bg-success/90',
                },
                {
                  label: 'Pending',
                  count: coachTotalPending,
                  value: 'under_approval',
                  colorClass: 'border-pending text-pending hover:bg-pending/10',
                  activeColorClass: 'bg-pending text-white border-pending hover:bg-pending/90',
                },
                {
                  label: 'Rejected',
                  count: coachTotalRejected,
                  value: 'rejected',
                  colorClass: 'border-destructive text-destructive hover:bg-destructive/10',
                  activeColorClass: 'bg-destructive text-white border-destructive hover:bg-destructive/90',
                },
              ]
            : [];

          const registrationActions = (
            <>
              {!editingAthlete && userRole && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <PlusCircle className="h-4 w-4" />
                      Add Athlete
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/events/${event.id}/registration-options`} className="cursor-pointer">
                        <UserRound className="mr-2 h-4 w-4" />
                        Manual Registration
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/events/${event.id}/import-athletes`} className="cursor-pointer">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Batch Import
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {userRole === 'admin' && (
                <>
                  <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-2 text-info border-info/20 bg-info/10 hover:bg-info/20 no-print">
                    <Share2 className="h-4 w-4" /> Athlete Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => generateCheckInPdf(event, filteredAthletesForDisplay, 'Registrations Report')} className="gap-2 no-print">
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                </>
              )}
            </>
          );

          return (
            <>
              <DataPageToolbar
                filters={registrationFilters}
                activeFilter={registrationStatusFilter}
                onFilterChange={(v) => handleRegistrationBoxClick(v as any)}
                searchPlaceholder="Search by name, category or team..."
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                actions={registrationActions}
              />
          {userRole && editingAthlete && (
            <div className="mb-6">
              <AthleteProfileEditForm
                athlete={editingAthlete}
                onSave={handleAthleteUpdate}
                onCancel={() => setEditingAthlete(null)}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
                ageDivisionSettings={ageDivisionSettings}
                divisions={event.divisions}
              />
            </div>
          )}

          <div className="mb-4 space-y-4">
            {userRole === 'admin' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAllRegistered"
                    checked={selectedAthletesForApproval.length === filteredAthletes.length && filteredAthletes.length > 0}
                    onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean, filteredAthletes)}
                  />
                  <Label htmlFor="selectAllRegistered">Select All</Label>
                </div>
                {selectedAthletesForApproval.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Selected ({selectedAthletesForApproval.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {selectedAthletesForApproval.length} selected registration(s). This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSelectedAthletes}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Revert Status ({selectedAthletesForApproval.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revert approval status?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will set {selectedAthletesForApproval.length} selected athlete(s) back to "Pending Approval" status.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRevertApprovalStatus}>Revert</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
            <RegistrationsTable
              athletes={filteredAthletes}
              onEdit={setEditingAthlete}
              onDelete={handleDeleteAthlete}
              userRole={userRole}
              divisions={event.divisions}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedAthletes={selectedAthletesForApproval}
              onToggleSelection={handleToggleAthleteSelection}
              hideSearch={true}
              showSelection={userRole === 'admin'}
              onSelectAll={(checked) => handleSelectAllAthletes(checked, filteredAthletes)}
              allSelected={selectedAthletesForApproval.length === filteredAthletes.length && filteredAthletes.length > 0}
            />
          </div>
            </>
          );
        })()}
        </TabsContent>

        {userRole === 'admin' && (
          <TabsContent value="division-summary" className="mt-6">
            <DivisionSummaryTab
              athletes={filteredAthletesForDisplay}
              divisions={event.divisions || []}
            />
          </TabsContent>
        )}

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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="selectAllApprovals"
                          checked={selectedAthletesForApproval.length === athletesUnderApproval.length && athletesUnderApproval.length > 0}
                          onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean, athletesUnderApproval)}
                        />
                        <Label htmlFor="selectAllApprovals">Select All</Label>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleApproveSelected} disabled={selectedAthletesForApproval.length === 0}>
                          Approve Selected ({selectedAthletesForApproval.length})
                        </Button>
                        <Button onClick={handleRejectSelected} disabled={selectedAthletesForApproval.length === 0} variant="destructive">
                          Reject Selected ({selectedAthletesForApproval.length})
                        </Button>
                      </div>
                    </div>
                    <RegistrationsTable
                      athletes={athletesUnderApproval}
                      onEdit={setEditingAthlete}
                      onDelete={handleDeleteAthlete}
                      userRole={userRole}
                      divisions={event.divisions}
                      hideSearch={true}
                      showSelection={true}
                      selectedAthletes={selectedAthletesForApproval}
                      onToggleSelection={handleToggleAthleteSelection}
                      onSelectAll={(checked) => handleSelectAllAthletes(checked, athletesUnderApproval)}
                      allSelected={selectedAthletesForApproval.length === athletesUnderApproval.length && athletesUnderApproval.length > 0}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
          
          {userRole === 'admin' && (
            <TabsContent value="batch-edit" className="mt-6">
              <BatchEditTab 
                athletes={filteredAthletesForDisplay} 
                divisions={event.divisions || []}
                onUpdatesSaved={(updated) => onBatchUpdate?.(updated)}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
  );
};

export default RegistrationsTab;