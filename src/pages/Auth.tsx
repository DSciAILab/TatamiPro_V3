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
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

const Auth: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslations();
  const [view, setView] = useState<'sign_in' | 'sign_up' | 'forgot_password'>('sign_in');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/events');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let email = identifier;
    const isEmail = identifier.includes('@');

    try {
      if (!isEmail) {
        const { data, error } = await supabase.rpc('get_email_from_username', { p_username: identifier });
        if (error || !data) {
          throw new Error("Usuário não encontrado.");
        }
        email = data;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) throw signInError;

      showSuccess("Login bem-sucedido!");
      navigate('/events');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{t('welcomeToTatamiPro')}</CardTitle>
            <CardDescription>{t('accessOrCreateAccount')}</CardDescription>
          </CardHeader>
          <CardContent>
            {view === 'forgot_password' ? (
              <>
                <SupabaseAuth
                  supabaseClient={supabase}
                  appearance={{ theme: ThemeSupa }}
                  providers={[]}
                  theme="light"
                  view="forgotten_password"
                  localization={{
                    variables: {
                      forgotten_password: {
                        email_label: 'Endereço de e-mail',
                        email_input_placeholder: 'Seu endereço de e-mail',
                        button_label: 'Enviar instruções',
                        link_text: 'Esqueceu sua senha?',
                      },
                    },
                  }}
                />
                <Button variant="link" className="w-full" onClick={() => setView('sign_in')}>
                  {t('backToLogin')}
                </Button>
              </>
            ) : (
              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sign_in">{t('signIn')}</TabsTrigger>
                  <TabsTrigger value="sign_up">{t('signUp')}</TabsTrigger>
                </TabsList>
                <TabsContent value="sign_in">
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="identifier">{t('emailOrUsername')}</Label>
                      <Input
                        id="identifier"
                        type="text"
                        placeholder={t('yourEmailOrUsernamePlaceholder')}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">{t('password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={t('yourPasswordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('signIn')}
                    </Button>
                  </form>
                  <div className="text-center mt-2">
                    <Button variant="link" size="sm" onClick={() => setView('forgot_password')}>
                      {t('forgotPassword')}
                    </Button>
                  </div>
                  <BiometricLogin />
                </TabsContent>
                <TabsContent value="sign_up">
                  <SupabaseAuth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={[]}
                    theme="light"
                    view="sign_up"
                    localization={{
                      variables: {
                        sign_up: {
                          email_label: 'Endereço de e-mail',
                          password_label: 'Crie uma senha',
                          email_input_placeholder: 'Seu endereço de e-mail',
                          password_input_placeholder: 'Sua senha',
                          button_label: 'Registrar',
                          social_provider_text: 'Registrar com {{provider}}',
                          link_text: 'Não tem uma conta? Registre-se',
                        },
                      },
                    }}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;