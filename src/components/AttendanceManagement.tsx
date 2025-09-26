"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, Division } from '@/types/index'; // Importar Division
import { UserRound, CheckCircle, XCircle, Car, Search } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';

interface AttendanceManagementProps {
  eventId: string;
  eventDivisions: Division[]; // Tipo corrigido para Division[]
  onUpdateAthleteAttendance: (athleteId: string, status: Athlete['attendanceStatus']) => void;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ eventId, eventDivisions, onUpdateAthleteAttendance }) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const userClub = localStorage.getItem('userClub'); // Mock do clube do usuário logado
  const userRole = localStorage.getItem('userRole'); // Mock do papel do usuário logado

  useEffect(() => {
    const fetchAthletesForAttendance = async () => {
      if (!eventId || !userClub) return;

      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('event_id', eventId)
        .eq('club', userClub)
        .eq('registration_status', 'approved');

      if (error) {
        console.error("Erro ao buscar atletas para gerenciamento de presença:", error);
        showError("Erro ao carregar atletas para gerenciamento de presença.");
        setAthletes([]);
      } else {
        const processedAthletes = (data || []).map(a => ({
          ...a,
          dateOfBirth: parseISO(a.date_of_birth),
          consentDate: parseISO(a.consent_date),
          weightAttempts: a.weight_attempts || [],
        }));
        setAthletes(processedAthletes);
      }
    };

    fetchAthletesForAttendance();
  }, [eventId, userClub, onUpdateAthleteAttendance]);

  const handleAttendanceChange = (athleteId: string, status: Athlete['attendanceStatus']) => {
    onUpdateAthleteAttendance(athleteId, status); // Delega a atualização para o pai (EventDetail) que irá persistir no Supabase
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, attendanceStatus: status } : a));
    showSuccess(`Status de presença atualizado para ${status}.`);
  };

  const filteredAthletes = useMemo(() => {
    if (!searchTerm) {
      return athletes;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return athletes.filter(athlete =>
      athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
      athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
      athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
      athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
      athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
      athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [athletes, searchTerm]);

  if (userRole !== 'coach' && userRole !== 'staff' && userRole !== 'admin') { // Admin também pode gerenciar
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

  if (!userClub) {
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Gerenciamento de Presença (Clube: {userClub})</CardTitle>
        <CardDescription>Marque a presença dos atletas do seu clube para o evento.</CardDescription>
      </CardHeader>
      <CardContent>
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

        {filteredAthletes.length === 0 ? (
          <p className="text-muted-foreground">Nenhum atleta aprovado do seu clube encontrado.</p>
        ) : (
          <ul className="space-y-4">
            {filteredAthletes.map((athlete) => {
              const division = findAthleteDivision(athlete, eventDivisions);
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