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
import { Trash2, UserPlus, Shield, FileUp } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { usePermission } from '@/hooks/use-permission';
import Papa from 'papaparse';

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
    email: string;
  };
}

const EventStaffTab: React.FC<EventStaffTabProps> = ({ eventId }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Use RBAC Hook
  const { can } = usePermission();
  const canManageStaff = can('staff.manage');

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
      await createUserAndAssign(newUserEmail, tempPassword, newUserFirstName, newUserLastName, newUserRole);

      dismissToast(toastId);
      showSuccess(`Usuário adicionado! Senha temporária: ${tempPassword}`);
      alert(`IMPORTANTE: Copie a senha temporária para enviar ao usuário:\n\nEmail: ${newUserEmail}\nSenha: ${tempPassword}`);
      
      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message);
    }
  };

  const createUserAndAssign = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email,
        password,
        firstName,
        lastName,
        eventId: eventId,
        role
      }
    });

    if (error) throw new Error(error.message || 'Erro na função Edge');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const resetForm = () => {
    setNewUserEmail('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserRole('staff');
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

  // CSV Import Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          showError('Erro ao ler CSV: ' + results.errors[0].message);
          return;
        }
        
        // Expected columns: email, firstName, lastName, role
        const rows = results.data as any[];
        if (rows.length === 0) {
          showError('O arquivo CSV está vazio.');
          return;
        }

        const confirmImport = window.confirm(`Encontrados ${rows.length} usuários. Deseja importar?`);
        if (!confirmImport) return;

        setIsImportDialogOpen(false);
        const toastId = showLoading(`Processando 0/${rows.length} usuários...`);
        let successCount = 0;
        let failCount = 0;
        const generatedPasswords: string[] = [];

        // Generate a standard base password for the batch if desired, or random for each
        // Let's use random for security, but maybe we should export a CSV with passwords?
        // For simplicity now, we'll alert the results.

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const email = row.email || row.Email;
          const firstName = row.firstName || row.Nome || '';
          const lastName = row.lastName || row.Sobrenome || '';
          const role = row.role || row.Funcao || 'staff';
          
          if (!email) {
            failCount++;
            continue;
          }

          const password = "Mudar123!"; // Default temp password for batch import to make onboarding easier
          
          try {
            await createUserAndAssign(email, password, firstName, lastName, role);
            successCount++;
            generatedPasswords.push(`${email}: ${password}`);
          } catch (err) {
            console.error(`Falha ao importar ${email}:`, err);
            failCount++;
          }
          
          // Update toast
          // Note: standard sonner/toast might not support dynamic update easily without ID, 
          // but we can just let it spin or try to update if the lib supports it.
        }

        dismissToast(toastId);
        showSuccess(`Importação concluída! Sucesso: ${successCount}, Falhas: ${failCount}`);
        alert(`Importação em lote finalizada.\n\nSenha padrão definida para todos os novos usuários: "Mudar123!"\n\nPor favor, instrua os usuários a trocarem a senha no primeiro acesso.`);
        fetchStaff();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Equipe do Evento</span>
          <div className="flex gap-2">
            {canManageStaff && (
              <>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Importar CSV</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Importar Equipe em Lote</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Carregue um arquivo CSV com as colunas: <strong>email, firstName, lastName, role</strong>.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        A senha padrão temporária para todos os usuários importados será <code>Mudar123!</code>.
                      </p>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv-upload">Arquivo CSV</Label>
                        <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

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
              </>
            )}
          </div>
        </CardTitle>
        <CardDescription>Gerencie quem tem acesso administrativo a este evento específico.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              {canManageStaff && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={canManageStaff ? 3 : 2} className="text-center">Carregando...</TableCell></TableRow>
            ) : staff.length === 0 ? (
              <TableRow><TableCell colSpan={canManageStaff ? 3 : 2} className="text-center text-muted-foreground">Nenhum membro adicional na equipe.</TableCell></TableRow>
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
                  {canManageStaff && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  )}
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