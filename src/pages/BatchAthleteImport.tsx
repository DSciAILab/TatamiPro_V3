"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { parseISO } from 'date-fns';
import { z } from 'zod';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { Belt, Gender } from '@/types/index';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Define os campos mínimos esperados no arquivo de importação
const baseRequiredAthleteFields = {
  fullName: 'Nome Completo',
  date_of_birth: 'Data de Nascimento',
  belt: 'Faixa',
  weight: 'Peso',
  phone: 'Telefone',
  email: 'Email',
  idNumber: 'ID (Emirates ID ou School ID)',
  club: 'Clube',
  gender: 'Gênero',
  nationality: 'Nacionalidade',
  photo_url: 'URL da Foto de Perfil',
  emirates_id_front_url: 'URL da Frente do EID',
  emirates_id_back_url: 'URL do Verso do EID',
  payment_proof_url: 'URL do Comprovante de Pagamento',
};

type RequiredAthleteField = keyof typeof baseRequiredAthleteFields;

// Define os esquemas base para campos de importação
const importFullNameSchema = z.string()
  .min(1, { message: 'Nome completo é obrigatório.' })
  .transform(str => str.replace(/\s+/g, ' ').trim())
  .refine(str => str.split(' ').filter(Boolean).length >= 2, { message: 'Nome completo deve conter pelo menos duas palavras.' })
  .transform(str => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '));

const importDateOfBirthSchema = z.string().transform((str, ctx) => {
  try {
    const date = parseISO(str);
    if (isNaN(date.getTime())) throw new Error('Formato de data inválido. Use YYYY-MM-DD.');
    return date;
  } catch (e: any) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    return z.NEVER;
  }
}).pipe(z.date());

const importBeltSchema = z.string().transform((str, ctx) => {
  const lowerStr = str.toLowerCase();
  const beltMap: { [key: string]: Belt } = {
    'white': 'Branca', 'branca': 'Branca',
    'grey': 'Cinza', 'gray': 'Cinza', 'cinza': 'Cinza',
    'yellow': 'Amarela', 'amarela': 'Amarela',
    'orange': 'Laranja', 'laranja': 'Laranja',
    'green': 'Verde', 'verde': 'Verde',
    'blue': 'Azul', 'azul': 'Azul',
    'purple': 'Roxa', 'roxa': 'Roxa',
    'brown': 'Marrom', 'marrom': 'Marrom',
    'black': 'Preta', 'preta': 'Preta',
  };
  if (beltMap[lowerStr]) return beltMap[lowerStr];
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Faixa inválida.' });
  return z.NEVER;
}).pipe(z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta']));

const importWeightSchema = z.coerce.number().min(20).max(200);
const importPhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal(''));
const importEmailSchema = z.string().email().optional().or(z.literal(''));
const importClubSchema = z.string().min(1);
const importGenderSchema = z.string().transform((str, ctx) => {
  const lowerStr = str.toLowerCase();
  const genderMap: { [key: string]: Gender } = {
    'male': 'Masculino', 'masculino': 'Masculino',
    'female': 'Feminino', 'feminino': 'Feminino',
    'other': 'Outro', 'outro': 'Outro',
  };
  if (genderMap[lowerStr]) return genderMap[lowerStr];
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gênero inválido.' });
  return z.NEVER;
}).pipe(z.enum(['Masculino', 'Feminino', 'Outro']));
const importNationalitySchema = z.string().min(2);
const importIdNumberSchema = z.string().optional();
const importUrlSchema = z.string().url().optional().or(z.literal(''));

interface ImportResult {
  row: number;
  data: any;
  reason: string;
}

