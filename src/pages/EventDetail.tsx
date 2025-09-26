"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// import AthleteRegistrationForm from '@/components/AthleteRegistrationForm'; // Removed
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import CheckInForm from '@/components/CheckInForm';
import QrCodeScanner from '@/components/QrCodeScanner';
import QrCodeGenerator from '@/components/QrCodeGenerator';
import DivisionTable from '@/components/DivisionTable';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';
import AttendanceManagement from '@/components/AttendanceManagement';
import MatDistribution from '@/components/MatDistribution';
import { Athlete, Event, Division, Bracket } from '../types/index'; // Removed WeightAttempt
import { UserRound, Edit, CheckCircle, XCircle, Scale, CalendarIcon, Search, Trash2, PlusCircle, QrCodeIcon, LayoutGrid, Swords } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAthleteDisplayString, findAthleteDivision, processAthleteData } from '@/utils/athlete-utils'; // Removed getAgeDivision, getWeightDivision
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, differenceInSeconds } from 'date-fns'; // Removed isValid, differenceInMinutes
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BracketView from '@/components/BracketView';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { LanguageToggle } from '@/components/LanguageToggle';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const userRole = localStorage.getItem('userRole');
  const userClub = localStorage.getItem('userClub');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'checked_in' | 'overweight' | 'all'>('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<'all' | 'approved' | 'under_approval' | 'rejected'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [event, setEvent] = useState<Event | null>(() => {
    let tempDivisions: Division[] = [];
    const existingEventDataRaw = localStorage.getItem(`event_${id}`);
    if (existingEventDataRaw) {
      try {
        const parsedEvent = JSON.parse(existingEventDataRaw);
        tempDivisions = parsedEvent.divisions || [];
      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage para divisões temporárias", e);
      }
    }

    const storedImportedAthletes = localStorage.getItem(`importedAthletes_${id}`);
    let initialImportedAthletes: Athlete[] = [];
    if (storedImportedAthletes) {
      try {
        initialImportedAthletes = JSON.parse(storedImportedAthletes).map((a: any) => processAthleteData(a, tempDivisions));
        localStorage.removeItem(`importedAthletes_${id}`);
        showSuccess(`Atletas importados do arquivo CSV carregados para o evento ${id}.`);
      } catch (e) {
        console.error("Falha ao analisar atletas importados do localStorage", e);
        showError("Erro ao carregar atletas importados do armazenamento local.");
      }
    }

    const existingEventData = localStorage.getItem(`event_${id}`);
    let existingAthletes: Athlete[] = [];
    let eventSettings = {};
    let existingDivisions: Division[] = [];
    let isAttendanceMandatoryBeforeCheckIn = false;
    let isWeightCheckEnabled = true;
    let matAssignments: Record<string, string[]> = {};
    let isBeltGroupingEnabled = true;
    let isOverweightAutoMoveEnabled = false;
    let existingBrackets: Record<string, Bracket> = {};
    let matFightOrder: Record<string, string[]> = {};
    let includeThirdPlace = false;
    
    let isActive = true;
    let championPoints = 9;
    let runnerUpPoints = 3;
    let thirdPlacePoints = 1;
    let countSingleClubCategories = true;
    let countWalkoverSingleFightCategories = true;


    if (existingEventData) {
      try {
        const parsedEvent = JSON.parse(existingEventData);
        existingDivisions = parsedEvent.divisions || [];
        existingAthletes = parsedEvent.athletes.map((a: any) => processAthleteData(a, existingDivisions));
        eventSettings = {
          checkInStartTime: parsedEvent.checkInStartTime,
          checkInEndTime: parsedEvent.checkInEndTime,
          numFightAreas: parsedEvent.numFightAreas,
        };
        isAttendanceMandatoryBeforeCheckIn = parsedEvent.isAttendanceMandatoryBeforeCheckIn || false;
        isWeightCheckEnabled = parsedEvent.isWeightCheckEnabled !== undefined ? parsedEvent.isWeightCheckEnabled : true;
        matAssignments = parsedEvent.matAssignments || {};
        isBeltGroupingEnabled = parsedEvent.isBeltGroupingEnabled !== undefined ? parsedEvent.isBeltGroupingEnabled : true;
        isOverweightAutoMoveEnabled = parsedEvent.isOverweightAutoMoveEnabled !== undefined ? parsedEvent.isOverweightAutoMoveEnabled : false;
        existingBrackets = parsedEvent.brackets || {};
        matFightOrder = parsedEvent.matFightOrder || {};
        includeThirdPlace = parsedEvent.includeThirdPlace !== undefined ? parsedEvent.includeThirdPlace : false;
        
        isActive = parsedEvent.isActive !== undefined ? parsedEvent.isActive : true;
        championPoints = parsedEvent.championPoints !== undefined ? parsedEvent.championPoints : 9;
        runnerUpPoints = parsedEvent.runnerUpPoints !== undefined ? parsedEvent.runnerUpPoints : 3;
        thirdPlacePoints = parsedEvent.thirdPlacePoints !== undefined ? parsedEvent.thirdPlacePoints : 1;
        countSingleClubCategories = parsedEvent.countSingleClubCategories !== undefined ? parsedEvent.countSingleClubCategories : true;
        countWalkoverSingleFightCategories = parsedEvent.countWalkoverSingleFightCategories !== undefined ? parsedEvent.countWalkoverSingleFightCategories : true;

      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
      }
    }

    return {
      id: id || 'mock-event-id',
      name: `Evento #${id}`,
      description: `Detalhes do evento ${id} de Jiu-Jitsu.`,
      status: 'Aberto',
      date: '2024-12-01',
      athletes: [...existingAthletes, ...initialImportedAthletes],
      divisions: existingDivisions,
      isAttendanceMandatoryBeforeCheckIn,
      isWeightCheckEnabled,
      matAssignments,
      isBeltGroupingEnabled,
      isOverweightAutoMoveEnabled,
      brackets: existingBrackets,
      matFightOrder,
      includeThirdPlace,
      isActive,
      championPoints,
      runnerUpPoints,
      thirdPlacePoints,
      countSingleClubCategories,
      countWalkoverSingleFightCategories,
      ...eventSettings,
    };
  });

  const [checkInStartTime, setCheckInStartTime] = useState<Date | undefined>(
    event?.checkInStartTime ? parseISO(event.checkInStartTime) : undefined
  );
  const [checkInEndTime, setCheckInEndTime] = useState<Date | undefined>(
    event?.checkInEndTime ? parseISO(event.checkInEndTime) : undefined
  );
  const [numFightAreas, setNumFightAreas] = useState<number>(event?.numFightAreas || 1);
  const [isAttendanceMandatory, setIsAttendanceMandatory] = useState<boolean>(event?.isAttendanceMandatoryBeforeCheckIn || false);
  const [isWeightCheckEnabled, setIsWeightCheckEnabled] = useState<boolean>(event?.isWeightCheckEnabled || true);
  const [isBeltGroupingEnabled, setIsBeltGroupingEnabled] = useState<boolean>(event?.isBeltGroupingEnabled || true);
  const [isOverweightAutoMoveEnabled, setIsOverweightAutoMoveEnabled] = useState<boolean>(event?.isOverweightAutoMoveEnabled || false);
  const [includeThirdPlace, setIncludeThirdPlace] = useState<boolean>(event?.includeThirdPlace || false);
  
  const [isActive, setIsActive] = useState<boolean>(event?.isActive || true);
  const [championPoints, setChampionPoints] = useState<number>(event?.championPoints || 9);
  const [runnerUpPoints, setRunnerUpPoints] = useState<number>(event?.runnerUpPoints || 3);
  const [thirdPlacePoints, setThirdPlacePoints] = useState<number>(event?.thirdPlacePoints || 1);
  const [countSingleClubCategories, setCountSingleClubCategories] = useState<boolean>(event?.countSingleClubCategories || true);
  const [countWalkoverSingleFightCategories, setCountWalkoverSingleFightCategories] = useState<boolean>(event?.countWalkoverSingleFightCategories || true);


  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');


  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${id}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      belt: true,
      weight: true,
      idNumber: true,
      gender: true,
      nationality: true,
      email: true,
      phone: true,
      photo: false,
      emiratesIdFront: false,
      emiratesIdBack: false,
      paymentProof: false,
    };
  }, [id]);

  useEffect(() => {
    if (event) {
      localStorage.setItem(`event_${id}`, JSON.stringify({
        ...event,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas: numFightAreas,
        isAttendanceMandatoryBeforeCheckIn: isAttendanceMandatory,
        isWeightCheckEnabled: isWeightCheckEnabled,
        isBeltGroupingEnabled: isBeltGroupingEnabled,
        isOverweightAutoMoveEnabled: isOverweightAutoMoveEnabled,
        includeThirdPlace: includeThirdPlace,
        isActive: isActive,
        championPoints: championPoints,
        runnerUpPoints: runnerUpPoints,
        thirdPlacePoints: thirdPlacePoints,
        countSingleClubCategories: countSingleClubCategories,
        countWalkoverSingleFightCategories: countWalkoverSingleFightCategories,
      }));
    }
  }, [event, id, checkInStartTime, checkInEndTime, numFightAreas, isAttendanceMandatory, isWeightCheckEnabled, isBeltGroupingEnabled, isOverweightAutoMoveEnabled, includeThirdPlace, isActive, championPoints, runnerUpPoints, thirdPlacePoints, countSingleClubCategories, countWalkoverSingleFightCategories]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // const handleAthleteRegistration = (newAthlete: Athlete) => { // Removed: function not used
  //   if (event) {
  //     setEvent(prevEvent => {
  //       if (!prevEvent) return null;
  //       return {
  //         ...prevEvent,
  //         athletes: [...prevEvent.athletes, newAthlete],
  //       };
  //     });
  //     showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso e aguardando aprovação!`);
  //   }
  // };

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === updatedAthlete.id ? updatedAthlete : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      setEditingAthlete(null);
    }
  };

  const handleDeleteAthlete = (athleteId: string) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.filter(athlete => athlete.id !== athleteId);
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess('Inscrição do atleta removida com sucesso!');
    }
  };

  const handleCheckInAthlete = (updatedAthlete: Athlete) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === updatedAthlete.id
            ? updatedAthlete
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
    }
  };

  const handleUpdateAthleteAttendance = (athleteId: string, status: Athlete['attendanceStatus']) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === athleteId
            ? { ...athlete, attendanceStatus: status }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
    }
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAllAthletes = (checked: boolean) => {
    if (event) {
      const athletesUnderApproval = event.athletes.filter(a => a.registrationStatus === 'under_approval');
      if (checked) {
        setSelectedAthletesForApproval(athletesUnderApproval.map(a => a.id));
      } else {
        setSelectedAthletesForApproval([]);
      }
    }
  };

  const handleApproveSelected = () => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          selectedAthletesForApproval.includes(athlete.id)
            ? { ...athlete, registrationStatus: 'approved' as const }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas com sucesso!`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleRejectSelected = () => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          selectedAthletesForApproval.includes(athlete.id)
            ? { ...athlete, registrationStatus: 'rejected' as const }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleUpdateDivisions = (updatedDivisions: Division[]) => {
    setEvent(prevEvent => {
      if (!prevEvent) return null;
      const updatedAthletes = prevEvent.athletes.map(athlete => {
        const updatedAthlete = { ...athlete };
        updatedAthlete._division = findAthleteDivision(updatedAthlete, updatedDivisions);
        return updatedAthlete;
      });
      let newBrackets = prevEvent.brackets;
      let newMatFightOrder = prevEvent.matFightOrder;
      if (prevEvent.brackets && prevEvent.matAssignments && prevEvent.numFightAreas) {
        const { updatedBrackets: recalculatedBrackets, matFightOrder: recalculatedMatFightOrder } = generateMatFightOrder({
          ...prevEvent,
          divisions: updatedDivisions,
          athletes: updatedAthletes,
        });
        newBrackets = recalculatedBrackets;
        newMatFightOrder = recalculatedMatFightOrder;
      }

      return {
        ...prevEvent,
        divisions: updatedDivisions,
        athletes: updatedAthletes,
        brackets: newBrackets,
        matFightOrder: newMatFightOrder,
      };
    });
  };

  const handleUpdateMatAssignments = (assignments: Record<string, string[]>) => {
    setEvent(prevEvent => {
      if (!prevEvent) return null;
      let newBrackets = prevEvent.brackets;
      let newMatFightOrder = prevEvent.matFightOrder;
      if (prevEvent.brackets && prevEvent.numFightAreas) {
        const { updatedBrackets: recalculatedBrackets, matFightOrder: recalculatedMatFightOrder } = generateMatFightOrder({
          ...prevEvent,
          matAssignments: assignments,
        });
        newBrackets = recalculatedBrackets;
        newMatFightOrder = recalculatedMatFightOrder;
      }

      return {
        ...prevEvent,
        matAssignments: assignments,
        brackets: newBrackets,
        matFightOrder: newMatFightOrder,
      };
    });
  };

  // const handleUpdateBracketsAndFightOrder = (newBrackets: Record<string, Bracket>) => { // Removed: function not used
  //   setEvent(prevEvent => {
  //     if (!prevEvent) return null;
  //     const eventWithNewBrackets = { ...prevEvent, brackets: newBrackets };
      
  //     let newMatFightOrder = prevEvent.matFightOrder;
  //     let finalBrackets = newBrackets;

  //     if (eventWithNewBrackets.matAssignments && eventWithNewBrackets.numFightAreas) {
  //       const { updatedBrackets: recalculatedBrackets, matFightOrder: recalculatedMatFightOrder } = generateMatFightOrder(eventWithNewBrackets);
  //       finalBrackets = recalculatedBrackets;
  //       newMatFightOrder = recalculatedMatFightOrder;
  //     }

  //     return {
  //       ...eventWithNewBrackets,
  //       brackets: finalBrackets,
  //       matFightOrder: newMatFightOrder,
  //     };
  //   });
  // };


  if (!event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Carregando evento...</div>
      </Layout>
    );
  }

  const athletesUnderApproval = event.athletes.filter(a => a.registrationStatus === 'under_approval');
  const approvedAthletes = event.athletes.filter(a => a.registrationStatus === 'approved');
  // const rejectedAthletes = event.athletes.filter(a => a.registrationStatus === 'rejected'); // Removed

  const processedApprovedAthletes = useMemo(() => {
    return approvedAthletes.map(athlete => {
      let division: Division | undefined;
      if (athlete.movedToDivisionId) {
        division = event.divisions.find(d => d.id === athlete.movedToDivisionId);
      } else {
        division = athlete._division;
      }
      return {
        ...athlete,
        _division: division,
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [approvedAthletes, event.divisions]);

  const sortedAthletesUnderApproval = useMemo(() => {
    return athletesUnderApproval.map(athlete => {
      return {
        ...athlete,
        _division: athlete._division,
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [athletesUnderApproval, event.divisions]);

  const allAthletesForInscricoesTab = useMemo(() => {
    let athletes = event.athletes;
    if (userRole === 'coach' && userClub) {
      athletes = athletes.filter(a => a.club === userClub);
    }
    return athletes.map(athlete => {
      let division: Division | undefined;
      if (athlete.movedToDivisionId) {
        division = event.divisions.find(d => d.id === athlete.movedToDivisionId);
      } else {
        division = athlete._division;
      }
      return {
        ...athlete,
        _division: division,
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [event.athletes, event.divisions, userRole, userClub]);

  const coachTotalRegistrations = allAthletesForInscricoesTab.length;
  const coachTotalApproved = allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'approved').length;
  const coachTotalPending = allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'under_approval').length;
  const coachTotalRejected = allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'rejected').length;

  const filteredAthletesForDisplayInscricoes = useMemo(() => {
    let athletesToDisplay = allAthletesForInscricoesTab;

    if (!userRole) {
      athletesToDisplay = athletesToDisplay.filter(a => a.registrationStatus === 'approved');
    } else if (registrationStatusFilter !== 'all') {
      athletesToDisplay = athletesToDisplay.filter(a => a.registrationStatus === registrationStatusFilter);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      athletesToDisplay = athletesToDisplay.filter(athlete =>
        athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    return athletesToDisplay;
  }, [allAthletesForInscricoesTab, searchTerm, registrationStatusFilter, userRole]);


  const isCheckInTimeValid = () => {
    if (!checkInStartTime || !checkInEndTime) return false;
    const now = new Date();
    return now >= checkInStartTime && now <= checkInEndTime;
  };

  const isCheckInAllowedGlobally = userRole === 'admin' || isCheckInTimeValid();

  const filteredAthletesForCheckIn = useMemo(() => {
    let athletesToFilter = processedApprovedAthletes;

    if (isAttendanceMandatory) {
      athletesToFilter = athletesToFilter.filter(a => a.attendanceStatus === 'present');
    }

    if (scannedAthleteId) {
      athletesToFilter = athletesToFilter.filter(athlete => athlete.registrationQrCodeId === scannedAthleteId);
    } else if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      athletesToFilter = athletesToFilter.filter(athlete =>
        athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (checkInFilter === 'pending') {
      return athletesToFilter.filter(a => a.checkInStatus === 'pending');
    } else if (checkInFilter === 'checked_in') {
      return athletesToFilter.filter(a => a.checkInStatus === 'checked_in');
    } else if (checkInFilter === 'overweight') {
      return athletesToFilter.filter(a => a.checkInStatus === 'overweight');
    }
    return athletesToFilter;
  }, [processedApprovedAthletes, searchTerm, scannedAthleteId, checkInFilter, isAttendanceMandatory]);

  const totalOverweights = processedApprovedAthletes.filter(a => a.checkInStatus === 'overweight').length;
  const totalCheckedInOk = processedApprovedAthletes.filter(a => a.checkInStatus === 'checked_in').length;
  const totalPendingCheckIn = processedApprovedAthletes.filter(a => a.checkInStatus === 'pending').length;
  const totalApprovedAthletes = processedApprovedAthletes.length;

  const timeRemainingInSeconds = checkInEndTime ? differenceInSeconds(checkInEndTime, currentTime) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0
    ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${timeRemainingInSeconds % 60}s`
    : 'Encerrado';

  const handleCheckInBoxClick = (filterType: 'pending' | 'checked_in' | 'overweight') => {
    setCheckInFilter(prevFilter => (prevFilter === filterType ? 'all' : filterType));
  };

  const getTranslatedText = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      pt: {
        welcomeMessage: "Bem-vindo ao TatamiPro!",
        generalSettings: "Configurações Gerais",
        languageDemo: "Este é um texto de demonstração para o idioma.",
      },
      en: {
        welcomeMessage: "Welcome to TatamiPro!",
        generalSettings: "General Settings",
        languageDemo: "This is a language demonstration text.",
      },
    };
    return translations[language]?.[key] || key;
  };

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          {userRole === 'admin' && (
            <TabsTrigger value="config">Config</TabsTrigger>
          )}
          <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
          {(userRole && (userRole === 'admin' || !isAttendanceMandatory)) && (
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          )}
          {userRole && <TabsTrigger value="checkin">Check-in</TabsTrigger>}
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="llm">LLM (Q&A)</TabsTrigger>
        </TabsList>

        {userRole === 'admin' && (
          <TabsContent value="config" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Evento</CardTitle>
                <CardDescription>Gerencie as configurações gerais, divisões e tempos de luta do evento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={configSubTab} onValueChange={setConfigSubTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="event-settings">Configurações Gerais</TabsTrigger>
                    <TabsTrigger value="divisions">Divisões ({event.divisions.length})</TabsTrigger>
                    <TabsTrigger value="results-settings">Resultados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="event-settings" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold flex items-center justify-between">
                        {getTranslatedText('generalSettings')}
                        <LanguageToggle />
                      </h3>
                      <p className="text-muted-foreground">{getTranslatedText('languageDemo')}</p>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="event-active"
                          checked={isActive}
                          onCheckedChange={setIsActive}
                        />
                        <Label htmlFor="event-active">Evento Ativo</Label>
                      </div>
                      <h3 className="text-xl font-semibold mt-6">Configurações de Check-in</h3>
                      <div>
                        <Label htmlFor="checkInStartTime">Início do Check-in</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {checkInStartTime ? format(checkInStartTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={checkInStartTime}
                              onSelect={(date) => {
                                if (date) {
                                  const newDate = new Date(date);
                                  if (checkInStartTime) {
                                    newDate.setHours(checkInStartTime.getHours(), checkInStartTime.getMinutes());
                                  } else {
                                    newDate.setHours(9, 0);
                                  }
                                  setCheckInStartTime(newDate);
                                }
                              }}
                              initialFocus
                            />
                            <div className="p-3 border-t border-border">
                              <Input
                                type="time"
                                value={checkInStartTime ? format(checkInStartTime, 'HH:mm') : '09:00'}
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':').map(Number);
                                  if (checkInStartTime) {
                                    const newDate = new Date(checkInStartTime);
                                    newDate.setHours(hours, minutes);
                                    setCheckInStartTime(newDate);
                                  } else {
                                    const newDate = new Date();
                                    newDate.setHours(hours, minutes);
                                    setCheckInStartTime(newDate);
                                  }
                                }}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="checkInEndTime">Fim do Check-in</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {checkInEndTime ? format(checkInEndTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={checkInEndTime}
                              onSelect={(date) => {
                                if (date) {
                                  const newDate = new Date(date);
                                  if (checkInEndTime) {
                                    newDate.setHours(checkInEndTime.getHours(), checkInEndTime.getMinutes());
                                  } else {
                                    newDate.setHours(17, 0);
                                  }
                                  setCheckInEndTime(newDate);
                                }
                              }}
                              initialFocus
                            />
                            <div className="p-3 border-t border-border">
                              <Input
                                type="time"
                                value={checkInEndTime ? format(checkInEndTime, 'HH:mm') : '17:00'}
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':').map(Number);
                                  if (checkInEndTime) {
                                    const newDate = new Date(checkInEndTime);
                                    newDate.setHours(hours, minutes);
                                    setCheckInEndTime(newDate);
                                  } else {
                                    const newDate = new Date();
                                    newDate.setHours(hours, minutes);
                                    setCheckInEndTime(newDate);
                                  }
                                }}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="numFightAreas">Número de Áreas de Luta</Label>
                        <Input
                          id="numFightAreas"
                          type="number"
                          min="1"
                          value={numFightAreas}
                          onChange={(e) => setNumFightAreas(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="attendance-mandatory"
                          checked={isAttendanceMandatory}
                          onCheckedChange={setIsAttendanceMandatory}
                        />
                        <Label htmlFor="attendance-mandatory">Presença obrigatória antes do Check-in</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="weight-check-enabled"
                          checked={isWeightCheckEnabled}
                          onCheckedChange={setIsWeightCheckEnabled}
                        />
                        <Label htmlFor="weight-check-enabled">Habilitar Verificação de Peso no Check-in</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="belt-grouping-enabled"
                          checked={isBeltGroupingEnabled}
                          onCheckedChange={setIsBeltGroupingEnabled}
                        />
                        <Label htmlFor="belt-grouping-enabled">Habilitar Faixa no Agrupamento de Divisões</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="overweight-auto-move-enabled"
                          checked={isOverweightAutoMoveEnabled}
                          onCheckedChange={setIsOverweightAutoMoveEnabled}
                        />
                        <Label htmlFor="overweight-auto-move-enabled">Mover atleta acima do peso para próxima categoria</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-third-place"
                          checked={includeThirdPlace}
                          onCheckedChange={setIncludeThirdPlace}
                        />
                        <Label htmlFor="include-third-place">Incluir Luta pelo 3º Lugar</Label>
                      </div>
                    </div>
                    <CheckInMandatoryFieldsConfig eventId={event.id} />
                  </TabsContent>

                  <TabsContent value="divisions" className="mt-6">
                    <Link to={`/events/${event.id}/import-divisions`}>
                      <Button className="w-full mb-4">Importar Divisões em Lote</Button>
                    </Link>
                    <DivisionTable divisions={event.divisions} onUpdateDivisions={handleUpdateDivisions} />
                  </TabsContent>

                  <TabsContent value="results-settings" className="mt-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold mb-4">Configuração de Pontos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="championPoints">Pontos Campeão</Label>
                          <Input
                            id="championPoints"
                            type="number"
                            min="0"
                            value={championPoints}
                            onChange={(e) => setChampionPoints(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="runnerUpPoints">Pontos Vice-Campeão</Label>
                          <Input
                            id="runnerUpPoints"
                            type="number"
                            min="0"
                            value={runnerUpPoints}
                            onChange={(e) => setRunnerUpPoints(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="thirdPlacePoints">Pontos 3º Lugar</Label>
                          <Input
                            id="thirdPlacePoints"
                            type="number"
                            min="0"
                            value={thirdPlacePoints}
                            onChange={(e) => setThirdPlacePoints(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold mt-6 mb-4">Regras de Contagem de Pontos</h3>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="count-single-club-categories"
                          checked={countSingleClubCategories}
                          onCheckedChange={setCountSingleClubCategories}
                        />
                        <Label htmlFor="count-single-club-categories">Categorias com apenas uma equipe contam pontos</Label>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch
                          id="count-walkover-single-fight-categories"
                          checked={countWalkoverSingleFightCategories}
                          onCheckedChange={setCountWalkoverSingleFightCategories}
                        />
                        <Label htmlFor="count-walkover-single-fight-categories">W.O. em lutas únicas (equipes diferentes) contam pontos</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="inscricoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Inscrições</CardTitle>
              <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={inscricoesSubTab} onValueChange={setInscricoesSubTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="registered-athletes">Atletas Inscritos</TabsTrigger>
                  {userRole && userRole === 'admin' && (
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

                  <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({filteredAthletesForDisplayInscricoes.length})</h3>
                  {filteredAthletesForDisplayInscricoes.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum atleta encontrado com os critérios atuais.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredAthletesForDisplayInscricoes.map((athlete) => (
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
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {(userRole && (userRole === 'admin' || !isAttendanceMandatory)) && (
          <TabsContent value="attendance" className="mt-6">
            <AttendanceManagement
              eventId={event.id}
              eventDivisions={event.divisions}
              onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
            />
          </TabsContent>
        )}

        {userRole && <TabsContent value="checkin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Check-in de Atletas</span>
                <div className="text-sm font-normal text-muted-foreground flex flex-col items-end">
                  <span>Hora Atual: {format(currentTime, 'HH:mm:ss')}</span>
                  <span>Tempo para fechar: {timeRemainingFormatted}</span>
                </div>
              </CardTitle>
              <CardDescription>
                Confirme a presença e o peso dos atletas.
                {!isCheckInTimeValid() && userRole !== 'admin' && (
                  <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
                )}
                {isCheckInTimeValid() && (
                  <span className="text-green-600 block mt-2">Check-in aberto!</span>
                )}
                {!checkInStartTime || !checkInEndTime ? (
                  <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
                ) : (
                  <span className="text-muted-foreground block mt-2">Horário: {format(checkInStartTime, 'dd/MM HH:mm')} - {format(checkInEndTime, 'dd/MM HH:mm')}</span>
                )}
                {isAttendanceMandatory && (
                  <p className="text-orange-500 mt-2">Atenção: A presença é obrigatória antes do check-in. Apenas atletas marcados como 'Presente' aparecerão aqui.</p>
                )}
                {!isWeightCheckEnabled && (
                  <p className="text-blue-500 mt-2">Verificação de peso desabilitada. Todos os atletas serão considerados no peso.</p>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    checkInFilter === 'checked_in' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
                    checkInFilter === 'checked_in' ? 'hover:bg-green-300 dark:hover:bg-green-700' : 'hover:bg-green-100 dark:hover:bg-green-900'
                  )}
                  onClick={() => handleCheckInBoxClick('checked_in')}
                >
                  <p className="text-2xl font-bold text-green-600">{totalCheckedInOk}</p>
                  <p className="text-sm text-muted-foreground">Check-in OK</p>
                </div>
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    checkInFilter === 'overweight' ? 'bg-red-200 dark:bg-red-800 border-red-500' : 'bg-red-50 dark:bg-red-950',
                    checkInFilter === 'overweight' ? 'hover:bg-red-300 dark:hover:bg-red-700' : 'hover:bg-red-100 dark:hover:bg-red-900'
                  )}
                  onClick={() => handleCheckInBoxClick('overweight')}
                >
                  <p className="text-2xl font-bold text-red-600">{totalOverweights}</p>
                  <p className="text-sm text-muted-foreground">Acima do Peso</p>
                </div>
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    checkInFilter === 'pending' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
                    checkInFilter === 'pending' ? 'hover:bg-orange-300 dark:hover:bg-orange-700' : 'hover:bg-orange-100 dark:hover:bg-orange-900'
                  )}
                  onClick={() => handleCheckInBoxClick('pending')}
                >
                  <p className="text-2xl font-bold text-orange-600">{totalPendingCheckIn}</p>
                  <p className="text-sm text-muted-foreground">Faltam</p>
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
                  <p className="text-sm text-muted-foreground">Total Aprovados</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <QrCodeScanner onScanSuccess={(qrCodeId) => {
                    const athlete = processedApprovedAthletes.find(a => a.registrationQrCodeId === qrCodeId);
                    if (athlete) {
                      setScannedAthleteId(qrCodeId);
                      setSearchTerm('');
                      showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} escaneado!`);
                    } else {
                      showError('QR Code não reconhecido ou atleta não encontrado.');
                      setScannedAthleteId(null);
                    }
                  }} />
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Buscar atleta (nome, clube, divisão...)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setScannedAthleteId(null);
                    }}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {filteredAthletesForCheckIn.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado para check-in encontrado com os critérios atuais.</p>
              ) : (
                <ul className="space-y-4">
                  {filteredAthletesForCheckIn.map((athlete) => (
                    <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                      <div className="flex items-center space-x-3 flex-grow">
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
                          {athlete.registeredWeight && (
                            <p className="text-xs text-gray-500">Último peso: <span className="font-semibold">{athlete.registeredWeight}kg</span></p>
                          )}
                          {athlete.moveReason && (
                            <p className="text-xs text-blue-500">
                              <span className="font-semibold">Movido:</span> {athlete.moveReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {athlete.checkInStatus === 'checked_in' && (
                            <span className="flex items-center text-green-600 font-semibold text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Check-in OK
                            </span>
                          )}
                          {athlete.checkInStatus === 'overweight' && (
                            <span className="flex items-center text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4 mr-1" /> Acima do Peso ({athlete.registeredWeight}kg)
                            </span>
                          )}
                          {athlete.checkInStatus === 'pending' && (
                            <span className="flex items-center text-orange-500 font-semibold text-sm">
                              <Scale className="h-4 w-4 mr-1" /> Pendente
                            </span>
                          )}
                        </div>
                        <CheckInForm
                          athlete={athlete}
                          onCheckIn={handleCheckInAthlete}
                          isCheckInAllowed={isCheckInAllowedGlobally && (isAttendanceMandatory ? athlete.attendanceStatus === 'present' : true)}
                          divisionMaxWeight={athlete._division?.maxWeight}
                          isWeightCheckEnabled={isWeightCheckEnabled}
                          isOverweightAutoMoveEnabled={isOverweightAutoMoveEnabled}
                          eventDivisions={event.divisions}
                          isBeltGroupingEnabled={isBeltGroupingEnabled}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>}

        <TabsContent value="brackets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brackets</CardTitle>
              <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              {userRole && <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Distribuição dos Mats</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Configurar Distribuição dos Mats</DialogTitle>
                    </DialogHeader>
                    <MatDistribution
                      event={event}
                      onUpdateMatAssignments={handleUpdateMatAssignments}
                      isBeltGroupingEnabled={isBeltGroupingEnabled}
                    />
                  </DialogContent>
                </Dialog>
                <Link to={`/events/${event.id}/generate-brackets`}>
                  <Button className="w-full" variant="secondary">
                    <LayoutGrid className="mr-2 h-4 w-4" /> Gerar Brackets
                  </Button>
                </Link>
                <Button className="w-full" variant="outline" onClick={() => navigate(`/events/${event.id}/manage-fights`)}>
                  <Swords className="mr-2 h-4 w-4" /> Gerenciar Lutas
                </Button>
              </div>}
              {event.brackets && Object.keys(event.brackets).length > 0 ? (
                <div className="space-y-4 mt-6">
                  <h3 className="text-xl font-semibold">Brackets Gerados</h3>
                  {Object.values(event.brackets).map(bracket => {
                    const division = event.divisions.find(d => d.id === bracket.divisionId);
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
              ) : (
                <p className="text-muted-foreground mt-4">Nenhum bracket gerado ainda. {userRole && 'Clique em "Gerar Brackets" para começar.'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resultados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>Marque vencedores e exporte resultados.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Resultados para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas & Respostas (LLM)</CardTitle>
              <CardDescription>Faça perguntas sobre os dados do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba LLM (stub) para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default EventDetail;