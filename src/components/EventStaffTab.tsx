"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface EventStaffTabProps {
  eventId: string;
}

interface StaffMember {
  id: string; // event_staff id
  user_id: string;
  role: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string; // Note: We might need a secure way to get email if not in profile, usually RLS blocks accessing auth.users. 
                   // Ideally, profile should have email or we assume admin knows it.
                   // For this demo, let's assume we can fetch names from profile.
  };
}

const EventStaffTab: React.FC<EventStaffTabProps> = ({ eventId }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState('staff');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [eventId]);

  const fetchStaff = async () => {
    setLoading(true);
    // Fetch event_staff joined with profiles
    const { data, error } = await supabase
      .from('event_staff')
      .select(`
        id,
        user_id,
        role,
        profile:profiles(first_name, last_name)
      `)
      .eq('event_id', eventId);

    if (error) {
      showError('Failed to load staff: ' + error.message);
    } else {
      setStaff(data as any || []);
    }
    setLoading(false);
  };

  const generateTempPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  };

  useEffect(() => {
    if (isDialogOpen) generateTempPassword();
  }, [isDialogOpen]);

  const handleAddStaff = async () => {
    const toastId = showLoading('Criando usuário e vinculando ao evento...');
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: tempPassword,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          eventId: eventId,
          role: newUserRole
        }
      });

      if (error) throw new Error(error.message || 'Erro na função Edge');
      if (data?.error) throw new Error(data.error);

      dismissToast(toastId);
      showSuccess(`Usuário adicionado! Senha temporária: ${tempPassword}`);
      // NOTE: In a real app, you might email this or show it prominently.
      alert(`IMPORTANTE: Copie a senha temporária para enviar ao usuário:\n\nEmail: ${newUserEmail}\nSenha: ${tempPassword}`);
      
      setIsDialogOpen(false);
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      fetchStaff();
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    if (!confirm('Remover este membro da equipe? O usuário não terá mais acesso a este evento.')) return;

    const { error } = await supabase.from('event_staff').delete().eq('id', id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Membro removido.');
      fetchStaff();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Equipe do Evento</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Adicionar Membro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Membro da Equipe</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome</Label>
                    <Input id="firstName" value={newUserFirstName} onChange={e => setNewUserFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input id="lastName" value={newUserLastName} onChange={e => setNewUserLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff Geral</SelectItem>
                      <SelectItem value="referee">Árbitro</SelectItem>
                      <SelectItem value="table">Mesário</SelectItem>
                      <SelectItem value="medical">Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <Label>Senha Temporária (Gerada Automaticamente)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-background px-2 py-1 rounded border flex-1">{tempPassword}</code>
                    <Button type="button" variant="ghost" size="sm" onClick={generateTempPassword}>Regerar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">O usuário deverá trocar esta senha no primeiro login.</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddStaff} disabled={!newUserEmail || !newUserFirstName}>Criar e Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>Gerencie quem tem acesso administrativo a este evento específico.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
            ) : staff.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum membro adicional na equipe.</TableCell></TableRow>
            ) : (
              staff.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>{member.profile?.first_name} {member.profile?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EventStaffTab;