"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useStaff, StaffProvider } from '@/context/staff-context';
import { StaffRole, StaffAccessToken, ROLE_PERMISSIONS, StaffAccessLink } from '@/types/staff-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  QrCode,
  Copy,
  Trash2,
  RefreshCw,
  UserCheck,
  GitBranch,
  Trophy,
  Shield,
  Download,
  ExternalLink,
  Users,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface StaffAccessGeneratorProps {
  eventId: string;
  eventName?: string;
}

const roleIcons: Record<StaffRole, React.ReactNode> = {
  check_in: <UserCheck className="h-4 w-4" />,
  bracket: <GitBranch className="h-4 w-4" />,
  results: <Trophy className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
};

/**
 * Component for generating and managing staff access tokens
 */
const StaffAccessGeneratorInner: React.FC<StaffAccessGeneratorProps> = ({ eventId }) => {
  const { generateToken, revokeToken, getEventTokens, connectedClients, refreshConnectedClients } = useStaff();
  
  const [tokens, setTokens] = useState<StaffAccessToken[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<StaffAccessLink | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  
  // Form state
  const [selectedRole, setSelectedRole] = useState<StaffRole>('check_in');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    loadTokens();
    refreshConnectedClients();
  }, [eventId]);

  const loadTokens = async () => {
    setIsLoading(true);
    try {
      const eventTokens = await getEventTokens(eventId);
      setTokens(eventTokens);
    } catch (error) {
      console.error('[StaffAccessGenerator] Error loading tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const link = await generateToken({
        event_id: eventId,
        role: selectedRole,
        nickname: nickname || undefined,
      });
      
      setGeneratedLink(link);
      setShowQrDialog(true);
      setNickname('');
      loadTokens();
      
      showSuccess('Token gerado com sucesso!');
    } catch (error: any) {
      showError('Erro ao gerar token: ' + error.message);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await revokeToken(tokenId);
      loadTokens();
      showSuccess('Token revogado com sucesso');
    } catch (error: any) {
      showError('Erro ao revogar token: ' + error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Link copiado!');
  };

  const downloadQrCode = (tokenId: string) => {
    const svg = document.getElementById(`qr-${tokenId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `staff-access-${tokenId.slice(0, 8)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const activeTokens = tokens.filter(t => t.status === 'active');
  const revokedTokens = tokens.filter(t => t.status === 'revoked');

  return (
    <div className="space-y-6">
      {/* Generate New Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Gerar Novo Acesso
          </CardTitle>
          <CardDescription>
            Crie um link/QR code para permitir que staff acesse módulos específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_PERMISSIONS) as StaffRole[]).map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {roleIcons[role]}
                        <span>{ROLE_PERMISSIONS[role].label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_PERMISSIONS[selectedRole].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Apelido (opcional)</Label>
              <Input
                placeholder="Ex: Mesa 1, Mat 2..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Identificação para facilitar o gerenciamento
              </p>
            </div>
          </div>

          <Button onClick={handleGenerateToken} className="w-full md:w-auto">
            <QrCode className="mr-2 h-4 w-4" />
            Gerar QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Active Tokens */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Ativos ({activeTokens.length})
          </TabsTrigger>
          <TabsTrigger value="connected">
            Conectados ({connectedClients.length})
          </TabsTrigger>
          <TabsTrigger value="revoked">
            Revogados ({revokedTokens.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTokens.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhum token ativo</p>
              </CardContent>
            </Card>
          ) : (
            activeTokens.map(token => (
              <Card key={token.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full ${ROLE_PERMISSIONS[token.role].color} flex items-center justify-center text-white`}>
                      {roleIcons[token.role]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {token.nickname || ROLE_PERMISSIONS[token.role].label}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {token.role}
                        </Badge>
                        <span>• Usos: {token.current_uses}</span>
                        {token.max_uses && <span>/ {token.max_uses}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>QR Code de Acesso</DialogTitle>
                          <DialogDescription>
                            {token.nickname || ROLE_PERMISSIONS[token.role].label}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          <div className="bg-white p-4 rounded-lg">
                            <QRCodeSVG
                              id={`qr-${token.id}`}
                              value={`${window.location.origin}/staff/${eventId}/${token.role}/${token.token}`}
                              size={200}
                              level="H"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(`${window.location.origin}/staff/${eventId}/${token.role}/${token.token}`)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadQrCode(token.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(`${window.location.origin}/staff/${eventId}/${token.role}/${token.token}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevokeToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={refreshConnectedClients}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {connectedClients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhum staff conectado</p>
              </CardContent>
            </Card>
          ) : (
            connectedClients.map(client => (
              <Card key={client.session_id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full ${client.is_online ? 'bg-green-500' : 'bg-gray-500'} flex items-center justify-center text-white`}>
                      {roleIcons[client.role]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {client.nickname || ROLE_PERMISSIONS[client.role].label}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={client.is_online ? 'default' : 'secondary'}>
                          {client.is_online ? '🟢 Online' : '🔴 Offline'}
                        </Badge>
                        <span>
                          Última atividade: {new Date(client.last_activity_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="revoked" className="space-y-4">
          {revokedTokens.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">Nenhum token revogado</p>
              </CardContent>
            </Card>
          ) : (
            revokedTokens.map(token => (
              <Card key={token.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
                      {roleIcons[token.role]}
                    </div>
                    <div>
                      <p className="font-medium line-through">
                        {token.nickname || ROLE_PERMISSIONS[token.role].label}
                      </p>
                      <Badge variant="destructive" className="text-xs">
                        Revogado
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Generated QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code Gerado!</DialogTitle>
            <DialogDescription>
              Compartilhe este QR code ou código com o staff
            </DialogDescription>
          </DialogHeader>
          {generatedLink && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={generatedLink.url}
                  size={200}
                  level="H"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {generatedLink.token.nickname || ROLE_PERMISSIONS[generatedLink.token.role].label}
              </p>
              
              {/* Código de Acesso em texto */}
              <div className="w-full space-y-2">
                <Label className="text-xs text-muted-foreground">Código de Acesso:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono text-center select-all">
                    {generatedLink.token.token}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(generatedLink.token.token)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyToClipboard(generatedLink.url)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(generatedLink.url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Wrapper with Provider
const StaffAccessGenerator: React.FC<StaffAccessGeneratorProps> = (props) => (
  <StaffProvider eventId={props.eventId}>
    <StaffAccessGeneratorInner {...props} />
  </StaffProvider>
);

export default StaffAccessGenerator;
