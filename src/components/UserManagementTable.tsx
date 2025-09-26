"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Edit, Save, XCircle, Trash2 } from 'lucide-react';
import { User } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const UserManagementTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [currentEditUser, setCurrentEditUser] = useState<Partial<User> | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    email: '',
    password: '',
    role: 'athlete',
    club: '',
    isActive: true,
    name: '',
  });

  useEffect(() => {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.role || !newUser.name) {
      showError('Por favor, preencha todos os campos obrigatórios para o novo usuário.');
      return;
    }
    if (users.some(u => u.email === newUser.email)) {
      showError('Já existe um usuário com este email.');
      return;
    }

    const userToAdd: User = {
      id: uuidv4(),
      email: newUser.email,
      password: newUser.password, // Em um app real, a senha seria hashed
      role: newUser.role,
      club: newUser.club || (newUser.role === 'admin' ? 'Tatamipro HQ' : 'Clube Padrão'),
      isActive: newUser.isActive ?? true,
      name: newUser.name,
    };

    setUsers(prev => [...prev, userToAdd]);
    showSuccess('Usuário adicionado com sucesso!');
    setNewUser({ email: '', password: '', role: 'athlete', club: '', isActive: true, name: '' });
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setCurrentEditUser({ ...user });
  };

  const handleSaveEdit = () => {
    if (currentEditUser && currentEditUser.id) {
      if (!currentEditUser.email || !currentEditUser.role || !currentEditUser.name) {
        showError('Por favor, preencha todos os campos obrigatórios para a edição.');
        return;
      }
      setUsers(prev => prev.map(u => u.id === currentEditUser.id ? { ...u, ...currentEditUser } as User : u));
      showSuccess('Usuário atualizado com sucesso!');
      setEditingUserId(null);
      setCurrentEditUser(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setCurrentEditUser(null);
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    showSuccess('Usuário removido com sucesso!');
  };

  const handleToggleActive = (id: string, checked: boolean) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: checked } : u));
    showSuccess(`Usuário ${checked ? 'ativado' : 'inativado'} com sucesso!`);
  };

  const roles: User['role'][] = ['admin', 'coach', 'staff', 'athlete'];

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg shadow-sm bg-muted/40">
        <h4 className="text-lg font-semibold mb-4">Adicionar Novo Usuário</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="newUserName">Nome</Label>
            <Input id="newUserName" value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="newEmail">Email</Label>
            <Input id="newEmail" type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="newPassword">Senha (apenas para mock)</Label>
            <Input id="newPassword" type="password" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="newRole">Papel</Label>
            <Select value={newUser.role} onValueChange={(value: User['role']) => setNewUser(prev => ({ ...prev, role: value }))}>
              <SelectTrigger id="newRole"><SelectValue placeholder="Selecione o papel" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="newClub">Clube (opcional)</Label>
            <Input id="newClub" value={newUser.club} onChange={(e) => setNewUser(prev => ({ ...prev, club: e.target.value }))} />
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <Switch
              id="newIsActive"
              checked={newUser.isActive ?? true}
              onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="newIsActive">Ativo</Label>
          </div>
        </div>
        <Button onClick={handleAddUser} className="mt-4 w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
        </Button>
      </div>

      <h3 className="text-xl font-semibold mb-4">Usuários Existentes ({users.length})</h3>
      {users.length === 0 ? (
        <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Clube</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {editingUserId === user.id && currentEditUser ? (
                    <>
                      <TableCell><Input value={currentEditUser.name} onChange={(e) => setCurrentEditUser(prev => prev ? { ...prev, name: e.target.value } : null)} /></TableCell>
                      <TableCell><Input value={currentEditUser.email} onChange={(e) => setCurrentEditUser(prev => prev ? { ...prev, email: e.target.value } : null)} /></TableCell>
                      <TableCell>
                        <Select value={currentEditUser.role} onValueChange={(value: User['role']) => setCurrentEditUser(prev => prev ? { ...prev, role: value } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input value={currentEditUser.club} onChange={(e) => setCurrentEditUser(prev => prev ? { ...prev, club: e.target.value } : null)} /></TableCell>
                      <TableCell>
                        <Switch
                          checked={currentEditUser.isActive ?? true}
                          onCheckedChange={(checked) => setCurrentEditUser(prev => prev ? { ...prev, isActive: checked } : null)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</TableCell>
                      <TableCell>{user.club}</TableCell>
                      <TableCell>{user.isActive ? 'Sim' : 'Não'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
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
                                Esta ação não pode ser desfeita. Isso removerá permanentemente o usuário {user.name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(user.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default UserManagementTable;