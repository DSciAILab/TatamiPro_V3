"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Loader2, CheckCircle, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Division } from '@/types/index';
import QrCodeGenerator from '@/components/QrCodeGenerator';

// Validation schema
const registrationSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(8, "Invalid phone number"),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  club: z.string().min(2, "Team/Club is required"),
  division_id: z.string().min(1, "Please select a division"),
  weight: z.coerce.number().min(1, "Please enter your approximate weight"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const PublicRegistration: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [eventName, setEventName] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [success, setSuccess] = useState(false);
  const [registeredAthleteId, setRegisteredAthleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const qrRef = React.useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        // Buscar Evento
        const { data: event, error: eventError } = await supabase
          .from('sjjp_events')
          .select('name, is_active')
          .eq('id', eventId)
          .single();
        
        if (eventError || !event) throw new Error("Event not found.");
        if (!event.is_active) throw new Error("Registrations for this event are closed.");
        
        setEventName(event.name);

        // Buscar Divisões
        const { data: divs, error: divError } = await supabase
          .from('sjjp_divisions')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_enabled', true);

        if (divError) throw divError;
        setDivisions(divs || []);

      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoadingPage(false);
      }
    };
    fetchData();
  }, [eventId]);

  const onSubmit = async (data: RegistrationFormValues) => {
    const toastId = showLoading('Submitting registration...');
    try {
      const selectedDivision = divisions.find(d => d.id === data.division_id);
      
      const payload = {
        eventId,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        divisionId: data.division_id,
        club: data.club,
        weight: data.weight,
        // Passamos dados da divisão para ajudar a Edge Function
        gender: selectedDivision?.gender,
        belt: selectedDivision?.belt
      };

      const { data: result, error } = await supabase.functions.invoke('public-register-athlete', {
        body: payload
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      dismissToast(toastId);
      setRegisteredAthleteId(result.athleteId);
      setSuccess(true);
      showSuccess("Registration submitted successfully!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Error submitting registration.");
    }
  };

  const handleDownloadQrCode = async () => {
    if (!qrRef.current || !registeredAthleteId) return;
    
    const toastId = showLoading('Generating image...');
    try {
      // Atraso sutil para garantir que a renderização do DOM do QRCodeSVG finalizou perfeitamente
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await htmlToImage.toPng(qrRef.current, {
        backgroundColor: '#ffffff', // Força fundo branco para evitar problemas de contraste no celular
        pixelRatio: 2, // Maior resolução
      });
      
      const link = document.createElement('a');
      link.download = `checkin_qrcode_${eventName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      dismissToast(toastId);
      showSuccess("QR Code saved successfully!");
    } catch (error) {
      console.error('Error generating QR code image:', error);
      dismissToast(toastId);
      showError("Failed to save QR code image. Please take a screenshot instead.");
    }
  };

  if (loadingPage) {
    return <PublicLayout><div className="flex justify-center mt-10"><Loader2 className="animate-spin h-8 w-8" /></div></PublicLayout>;
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto mt-10 mb-20 px-4">
          <Card className="text-center border-primary bg-card shadow-lg">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
              <CardTitle className="text-2xl text-foreground">Registration Received!</CardTitle>
              <CardDescription className="text-lg">
                Your information has been sent to the organization of <strong>{eventName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
              <p className="text-muted-foreground">
                You will receive an email confirmation once your registration is approved.
              </p>

              {registeredAthleteId && (
                <div 
                  ref={qrRef}
                  className="bg-muted p-6 rounded-xl flex flex-col items-center border border-border w-full max-w-xs shadow-inner"
                >
                  <p className="font-semibold mb-4 text-sm uppercase tracking-wide text-foreground">Your Check-in QR Code</p>
                  <div className="bg-white p-3 rounded-lg print:border print:border-black">
                    <QrCodeGenerator value={`EV_${eventId}_ATH_${registeredAthleteId}`} size={160} />
                  </div>
                  <p className="mt-4 text-xs font-mono text-muted-foreground break-all">
                    {`EV_${eventId}_ATH_${registeredAthleteId}`}
                  </p>
                </div>
              )}

              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 p-4 rounded-lg text-sm w-full no-print">
                <p className="font-semibold mb-1 text-orange-900 dark:text-orange-300">Important:</p>
                <p className="text-orange-800 dark:text-orange-200">Please <strong>download</strong> this QR Code or take a screenshot. You will need to show it to speed up your check-in on the exact day of the event.</p>
              </div>

            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 no-print">
              <Button variant="outline" onClick={handleDownloadQrCode} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Download QR Code
              </Button>
              <Button onClick={() => navigate(`/p/events/${eventId}`)} className="w-full sm:w-auto">
                Back to Event
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{eventName}</h1>
          <p className="text-muted-foreground">Athlete Registration Form</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Fill in the fields below to request your registration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" {...register('first_name')} placeholder="Your first name" />
                  {errors.first_name && <span className="text-red-500 text-xs">{errors.first_name.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" {...register('last_name')} placeholder="Your last name" />
                  {errors.last_name && <span className="text-red-500 text-xs">{errors.last_name.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="your@email.com" />
                  {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone / WhatsApp</Label>
                  <Input id="phone" {...register('phone')} placeholder="(XX) XXXXX-XXXX" />
                  {errors.phone && <span className="text-red-500 text-xs">{errors.phone.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                  {errors.date_of_birth && <span className="text-red-500 text-xs">{errors.date_of_birth.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club">Team / Club</Label>
                  <Input id="club" {...register('club')} placeholder="Your team name" />
                  {errors.club && <span className="text-red-500 text-xs">{errors.club.message}</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Category / Division</Label>
                <Select onValueChange={(val) => setValue('division_id', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your category" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.length === 0 ? (
                      <SelectItem value="none" disabled>No divisions available</SelectItem>
                    ) : (
                      divisions.map(div => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name} ({div.gender} - {div.belt} - {div.age_category_name} - {div.max_weight}kg)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.division_id && <span className="text-red-500 text-xs">{errors.division_id.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Your Approximate Weight (kg)</Label>
                <Input id="weight" type="number" step="0.1" {...register('weight')} placeholder="Ex: 75.5" />
                <p className="text-xs text-muted-foreground">Official weight will be checked on the event day.</p>
                {errors.weight && <span className="text-red-500 text-xs">{errors.weight.message}</span>}
              </div>

              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Confirm Registration"}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default PublicRegistration;