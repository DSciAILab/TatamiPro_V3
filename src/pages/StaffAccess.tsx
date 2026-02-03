"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, KeyRound, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Staff Access Page
 * Entry point for staff members accessing via token/QR code
 * Validates token and redirects to appropriate module
 */
const StaffAccess: React.FC = () => {
  const { eventId, token: tokenFromUrl } = useParams<{ eventId: string; token?: string }>();
  const navigate = useNavigate();
  const { authenticate, isLoading, error } = useStaffAuth();
  
  const [manualToken, setManualToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Auto-validate if token is in URL
  useEffect(() => {
    if (tokenFromUrl && eventId) {
      handleAuthenticate(tokenFromUrl);
    }
  }, [tokenFromUrl, eventId]);

  const handleAuthenticate = async (token: string) => {
    if (!eventId) return;
    
    setIsValidating(true);
    const result = await authenticate(token, eventId);
    setIsValidating(false);

    if (result.valid && result.redirect_path) {
      navigate(result.redirect_path);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleAuthenticate(manualToken.trim());
    }
  };

  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando acesso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso Staff</CardTitle>
          <CardDescription>
            Digite o código de acesso ou escaneie o QR Code fornecido pelo organizador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Código de Acesso</Label>
              <Input
                id="token"
                type="text"
                placeholder="Digite o código..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={!manualToken.trim()}>
              Acessar
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => {
              // TODO: Implement QR scanner
              alert('Scanner de QR Code em desenvolvimento');
            }}
          >
            <QrCode className="mr-2 h-5 w-5" />
            Escanear QR Code
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Não tem um código de acesso? <br />
            Entre em contato com o organizador do evento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAccess;
