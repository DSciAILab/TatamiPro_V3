"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name is required.'),
  last_name: z.string().min(2, 'Last name is required.'),
  club: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface Club {
  id: string;
  name: string;
}

const Profile: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  const { register, handleSubmit, reset, setValue, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (profile) {
      reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        club: profile.club || undefined,
      });
    }
  }, [user, profile, authLoading, navigate, reset]);

  useEffect(() => {
    const fetchClubs = async () => {
      setLoadingClubs(true);
      const { data, error } = await supabase.from('clubs').select('id, name').order('name');
      if (error) {
        showError('Failed to load clubs: ' + error.message);
      } else {
        setClubs(data || []);
      }
      setLoadingClubs(false);
    };
    fetchClubs();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    const toastId = showLoading('Updating profile...');
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        club: data.club,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    dismissToast(toastId);
    if (error) {
      showError('Failed to update profile: ' + error.message);
    } else {
      showSuccess('Profile updated successfully!');
      reset(data);
    }
  };

  if (authLoading || loadingClubs) {
    return <Layout><div>Loading profile...</div></Layout>;
  }

  return (
    <Layout>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your personal information and club affiliation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register('first_name')} />
              {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register('last_name')} />
              {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="club">Club</Label>
              <Select onValueChange={(value) => setValue('club', value, { shouldDirty: true })} defaultValue={profile?.club || undefined}>
                <SelectTrigger id="club">
                  <SelectValue placeholder="Select your club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map(club => (
                    <SelectItem key={club.id} value={club.name}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={!isDirty}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Profile;