"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanFace, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { startAuthentication } from '@simplewebauthn/browser';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const BiometricLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBiometricLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError("Por favor, digite seu e-mail.");
      return;
    }
    setLoading(true);

    try {
      // 1. Get options
      const { data: options, error: optError } = await supabase.functions.invoke('generate-authentication-options', {
        body: { email }
      });

      if (optError) throw new Error(optError.message || 'Erro ao iniciar Face ID.');
      
      // 2. Client interaction (Face ID / Touch ID)
      const credential = await startAuthentication(options);

      // 3. Verify
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-authentication', {
        body: { email, credential }
      });

      if (verifyError) throw new Error(verifyError.message || 'Falha na verificação.');

      if (verifyData?.verified && verifyData?.token) {
        // 4. Complete Login
        const { error: loginError } = await supabase.auth.verifyOtp({
          email,
          token: verifyData.token,
          type: 'magiclink'
        });

        if (loginError) throw loginError;

        showSuccess("Login realizado com sucesso!");
        navigate('/events');
      } else {
        throw new Error('Falha na verificação biométrica.');
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.message?.includes('User not found') 
        ? 'Usuário não encontrado ou sem Face ID configurado.' 
        : error.message;
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="text-center text-sm text-muted-foreground font-medium">
        Ou entre com Biometria
      </div>
      <form onSubmit={handleBiometricLogin} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="bio-email">E-mail</Label>
          <Input 
            id="bio-email" 
            type="email" 
            placeholder="seu@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanFace className="mr-2 h-4 w-4" />}
          Entrar com Face ID / Touch ID
        </Button>
      </form>
    </div>
  );
};

export default BiometricLogin;