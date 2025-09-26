"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Athlete, AthleteBelt, Gender } from '@/types/index';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { showSuccess, showError } from '@/utils/toast';

interface AthleteRegistrationFormProps {
  onRegister: (athlete: Athlete) => void;
  initialData?: Partial<Athlete>;
  mandatoryFieldsConfig: Record<string, boolean>; // Adicionado
}

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'First Name is required.' }),
  lastName: z.string().min(1, { message: 'Last Name is required.' }),
  dateOfBirth: z.date({ required_error: 'Date of Birth is required.' }),
  gender: z.enum(['Male', 'Female'], { required_error: 'Gender is required.' }),
  nationality: z.string().min(1, { message: 'Nationality is required.' }),
  belt: z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: 'Belt is required.' }),
  weight: z.coerce.number().min(1, { message: 'Weight must be a positive number.' }),
  club: z.string().min(1, { message: 'Club is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(1, { message: 'Phone number is required.' }),
  idNumber: z.string().min(1, { message: 'Identification Number is required.' }),
  emiratesId: z.string().optional(),
  schoolId: z.string().optional(),
  photoUrl: z.string().url({ message: 'Invalid URL for photo.' }).optional().or(z.literal('')),
  emiratesIdFrontUrl: z.string().url({ message: 'Invalid URL for Emirates ID Front.' }).optional().or(z.literal('')),
  emiratesIdBackUrl: z.string().url({ message: 'Invalid URL for Emirates ID Back.' }).optional().or(z.literal('')),
  paymentProofUrl: z.string().url({ message: 'Invalid URL for Payment Proof.' }).optional().or(z.literal('')),
});

const AthleteRegistrationForm: React.FC<AthleteRegistrationFormProps> = ({ onRegister, initialData, mandatoryFieldsConfig }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      dateOfBirth: initialData?.dateOfBirth || undefined,
      gender: initialData?.gender || undefined,
      nationality: initialData?.nationality || '',
      belt: initialData?.belt || undefined,
      weight: initialData?.weight || 0,
      club: initialData?.club || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      idNumber: initialData?.idNumber || '',
      emiratesId: initialData?.emiratesId || '',
      schoolId: initialData?.schoolId || '',
      photoUrl: initialData?.photoUrl || '',
      emiratesIdFrontUrl: initialData?.emiratesIdFrontUrl || '',
      emiratesIdBackUrl: initialData?.emiratesIdBackUrl || '',
      paymentProofUrl: initialData?.paymentProofUrl || '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    try {
      const age = new Date().getFullYear() - values.dateOfBirth.getFullYear();
      const newAthlete: Athlete = {
        id: uuidv4(),
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        age: age,
        ageDivision: getAgeDivision(age),
        gender: values.gender,
        nationality: values.nationality,
        belt: values.belt,
        weight: values.weight,
        weightDivision: getWeightDivision(values.weight),
        club: values.club,
        email: values.email,
        phone: values.phone,
        idNumber: values.idNumber,
        emiratesId: values.emiratesId || undefined,
        schoolId: values.schoolId || undefined,
        photoUrl: values.photoUrl || undefined,
        emiratesIdFrontUrl: values.emiratesIdFrontUrl || undefined,
        emiratesIdBackUrl: values.emiratesIdBackUrl || undefined,
        paymentProofUrl: values.paymentProofUrl || undefined,
        consentDate: new Date(),
        registrationStatus: 'under_approval',
        checkInStatus: 'pending',
        weightAttempts: [],
        attendanceStatus: 'pending',
      };
      onRegister(newAthlete);
      form.reset();
    } catch (error) {
      showError('Failed to register athlete.');
      console.error('Athlete registration error:', error);
    }
  };

  const { gender } = form.watch();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Athlete's first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Athlete's last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's nationality" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="belt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Belt</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select belt" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Branca">White</SelectItem>
                  <SelectItem value="Cinza">Gray</SelectItem>
                  <SelectItem value="Amarela">Yellow</SelectItem>
                  <SelectItem value="Laranja">Orange</SelectItem>
                  <SelectItem value="Verde">Green</SelectItem>
                  <SelectItem value="Azul">Blue</SelectItem>
                  <SelectItem value="Roxa">Purple</SelectItem>
                  <SelectItem value="Marrom">Brown</SelectItem>
                  <SelectItem value="Preta">Black</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Athlete's weight in kg" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="club"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Club</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's club" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Athlete's email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Identification Number</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's identification number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emiratesId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emirates ID (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's Emirates ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schoolId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School ID (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Athlete's School ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="URL for athlete's photo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emiratesIdFrontUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emirates ID Front URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="URL for Emirates ID front image" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emiratesIdBackUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emirates ID Back URL (Optional)</Label>
              <FormControl>
                <Input placeholder="URL for Emirates ID back image" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentProofUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Proof URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="URL for payment proof image" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Register Athlete</Button>
      </form>
    </Form>
  );
};

export default AthleteRegistrationForm;