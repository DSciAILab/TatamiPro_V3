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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadFile } from '@/integrations/supabase/storage';
import { User as UserIcon } from 'lucide-react';

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
      setAvatarPreview(profile.avatar_url);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    const toastId = showLoading('Updating profile...');
    try {
      let avatar_url = profile?.avatar_url;

      if (avatarFile) {
        avatar_url = await uploadFile(avatarFile, 'avatars', `public/${user.id}`);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          club: data.club,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Profile updated successfully!');
      reset(data); // Resets dirty state
      setAvatarFile(null); // Clear file input state
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to update profile: ' + error.message);
    }
  };

  if (authLoading || loadingClubs) {
    return <Layout><div>Loading profile...</div></Layout>;
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  return (
    <Layout>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your personal information and club affiliation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} alt="User avatar" />
                <AvatarFallback className="text-3xl">
                  {profile ? getInitials(profile.first_name, profile.last_name) : <UserIcon />}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary hover:underline">
                Change Avatar
              </Label>
              <Input id="avatar-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={!isDirty && !avatarFile}>Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Profile;