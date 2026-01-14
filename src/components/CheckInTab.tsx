"use client";

import React, { useState, useMemo } from 'react';
import { Event, Athlete } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCodeIcon, Barcode, Download } from 'lucide-react';
import CheckInTable from '@/features/events/components/CheckInTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QrScanner from '@/components/QrScanner';
import { FaceCapture } from '@/components/face/FaceCapture';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { generateCheckInPdf } from '@/utils/pdf-checkin-generator';

interface CheckInTabProps {
  event: Event;
  processedApprovedAthletes: Athlete[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredAthletesForCheckIn: Athlete[];
  checkInFilter: 'all' | 'checked_in' | 'pending' | 'overweight' | 'moved';
  setCheckInFilter: (filter: 'all' | 'checked_in' | 'pending' | 'overweight' | 'moved') => void;
  totalApprovedAthletes: number;
  totalCheckedIn: number;
  totalPendingCheckIn: number;
  handleCheckInAthlete: (athlete: Athlete) => void;
  handleBatchCheckIn: (athleteIds: string[]) => void;
}

const CheckInTab: React.FC<CheckInTabProps> = ({
  event,
  processedApprovedAthletes,
  searchTerm,
  setSearchTerm,
  filteredAthletesForCheckIn,
  checkInFilter,
  setCheckInFilter,
  totalApprovedAthletes,
  totalCheckedIn,
  totalPendingCheckIn,
  handleCheckInAthlete,
  handleBatchCheckIn,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [isFaceCaptureOpen, setIsFaceCaptureOpen] = useState(false);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);

  const isCheckInAllowedGlobally = useMemo(() => {
    // Check global event setting first
    if (event.is_check_in_open === false) return false;

    // Check date range
    if (!event.check_in_enabled_start || !event.check_in_enabled_end) return true;
    const now = new Date();
    const start = new Date(event.check_in_enabled_start);
    const end = new Date(event.check_in_enabled_end);
    return now >= start && now <= end;
  }, [event]);
  
  // Batch check-in only enabled when weight check is DISABLED
  const isBatchCheckInEnabled = event.is_weight_check_enabled === false;

  const handleDownloadPdf = () => {
    generateCheckInPdf(event, processedApprovedAthletes);
  };

  const handleFaceCapture = (imageData: string) => {
    // For now, just log - future implementation can match faces
    console.log('Face captured:', imageData.substring(0, 50) + '...');
    showSuccess('Face captured successfully! (Beta feature)');
  };
  
  const handleToggleSelectAthlete = (athleteId: string) => {
    setSelectedAthleteIds(prev => 
      prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all visible athletes that are NOT checked in yet
      const pendingAthletes = filteredAthletesForCheckIn.filter(a => a.check_in_status === 'pending');
      setSelectedAthleteIds(pendingAthletes.map(a => a.id));
    } else {
      setSelectedAthleteIds([]);
    }
  };
  
  const onBatchCheckIn = () => {
    if (selectedAthleteIds.length === 0) return;
    handleBatchCheckIn(selectedAthleteIds);
    setSelectedAthleteIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}


      {!processedApprovedAthletes || processedApprovedAthletes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">No approved athletes for check-in at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Toolbar: Filters + Buttons */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
            {/* Left Side: Filters */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
                <Badge
                  variant={checkInFilter === 'all' ? 'info' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all px-3 py-1",
                    checkInFilter === 'all' ? 'ring-2 ring-info/50' : 'hover:bg-info/10'
                  )}
                  onClick={() => setCheckInFilter('all')}
                >
                  Total Approved: {totalApprovedAthletes}
                </Badge>
                <Badge
                  variant={checkInFilter === 'checked_in' ? 'success' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all px-3 py-1",
                    checkInFilter === 'checked_in' ? 'ring-2 ring-success/50' : 'hover:bg-success/10'
                  )}
                  onClick={() => setCheckInFilter('checked_in')}
                >
                  Checked In: {totalCheckedIn}
                </Badge>
                <Badge
                  variant={checkInFilter === 'pending' ? 'pending' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all px-3 py-1",
                    checkInFilter === 'pending' ? 'ring-2 ring-pending/50' : 'hover:bg-pending/10'
                  )}
                  onClick={() => setCheckInFilter('pending')}
                >
                  Remaining: {totalPendingCheckIn}
                </Badge>
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-2">
              {!isCheckInAllowedGlobally && (
                <Badge variant="destructive" className="mr-2 hidden md:flex">Check-in Closed</Badge>
              )}
              {event.is_check_in_open && (
                 <Badge variant="outline" className="text-success border-success mr-2 hidden md:flex">Check-in Open</Badge>
              )}
              
              <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="gap-2 no-print">
                <Download className="h-4 w-4" /> Download PDF
              </Button>

              {event.check_in_scan_mode === 'qr' && (
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <QrCodeIcon className="mr-2 h-4 w-4" /> Scan QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Scan Athlete QR Code</DialogTitle>
                    </DialogHeader>
                    <QrScanner
                      onScanSuccess={(qrCodeId) => {
                        const athlete = processedApprovedAthletes.find(a => a.registration_qr_code_id === qrCodeId);
                        if (athlete) {
                          setScannedAthleteId(qrCodeId);
                          setSearchTerm('');
                          showSuccess(`Athlete ${athlete.first_name} ${athlete.last_name} scanned!`);
                          setIsScannerOpen(false);
                        } else {
                          showError('QR Code not recognized or athlete not found.');
                        }
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {event.check_in_scan_mode === 'barcode' && (
                <Button variant="outline" size="sm" disabled>
                  <Barcode className="mr-2 h-4 w-4" /> Scan Barcode
                </Button>
              )}

              {/* Face ID Dialog Button */}
              <Dialog open={isFaceCaptureOpen} onOpenChange={setIsFaceCaptureOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="10" r="1.5" />
                      <circle cx="15" cy="10" r="1.5" />
                      <path d="M9 16c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5" />
                    </svg>
                    Face ID
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      Face ID Check-in
                      <Badge variant="warning">
                        Beta
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <FaceCapture onCapture={handleFaceCapture} />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Batch Check-in Button */}
              {isBatchCheckInEnabled && selectedAthleteIds.length > 0 && (
                <Button onClick={onBatchCheckIn} className="bg-success hover:bg-success/90 text-success-foreground animate-in fade-in zoom-in" size="sm">
                    Batch Check-in ({selectedAthleteIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Athletes Table - Full Width */}
          <CheckInTable
            athletes={filteredAthletesForCheckIn}
            event={event}
            isCheckInAllowedGlobally={!!isCheckInAllowedGlobally}
            onCheckIn={handleCheckInAthlete}
            searchTerm={searchTerm}
            onSearchChange={(term) => {
              setSearchTerm(term);
              setScannedAthleteId(null);
            }}
            selectedAthleteIds={selectedAthleteIds}
            onToggleSelectAthlete={handleToggleSelectAthlete}
            onSelectAll={handleSelectAll}
            isBatchSelectionEnabled={isBatchCheckInEnabled}
          />
        </div>
      )}
    </div>
  );
};

export default CheckInTab;