"use client";

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Event, Athlete, AgeDivisionSetting } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserRound, Edit, Trash2, PlusCircle, QrCodeIcon, Share2, Search, Printer, Download } from 'lucide-react';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import QrCodeGenerator from '@/components/QrCodeGenerator';
import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';
import { generateCheckInPdf } from '@/utils/pdf-checkin-generator';
import RegistrationsTable from '@/features/events/components/RegistrationsTable';
import BatchEditTab from '@/features/events/components/BatchEditTab';
import { useTranslations } from '@/hooks/use-translations';

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
            <TabsTrigger value="approvals" className="flex-1">Approvals ({athletesUnderApproval.length})</TabsTrigger>
          )}
          {userRole === 'admin' && (
            <TabsTrigger value="batch-edit" className="flex-1">Batch Edit</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="registered-athletes">
        <Card className="mb-6 bg-muted/40">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                {/* Left Side: Filters */}
                <div className="flex-1">
                  {userRole && (userRole === 'admin' || (userRole === 'coach' && userClub)) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1 border",
                          registrationStatusFilter === 'all' 
                            ? "bg-info text-white border-info hover:bg-info/90" 
                            : "border-info text-info hover:bg-info/10"
                        )}
                        onClick={() => handleRegistrationBoxClick('all')}
                      >
                        {t('all')}: {coachTotalRegistrations}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1 border",
                          registrationStatusFilter === 'approved' 
                            ? "bg-success text-white border-success hover:bg-success/90" 
                            : "border-success text-success hover:bg-success/10"
                        )}
                        onClick={() => handleRegistrationBoxClick('approved')}
                      >
                        Approved: {coachTotalApproved}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1 border",
                          registrationStatusFilter === 'under_approval' 
                            ? "bg-pending text-white border-pending hover:bg-pending/90" 
                            : "border-pending text-pending hover:bg-pending/10"
                        )}
                        onClick={() => handleRegistrationBoxClick('under_approval')}
                      >
                        Pending: {coachTotalPending}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1 border",
                          registrationStatusFilter === 'rejected' 
                            ? "bg-destructive text-white border-destructive hover:bg-destructive/90" 
                            : "border-destructive text-destructive hover:bg-destructive/10"
                        )}
                        onClick={() => handleRegistrationBoxClick('rejected')}
                      >
                        Rejected: {coachTotalRejected}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2">
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
                </div>
              </div>

               {/* Search Bar - Moved Inside Card */}
               <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
            </CardContent>
          </Card>
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

          <div className="mb-4">
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
                            <span className="text-sm text-pending font-semibold">Awaiting Approval</span>
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