const BatchAthleteImport: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<RequiredAthleteField, string | undefined>>(() => ({} as any));
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: ImportResult[] } | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'results'>('upload');

  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {};
  }, [eventId]);

  const createDynamicImportSchema = (config: Record<string, boolean>) => {
    return z.object({
      fullName: importFullNameSchema,
      date_of_birth: importDateOfBirthSchema,
      belt: importBeltSchema,
      weight: importWeightSchema,
      phone: importPhoneSchema,
      email: importEmailSchema,
      idNumber: importIdNumberSchema,
      club: importClubSchema,
      gender: importGenderSchema,
      nationality: importNationalitySchema,
      photo_url: config.photo ? z.string().url().min(1) : importUrlSchema,
      emirates_id_front_url: config.emiratesIdFront ? z.string().url().min(1) : importUrlSchema,
      emirates_id_back_url: config.emiratesIdBack ? z.string().url().min(1) : importUrlSchema,
      payment_proof_url: config.paymentProof ? z.string().url().min(1) : importUrlSchema,
    }).refine(data => data.idNumber, {
      message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
      path: ['idNumber'],
    });
  };

  const currentImportSchema = useMemo(() => createDynamicImportSchema(mandatoryFieldsConfig), [mandatoryFieldsConfig]);
  type AthleteImportOutput = z.output<typeof currentImportSchema>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            showError('Erro ao parsear o arquivo CSV: ' + results.errors[0].message);
            return;
          }
          const headers = Object.keys(results.data[0] || {});
          setCsvHeaders(headers);
          setCsvData(results.data);
          setStep('map');
          const autoMapping: Partial<Record<RequiredAthleteField, string>> = {};
          Object.entries(baseRequiredAthleteFields).forEach(([key, label]) => {
            const found = headers.find(h => h.toLowerCase().replace(/ /g, '') === label.toLowerCase().replace(/ /g, ''));
            if (found) autoMapping[key as RequiredAthleteField] = found;
          });
          setColumnMapping(prev => ({ ...prev, ...autoMapping }));
        },
        error: (err: any) => showError('Erro ao ler o arquivo: ' + err.message)
      });
    }
  };

  const handleMappingChange = (field: RequiredAthleteField, csvColumn: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: csvColumn }));
  };

  const validateMapping = () => {
    const mandatoryFields = ['fullName', 'date_of_birth', 'belt', 'weight', 'idNumber', 'club', 'gender', 'nationality'];
    for (const field of mandatoryFields) {
      if (!columnMapping[field as RequiredAthleteField]) {
        showError(`O campo "${baseRequiredAthleteFields[field as RequiredAthleteField]}" não foi mapeado.`);
        return false;
      }
    }
    return true;
  };

  const handleProcessImport = async () => {
    if (!validateMapping()) return;
    const loadingToast = showLoading('Processando importação...');

    const successfulAthletesForDb: any[] = [];
    const failedImports: ImportResult[] = [];

    csvData.forEach((row, index) => {
      try {
        const mappedData: Record<string, any> = {};
        for (const [key, col] of Object.entries(columnMapping)) {
          if (col) mappedData[key] = row[col];
        }
        const parsed = currentImportSchema.safeParse(mappedData);
        if (!parsed.success) {
          throw new Error(parsed.error.errors.map(e => e.message).join('; '));
        }
        const data = parsed.data as AthleteImportOutput;
        const nameParts = data.fullName.split(' ');
        const athleteId = uuidv4();
        successfulAthletesForDb.push({
          id: athleteId,
          event_id: eventId!,
          registration_qr_code_id: `EV_${eventId}_ATH_${athleteId}`,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' '),
          date_of_birth: data.date_of_birth.toISOString(),
          age: new Date().getFullYear() - data.date_of_birth.getFullYear(),
          club: data.club,
          gender: data.gender,
          belt: data.belt,
          weight: data.weight,
          nationality: data.nationality,
          age_division: getAgeDivision(new Date().getFullYear() - data.date_of_birth.getFullYear()),
          weight_division: getWeightDivision(data.weight),
          email: data.email || '',
          phone: data.phone || '',
          emirates_id: data.idNumber,
          photo_url: data.photo_url || undefined,
          emirates_id_front_url: data.emirates_id_front_url || undefined,
          emirates_id_back_url: data.emirates_id_back_url || undefined,
          consent_accepted: true,
          consent_date: new Date().toISOString(),
          consent_version: '1.0',
          payment_proof_url: data.payment_proof_url || undefined,
          registration_status: 'under_approval',
          check_in_status: 'pending',
          attendance_status: 'pending',
        });
      } catch (error: any) {
        failedImports.push({ row: index + 2, data: row, reason: error.message });
      }
    });

    if (successfulAthletesForDb.length > 0) {
      const { error } = await supabase.from('athletes').insert(successfulAthletesForDb);
      if (error) {
        dismissToast(loadingToast);
        showError(`Erro ao salvar no banco de dados: ${error.message}`);
        return;
      }
    }

    dismissToast(loadingToast);
    setImportResults({
      success: successfulAthletesForDb.length,
      failed: failedImports.length,
      errors: failedImports,
    });
    setStep('results');
  };

  const handleExportErrors = () => {
    if (!importResults || importResults.errors.length === 0) return;
    const errorCsvData = importResults.errors.map(e => ({ ...e.data, 'Motivo do Erro': e.reason }));
    const csv = Papa.unparse(errorCsvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `erros_importacao_atletas.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Importar Atletas em Lote para Evento #{eventId}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">Voltar para o Evento</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Importação de Atletas</CardTitle>
          <CardDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV para iniciar.'}
            {step === 'map' && 'Mapeie as colunas do seu arquivo para os campos de atleta.'}
            {step === 'results' && 'Resultados da importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <Label htmlFor="athlete-file">Arquivo CSV</Label>
              <Input id="athlete-file" type="file" accept=".csv" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">
                Certifique-se de que seu arquivo CSV contenha as colunas necessárias.
              </p>
            </div>
          )}
          {step === 'map' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Mapeamento de Colunas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(baseRequiredAthleteFields).map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={`map-${key}`}>{label}</Label>
                    <Select onValueChange={(v) => handleMappingChange(key as RequiredAthleteField, v)} value={columnMapping[key as RequiredAthleteField] || ''}>
                      <SelectTrigger><SelectValue placeholder={`Selecione a coluna para ${label}`} /></SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={handleProcessImport} className="w-full">Processar Importação</Button>
            </div>
          )}
          {step === 'results' && importResults && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Resultados</h3>
              <p>Sucesso: <span className="font-bold text-green-600">{importResults.success}</span></p>
              <p>Falhas: <span className="font-bold text-red-600">{importResults.failed}</span></p>
              {importResults.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold">Detalhes dos Erros:</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {importResults.errors.map((e, i) => <TableRow key={i}><TableCell>{e.row}</TableCell><TableCell>{e.reason}</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                  <Button onClick={handleExportErrors} variant="outline" className="mt-4">Exportar Erros</Button>
                </div>
              )}
              <Button onClick={() => navigate(`/events/${eventId}`)} className="w-full">Voltar para o Evento</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default BatchAthleteImport;