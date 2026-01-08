"use client";

import React, { useState, useMemo } from 'react';
import { Event, Athlete } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCodeIcon, Barcode, Download, ChevronDown, ChevronUp } from 'lucide-react';
import CheckInTable from '@/features/events/components/CheckInTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [isFaceCaptureOpen, setIsFaceCaptureOpen] = useState(false);

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

  const handleDownloadPdf = () => {
    generateCheckInPdf(event, processedApprovedAthletes);
  };

  const handleFaceCapture = (imageData: string) => {
    // For now, just log - future implementation can match faces
    console.log('Face captured:', imageData.substring(0, 50) + '...');
    showSuccess('Face captured successfully! (Beta feature)');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Check-in & Weigh-in</span>
            <div className="flex items-center space-x-2">
              <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="gap-2 no-print">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              {!isCheckInAllowedGlobally && (
                <Badge variant="destructive">Check-in Closed</Badge>
              )}
              {event.is_check_in_open && (
                <Badge variant="outline" className="text-green-600 border-green-600">Check-in Open</Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>Manage athlete check-in and weigh-in.</CardDescription>
        </CardHeader>
      </Card>

      {!processedApprovedAthletes || processedApprovedAthletes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">No approved athletes for check-in at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column - QR Scanner & Athletes Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div
                className={cn(
                  "p-3 border rounded-md cursor-pointer transition-colors",
                  checkInFilter === 'checked_in' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
                  checkInFilter === 'checked_in' ? 'hover:bg-green-300 dark:hover:bg-green-700' : 'hover:bg-green-100 dark:hover:bg-green-900'
                )}
                onClick={() => setCheckInFilter('checked_in')}
              >
                <p className="text-2xl font-bold text-green-600">{totalCheckedIn}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
              <div
                className={cn(
                  "p-3 border rounded-md cursor-pointer transition-colors",
                  checkInFilter === 'pending' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
                  checkInFilter === 'pending' ? 'hover:bg-orange-300 dark:hover:bg-orange-700' : 'hover:bg-orange-100 dark:hover:bg-orange-900'
                )}
                onClick={() => setCheckInFilter('pending')}
              >
                <p className="text-2xl font-bold text-orange-600">{totalPendingCheckIn}</p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
              <div
                className={cn(
                  "p-3 border rounded-md cursor-pointer transition-colors",
                  checkInFilter === 'all' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
                  checkInFilter === 'all' ? 'hover:bg-blue-300 dark:hover:bg-blue-700' : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                )}
                onClick={() => setCheckInFilter('all')}
              >
                <p className="text-2xl font-bold text-blue-600">{totalApprovedAthletes}</p>
                <p className="text-sm text-muted-foreground">Total Approved</p>
              </div>
            </div>

            {/* QR/Barcode Scanner Buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {event.check_in_scan_mode === 'qr' && (
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-auto">
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
                <div className="flex-1">
                  <Button variant="outline" className="w-full" disabled>
                    <Barcode className="mr-2 h-4 w-4" /> Scan Barcode (Coming Soon)
                  </Button>
                </div>
              )}
            </div>

            {/* Athletes Table */}
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
              viewMode={viewMode === 'table' ? 'list' : 'grid'}
              onViewModeChange={(mode) => setViewMode(mode === 'list' ? 'table' : 'cards')}
            />
          </div>

          {/* Side Column - Face Capture (Beta) */}
          <div className="lg:col-span-1">
            <Collapsible open={isFaceCaptureOpen} onOpenChange={setIsFaceCaptureOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Face ID</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          Beta
                        </Badge>
                        {isFaceCaptureOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {isFaceCaptureOpen 
                        ? 'Capture athlete face for identity verification'
                        : 'Click to expand Face ID capture'
                      }
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <FaceCapture onCapture={handleFaceCapture} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInTab;