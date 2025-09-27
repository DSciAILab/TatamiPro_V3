"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { startRegistration } from '@simplewebauthn/browser';
import { PlusCircle, Trash2, Monitor, Smartphone } from 'lucide-react';

interface Authenticator {
  id: string;
  friendly_name: string;
  created_at: string;
}

const AccountSecurity: React.FC = () => {
  const navigate = useNavigate();
  const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndFetchAuthenticators = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchAuthenticators();
    };
    checkUserAndFetchAuthenticators();
  }, [navigate]);

  const fetchAuthenticators = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_authenticators')
      .select('id, friendly_name, created_at');

    if (error) {
      showError('Failed to load your devices: ' + error.message);
    } else {
      setAuthenticators(data || []);
    }
    setIsLoading(false);
  };

  const handleRegisterDevice = async () => {
    const loadingToast = showLoading('Preparing to register device...');
    try {
      // 1. Get registration options from the server
      const { data: options, error: optionsError } = await supabase.functions.invoke('generate-registration-options');
      if (optionsError) throw optionsError;

      dismissToast(loadingToast);

      // 2. Prompt user for biometric/security key
      const attestation = await startRegistration(options);

      // 3. Ask for a friendly name
      const friendlyName = prompt('Please enter a name for this device (e.g., "My iPhone")', 'My Device');
      if (friendlyName === null) {
        showError('Registration cancelled.');
        return;
      }

      // 4. Send attestation to server for verification
      const { error: verificationError } = await supabase.functions.invoke('verify-registration', {
        body: { credential: attestation, friendlyName },
      });

      if (verificationError) throw verificationError;

      showSuccess('Device registered successfully!');
      fetchAuthenticators(); // Refresh the list
    } catch (error: any) {
      dismissToast(loadingToast);
      const errorMessage = error.message || 'An unknown error occurred.';
      if (errorMessage.includes('AbortError')) {
        showError('Registration was cancelled.');
      } else {
        showError('Failed to register device: ' + errorMessage);
      }
      console.error(error);
    }
  };

  const handleDeleteDevice = async (authenticatorId: string) => {
    if (!window.confirm('Are you sure you want to remove this device?')) {
      return;
    }

    const { error } = await supabase
      .from('user_authenticators')
      .delete()
      .eq('id', authenticatorId);

    if (error) {
      showError('Failed to remove device: ' + error.message);
    } else {
      showSuccess('Device removed successfully.');
      fetchAuthenticators(); // Refresh the list
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Account Security</h1>
        <Card>
          <CardHeader>
            <CardTitle>Biometric & Security Key Login</CardTitle>
            <CardDescription>
              Add a secure, passwordless way to log in using Face ID, Touch ID, or a physical security key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading your devices...</p>
            ) : authenticators.length === 0 ? (
              <p className="text-muted-foreground">You haven't registered any devices yet.</p>
            ) : (
              <ul className="space-y-3">
                {authenticators.map(auth => (
                  <li key={auth.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{auth.friendly_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Added on {new Date(auth.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(auth.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={handleRegisterDevice} className="w-full mt-6">
              <PlusCircle className="mr-2 h-4 w-4" /> Add a New Device
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AccountSecurity;