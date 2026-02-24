"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import BiometricLogin from '@/components/BiometricLogin';
import { Loader2, LogIn } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import QRScannerDialog from '@/components/QRScannerDialog';

const Auth: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslations();
  const [view, setView] = useState<'sign_in' | 'sign_up' | 'forgot_password'>('sign_in');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/events');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      showError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    let email = loginIdentifier;
    const isEmail = loginIdentifier.includes('@');

    try {
      console.log('[AUTH] Starting login with:', loginIdentifier);
      
      // For now, only support email login (username support needs Edge Function)
      if (!loginIdentifier.includes('@')) {
        throw new Error('Please use your email to login.');
      }

      console.log('[AUTH] Attempting sign in with email');
      
      // Direct Supabase auth (more reliable than Edge Function)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginIdentifier,
        password
      });

      console.log('[AUTH] Sign in response:', { hasSession: !!data.session, error });

      if (error) throw error;

      if (data.session) {
        console.log('[AUTH] Session established successfully');
        showSuccess("Welcome back!");
        navigate('/events');
      } else {
        throw new Error('Failed to obtain login session.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) throw signInError;

      showSuccess("Login bem-sucedido!");
      navigate('/events');
    } catch (error: any) {
      console.error('[AUTH] Login error:', error);
      showError(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">TatamiPro</CardTitle>
            <CardDescription>Sign in with your Email or Username</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Email or Username</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="e.g: john.doe or email@example.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>

            <BiometricLogin />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <QRScannerDialog 
              onScan={(decodedText: string) => {
                console.log('[AUTH] QR Scanned:', decodedText);
                try {
                  // If it's a full URL and belongs to our app
                  if (decodedText.startsWith(window.location.origin)) {
                    const path = decodedText.replace(window.location.origin, '');
                    if (path.startsWith('/staff/')) {
                      showSuccess("Staff QR detected! Redirecting...");
                      navigate(path);
                      return;
                    }
                  }
                  
                  // fallback for relative paths if scanner doesn't include origin
                  if (decodedText.startsWith('/staff/')) {
                    showSuccess("Staff QR detected! Redirecting...");
                    navigate(decodedText);
                    return;
                  }

                  showError("QR Code inválido para login.");
                } catch (err) {
                  showError("Erro ao processar QR Code.");
                }
              }}
              triggerLabel="Login via QR Code"
              triggerVariant="outline"
              description="Escanear o QR Code fornecido pelo administrador para acesso rápido."
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;