"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Role } from '@/config/permissions';

interface ManagedUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  is_approved: boolean;
  // We will fetch email separately as it's in auth.users
  email?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // NOTE: This requires an admin-level function to get emails for all users.
    // For now, we'll fetch profiles and then emails for those profiles.
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, is_approved');

    if (profileError) {
      showError('Failed to load users: ' + profileError.message);
      setLoading(false);
      return;
    }
    
    // This is inefficient but works for a small number of users.
    // A better approach for large scale would be an edge function.
    const usersWithEmails = await Promise.all(profiles.map(async (p) => {
        const { data: { user }, error } = await supabase.auth.admin.getUserById(p.id);
        return { ...p, email: error ? 'N/A' : user?.email };
    }));

    setUsers(usersWithEmails);
    setLoading(false);
  };

  const handleApprovalChange = async (userId: string, is_approved: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved })
      .eq('id', userId);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`User ${is_approved ? 'approved' : 'unapproved'}.`);
      fetchUsers();
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`User role updated.`);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    
    const toastId = showLoading('Deleting user...');
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      dismissToast(toastId);
      showSuccess('User deleted successfully.');
      fetchUsers();
    } catch (err: any) {
      dismissToast(toastId);
      showError('Failed to delete user: ' + err.message);
    }
  };

  const roleOptions: Role[] = ['admin', 'staff', 'coach', 'athlete', 'scoreboard', 'bracket_manager', 'checkin', 'results'];

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Approve new users and manage their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading users...</TableCell></TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(value: Role) => handleRoleChange(user.id, value)}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_approved}
                        onCheckedChange={(checked) => handleApprovalChange(user.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
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
    </Layout>
  );
};

export default UserManagement;