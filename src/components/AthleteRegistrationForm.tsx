"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { Athlete } from '../types/index'; // Corrigido: usando caminho relativo

interface AthleteRegistrationFormProps {
  eventId: string;
  onRegister: (athlete: Athlete) => void;
}

const formSchema = z.object({
  firstName: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'Sobrenome deve ter pelo menos 2 caracteres.' }),
  dateOfBirth: z.date({ required_error: 'Data de nascimento é obrigatória.' }),
  club: z.string().min(1, { message: 'Clube é obrigatório.' }),
  gender: z.enum(['Masculino', 'Feminino', 'Outro'], { required_error: 'Gênero é obrigatório.' }),
  belt: z.enum(['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: 'Faixa é obrigatória.' }),
  weight: z.coerce.number().min(20, { message: 'Peso deve ser no mínimo 20kg.' }).max(200, { message: 'Peso deve ser no máximo 200kg.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido (formato E.164, ex: +5511987654321).' }),
  emiratesId: z.string().optional(), // Basic validation, can be enhanced
  schoolId: z.string().optional(),
  photo: z.any().optional(), // File object
  signature: z.any().optional(), // File object
  consentAccepted: z.boolean().refine(val => val === true, { message: 'Você deve aceitar o termo de consentimento.' }),
});

const clubs = ['Gracie Barra', 'Alliance', 'Checkmat', 'Atos', 'Nova União', 'Outro'];
const belts = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const AthleteRegistrationForm: React.FC<AthleteRegistrationFormProps> = ({ eventId, onRegister }) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      club: '',
      gender: 'Masculino',
      belt: 'Branca',
      weight: 0,
      email: '',
      phone: '',
      emiratesId: '',
      schoolId: '',
      consentAccepted: false,
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('photo', file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      form.setValue('photo', undefined);
      setPhotoPreview(null);
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('signature', file);
      setSignaturePreview(URL.createObjectURL(file));
    } else {
      form.setValue('signature', undefined);
      setSignaturePreview(null);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const age = new Date().getFullYear() - values.dateOfBirth.getFullYear();
    const newAthlete: Athlete = {
      id: `athlete-${Date.now()}`, // Simple unique ID for MVP
      eventId,
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      age,
      club: values.club,
      gender: values.gender,
      belt: values.belt,
      weight: values.weight,
      email: values.email,
      phone: values.phone,
      emiratesId: values.emiratesId,
      schoolId: values.schoolId,
      photoUrl: photoPreview || undefined, // In a real app, this would be a URL after upload
      signatureUrl: signaturePreview || undefined, // In a real app, this would be a URL after upload
      consentAccepted: values.consentAccepted,
      consentDate: new Date(), // Current date for consent
      consentVersion: '1.0', // Fixed version for MVP
    };
    onRegister(newAthlete);
    showSuccess('Atleta registrado com sucesso!');
    form.reset();
    setPhotoPreview(null);
    setSignaturePreview(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do atleta" {...field} />
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
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input placeholder="Sobrenome do atleta" {...field} />
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
              <FormLabel>Data de Nascimento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                A idade será calculada automaticamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="club"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clube Associado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o clube" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club} value={club}>{club}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Gênero</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Masculino" />
                      </FormControl>
                      <FormLabel className="font-normal">Masculino</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Feminino" />
                      </FormControl>
                      <FormLabel className="font-normal">Feminino</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="Outro" />
                      </FormControl>
                      <FormLabel className="font-normal">Outro</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="belt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Faixa</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {belts.map((belt) => (
                      <SelectItem key={belt} value={belt}>{belt}</SelectItem>
                    ))}
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
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ex: 75.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="seu@email.com" {...field} />
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
                <FormLabel>Telefone (E.164)</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+5511987654321" {...field} />
                </FormControl>
                <FormDescription>
                  Formato E.164, ex: +5511987654321
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="emiratesId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emirates ID (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="XXX-XXXX-XXXXXXX-X" {...field} />
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
                <FormLabel>School ID (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ID da escola" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormItem>
            <FormLabel>Foto do Atleta</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} />
            </FormControl>
            {photoPreview && (
              <div className="mt-2">
                <img src={photoPreview} alt="Pré-visualização da foto" className="w-24 h-24 object-cover rounded-md" />
              </div>
            )}
            <FormDescription>
              Faça upload de uma foto clara do atleta.
            </FormDescription>
            <FormMessage>{form.formState.errors.photo?.message as string}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Assinatura</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={handleSignatureChange} />
            </FormControl>
            {signaturePreview && (
              <div className="mt-2">
                <img src={signaturePreview} alt="Pré-visualização da assinatura" className="w-24 h-24 object-cover rounded-md" />
              </div>
            )}
            <FormDescription>
              Faça upload da assinatura do atleta ou responsável.
            </FormDescription>
            <FormMessage>{form.formState.errors.signature?.message as string}</FormMessage>
          </FormItem>
        </div>

        <FormField
          control={form.control}
          name="consentAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Eu concordo com os termos e condições do evento (versão 1.0, {format(new Date(), 'dd/MM/yyyy')}).
                </FormLabel>
                <FormDescription>
                  Ao marcar esta caixa, você confirma que leu e aceita as regras e regulamentos do campeonato.
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Registrar Atleta</Button>
      </form>
    </Form>
  );
};

export default AthleteRegistrationForm;