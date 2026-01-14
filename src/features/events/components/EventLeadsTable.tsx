"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventLead } from '@/types/index';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, Mail, Phone, Calendar, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';

interface EventLeadsTableProps {
  eventId: string;
}

const EventLeadsTable: React.FC<EventLeadsTableProps> = ({ eventId }) => {
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sjjp_event_leads')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data?.map(d => ({
        ...d,
        created_at: new Date(d.created_at),
      })) || []);
    } catch (err: any) {
      showError('Erro ao carregar visitantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [eventId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitantes do Evento
            </CardTitle>
            <CardDescription>
              Lista de pessoas que acessaram a página pública do evento.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {leads.length}
            </Badge>
            <Button variant="outline" size="icon" onClick={fetchLeads} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : leads.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum visitante registrado ainda.</p>
            <p className="text-sm">Ative a captura de leads na configuração do evento.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data de Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      {lead.email ? (
                        <a 
                          href={`mailto:${lead.email}`} 
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <a 
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(lead.created_at, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventLeadsTable;
