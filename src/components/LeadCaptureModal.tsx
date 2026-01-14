"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { User, Mail, Phone } from 'lucide-react';

interface LeadCaptureModalProps {
  eventId: string;
  isOpen: boolean;
  onSuccess: () => void;
}

const LEAD_STORAGE_KEY = (eventId: string) => `lead_captured_${eventId}`;

export const hasSubmittedLead = (eventId: string): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LEAD_STORAGE_KEY(eventId)) === 'true';
};

export const markLeadSubmitted = (eventId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LEAD_STORAGE_KEY(eventId), 'true');
  }
};

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  eventId,
  isOpen,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showError2, setShowError2] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: name is required
    if (!name.trim()) {
      showError('Por favor, informe seu nome.');
      return;
    }

    // Validation: at least email or phone required (silent validation)
    if (!email.trim() && !phone.trim()) {
      // Show a subtle hint without explicitly saying both are optional
      setShowError2(true);
      showError('Por favor, preencha todos os campos para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('sjjp_event_leads').insert({
        event_id: eventId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      if (error) throw error;

      markLeadSubmitted(eventId);
      showSuccess('Bem-vindo! Aproveite o evento.');
      onSuccess();
    } catch (err: any) {
      showError('Erro ao registrar. Tente novamente.');
      console.error('Lead capture error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Bem-vindo ao Evento! 🎉</DialogTitle>
          <DialogDescription className="text-base">
            Para acessar as informações do evento, por favor preencha seus dados abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome Completo
            </Label>
            <Input
              id="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowError2(false);
              }}
              className={showError2 && !email && !phone ? 'border-destructive' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setShowError2(false);
              }}
              className={showError2 && !email && !phone ? 'border-destructive' : ''}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando...' : 'Acessar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadCaptureModal;
