"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import BiometricLogin from '@/components/BiometricLogin';
import { Loader2, LogIn } from 'lucide-react';

const Auth: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
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
            
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;