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
import { Trash2, UserPlus, Shield, FileUp, Edit, KeyRound, RefreshCw, Copy } from 'lucide-react';
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
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Editing State
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [newGeneratedPassword, setNewGeneratedPassword] = useState('');
  
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

  const generateRandomPasswordString = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  useEffect(() => {
    if (isAddDialogOpen) setTempPassword(generateRandomPasswordString());
  }, [isAddDialogOpen]);

  const handleAddStaff = async () => {
    const toastId = showLoading('Criando usuário e vinculando ao evento...');
    
    try {
      await createUserAndAssign(newUserEmail, tempPassword, newUserFirstName, newUserLastName, newUserRole);

      dismissToast(toastId);
      showSuccess(`Usuário adicionado!`);
      alert(`IMPORTANTE: Copie a senha temporária para enviar ao usuário:\n\nEmail: ${newUserEmail}\nSenha: ${tempPassword}`);
      
      setIsAddDialogOpen(false);
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

  // Edit Handlers
  const handleOpenEdit = (member: StaffMember) => {
    setEditingMember(member);
    setEditFirstName(member.profile?.first_name || '');
    setEditLastName(member.profile?.last_name || '');
    setEditRole(member.role);
    setNewGeneratedPassword('');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    const toastId = showLoading('Salvando alterações...');

    try {
      // 1. Update Role in event_staff
      if (editRole !== editingMember.role) {
        const { error: roleError } = await supabase
          .from('event_staff')
          .update({ role: editRole })
          .eq('id', editingMember.id);
        if (roleError) throw roleError;
      }

      // 2. Update Profile Name
      if (editFirstName !== editingMember.profile?.first_name || editLastName !== editingMember.profile?.last_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            first_name: editFirstName,
            last_name: editLastName
          })
          .eq('id', editingMember.user_id);
        if (profileError) throw profileError;
      }

      dismissToast(toastId);
      showSuccess('Membro atualizado com sucesso!');
      setIsEditDialogOpen(false);
      fetchStaff();
    } catch (err: any) {
      dismissToast(toastId);
      showError('Erro ao atualizar: ' + err.message);
    }
  };

  const handleRegeneratePassword = async () => {
    if (!editingMember) return;
    const newPass = generateRandomPasswordString();
    setNewGeneratedPassword(newPass);

    const toastId = showLoading('Redefinindo senha...');
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: editingMember.user_id, newPassword: newPass }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      dismissToast(toastId);
      showSuccess('Senha redefinida com sucesso.');
    } catch (err: any) {
      dismissToast(toastId);
      showError('Erro ao redefinir senha: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copiado!');
  };

  // CSV Import Handler (kept same)
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

          const password = "Mudar123!";
          
          try {
            await createUserAndAssign(email, password, firstName, lastName, role);
            successCount++;
          } catch (err) {
            console.error(`Falha ao importar ${email}:`, err);
            failCount++;
          }
        }

        dismissToast(toastId);
        showSuccess(`Importação concluída! Sucesso: ${successCount}, Falhas: ${failCount}`);
        alert(`Importação em lote finalizada.\n\nSenha padrão definida para todos os novos usuários: "Mudar123!"`);
        fetchStaff();
      }
    });
  };

  const renderRoleOptions = () => (
    <>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="scoreboard">Scoreboard (Placar)</SelectItem>
      <SelectItem value="bracket_manager">Bracket (Chaves)</SelectItem>
      <SelectItem value="checkin">Check-in</SelectItem>
      <SelectItem value="results">Results (Resultados)</SelectItem>
    </>
  );

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

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                            {renderRoleOptions()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-muted p-3 rounded-md">
                        <Label>Senha Temporária (Gerada Automaticamente)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-background px-2 py-1 rounded border flex-1">{tempPassword}</code>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setTempPassword(generateRandomPasswordString())}>Regerar</Button>
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
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} className="mr-2">
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro da Equipe</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input value={editLastName} onChange={e => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Função</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {renderRoleOptions()}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 mt-2">
              <Label className="flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4" /> Acesso e Segurança</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegeneratePassword} className="w-full">
                  <RefreshCw className="mr-2 h-3 w-3" /> Regerar Senha
                </Button>
              </div>
              {newGeneratedPassword && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-md">
                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Nova Senha Temporária:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono bg-background px-2 rounded border flex-1">{newGeneratedPassword}</code>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(newGeneratedPassword)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Envie esta senha para o usuário imediatamente.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventStaffTab;