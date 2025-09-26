"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Athlete, Event } from '@/types/index';
import { UserRound, CheckCircle, XCircle, Car, Search, Clock, Edit } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { findAthleteDivision, getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';

interface AttendanceManagementProps {
  eventId: string;
  eventDivisions: Event['divisions'];
  onUpdateAthleteAttendance: (athleteId: string, status: Athlete['attendanceStatus']) => void;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ eventId, eventDivisions, onUpdateAthleteAttendance }) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'private_transportation' | 'pending'>('all');
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const userClub = localStorage.getItem('userClub');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const existingEventData = localStorage.getItem(`event_${eventId}`);
    if (existingEventData) {
      try {
        const parsedEvent: Event = JSON.parse(existingEventData);
        const filteredAthletes = userRole === 'admin'
          ? parsedEvent.athletes.filter(a => a.registrationStatus === 'approved')
          : parsedEvent.athletes.filter(
              a => a.club === userClub && a.registrationStatus === 'approved'
            );
        setAthletes(filteredAthletes);
      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
        showError("Erro ao carregar atletas para gerenciamento de presença.");
      }
    }
  }, [eventId, userClub, userRole, onUpdateAthleteAttendance]);

  const handleAttendanceChange = (athleteId: string, status: Athlete['attendanceStatus']) => {
    onUpdateAthleteAttendance(athleteId, status);
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, attendanceStatus: status } : a));
    showSuccess(`Status de presença atualizado para ${status}.`);
    setEditingAthleteId(null);
  };

  const filteredAthletes = useMemo(() => {
    let currentAthletes = athletes;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentAthletes = currentAthletes.filter(athlete =>
        athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (attendanceFilter !== 'all') {
      currentAthletes = currentAthletes.filter(athlete => athlete.attendanceStatus === attendanceFilter);
    }

    return currentAthletes;
  }, [athletes, searchTerm, attendanceFilter]);

  const totalPresent = athletes.filter(a => a.attendanceStatus === 'present').length;
  const totalAbsent = athletes.filter(a => a.attendanceStatus === 'absent').length;
  const totalPrivateTransportation = athletes.filter(a => a.attendanceStatus === 'private_transportation').length;
  const totalMissing = athletes.filter(a => a.attendanceStatus === 'pending').length;

  if (userRole !== 'coach' && userRole !== 'staff' && userRole !== 'admin') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>Você não tem permissão para acessar esta seção.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Apenas administradores, coaches e staff podem gerenciar a presença dos atletas.</p>
        </CardContent>
      </Card>
    );
  }

  if (!userClub && userRole !== 'admin') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Clube Não Associado</CardTitle>
          <CardDescription>Sua conta não está associada a um clube.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Por favor, entre em contato com o administrador para associar sua conta a um clube.</p>
        </CardContent>
      </Card>
    );
  }

  const getAttendanceStatusDisplay = (status: Athlete['attendanceStatus']) => {
    switch (status) {
      case 'present': return <span className="flex items-center text-green-600 font-semibold text-sm"><CheckCircle className="h-4 w-4 mr-1" /> Presente</span>;
      case 'absent': return <span className="flex items-center text-red-600 font-semibold text-sm"><XCircle className="h-4 w-4 mr-1" /> Ausente</span>;
      case 'private_transportation': return <span className="flex items-center text-blue-600 font-semibold text-sm"><Car className="h-4 w-4 mr-1" /> Transp. Privado</span>;
      case 'pending': return <span className="flex items-center text-orange-500 font-semibold text-sm"><Clock className="h-4 w-4 mr-1" /> Faltando</span>;
      default: return <span className="text-muted-foreground text-sm">Desconhecido</span>;
    }
  };

  const handleAttendanceBoxClick = (filterType: 'present' | 'absent' | 'private_transportation' | 'pending') => {
    setAttendanceFilter(prevFilter => (prevFilter === filterType ? 'all' : filterType));
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Gerenciamento de Presença {userRole !== 'admin' && userClub ? `(Clube: ${userClub})` : '(Todos os Clubes)'}</CardTitle>
        <CardDescription>Marque a presença dos atletas {userRole !== 'admin' && userClub ? 'do seu clube' : ''} para o evento.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              attendanceFilter === 'present' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
              attendanceFilter === 'present' ? 'hover:bg-green-300 dark:hover:bg-green-700' : 'hover:bg-green-100 dark:hover:bg-green-900'
            )}
            onClick={() => handleAttendanceBoxClick('present')}
          >
            <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
            <p className="text-sm text-muted-foreground">Presentes</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              attendanceFilter === 'absent' ? 'bg-red-200 dark:bg-red-800 border-red-500' : 'bg-red-50 dark:bg-red-950',
              attendanceFilter === 'absent' ? 'hover:bg-red-300 dark:hover:bg-red-700' : 'hover:bg-red-100 dark:hover:bg-red-900'
            )}
            onClick={() => handleAttendanceBoxClick('absent')}
          >
            <p className="text-2xl font-bold text-red-600">{totalAbsent}</p>
            <p className="text-sm text-muted-foreground">Ausentes</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              attendanceFilter === 'private_transportation' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
              attendanceFilter === 'private_transportation' ? 'hover:bg-blue-300 dark:hover:bg-blue-700' : 'hover:bg-blue-100 dark:hover:bg-blue-900'
            )}
            onClick={() => handleAttendanceBoxClick('private_transportation')}
          >
            <p className="text-2xl font-bold text-blue-600">{totalPrivateTransportation}</p>
            <p className="text-sm text-muted-foreground">Transp. Privado</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              attendanceFilter === 'pending' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
              attendanceFilter === 'pending' ? 'hover:bg-orange-300 dark:hover:bg-orange-700' : 'hover:bg-orange-100 dark:hover:bg-orange-900'
            )}
            onClick={() => handleAttendanceBoxClick('pending')}
          >
            <p className="text-2xl font-bold text-orange-600">{totalMissing}</p>
            <p className="text-sm text-muted-foreground">Faltando</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Input
            type="text"
            placeholder="Buscar atleta (nome, faixa, divisão...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* REMOVIDO: O ToggleGroup de filtro segmentado */}

        {filteredAthletes.length === 0 ? (
          <p className="text-muted-foreground">Nenhum atleta aprovado {userRole !== 'admin' && userClub ? 'do seu clube' : ''} encontrado com os critérios atuais.</p>
        ) : (
          <ul className="space-y-4">
            {filteredAthletes.map((athlete) => {
              const division = findAthleteDivision(athlete, eventDivisions);
              const hasAttendanceStatus = athlete.attendanceStatus !== 'pending';
              const isCurrentlyEditing = editingAthleteId === athlete.id;

              return (
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
                      <p className="font-medium">{athlete.firstName} {athlete.lastName}</p>
                      <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, division)}</p>
                      <p className="text-xs text-gray-500">Status Inscrição: <span className="font-semibold text-green-600">Aprovado</span></p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasAttendanceStatus && !isCurrentlyEditing ? (
                      <>
                        {getAttendanceStatusDisplay(athlete.attendanceStatus)}
                        <Button variant="outline" size="sm" onClick={() => setEditingAthleteId(athlete.id)}>
                          <Edit className="mr-1 h-3 w-3" /> Editar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant={athlete.attendanceStatus === 'present' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(athlete.id, 'present')}
                          size="sm"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" /> Presente
                        </Button>
                        <Button
                          variant={athlete.attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => handleAttendanceChange(athlete.id, 'absent')}
                          size="sm"
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Ausente
                        </Button>
                        <Button
                          variant={athlete.attendanceStatus === 'private_transportation' ? 'secondary' : 'outline'}
                          onClick={() => handleAttendanceChange(athlete.id, 'private_transportation')}
                          size="sm"
                        >
                          <Car className="mr-1 h-4 w-4" /> Transp. Privado
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;