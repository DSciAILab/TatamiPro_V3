"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { Athlete } from '@/types/index';

// Define os campos mínimos esperados no arquivo de importação
const requiredAthleteFields = {
  fullName: 'Nome do Atleta',
  dateOfBirth: 'Data de Nascimento',
  belt: 'Faixa',
  weight: 'Peso',
  phone: 'Telefone',
  email: 'Email',
  idNumber: 'ID (Emirates ID ou School ID)', // Campo genérico para ID
  club: 'Clube',
};

type RequiredAthleteField = keyof typeof requiredAthleteFields;

// Esquema de validação para os dados de entrada do CSV
const importSchema = z.object({
  fullName: z.string().min(2, { message: 'Nome completo é obrigatório.' }),
  dateOfBirth: z.string().transform((str, ctx) => {
    try {
      const date = parseISO(str); // Tenta parsear como ISO 8601
      if (isNaN(date.getTime())) {
        throw new Error('Formato de data inválido. Use YYYY-MM-DD.');
      }
      return date;
    } catch (e: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e.message,
      });
      return z.NEVER;
    }
  }),
  belt: z.enum(['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'], { message: 'Faixa inválida.' }),
  weight: z.coerce.number().min(20, { message: 'Peso deve ser no mínimo 20kg.' }).max(200, { message: 'Peso deve ser no máximo 200kg.' }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido (formato E.164, ex: +5511987654321).' }),
  email: z.string().email({ message: 'Email inválido.' }),
  idNumber: z.string().optional(), // Pode ser Emirates ID ou School ID
  club: z.string().min(1, { message: 'Clube é obrigatório.' }),
});

interface ImportResult {
  row: number;
  data: any;
  reason: string;
}

const BatchAthleteImport: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<RequiredAthleteField, string | undefined>>(() => {
    const initialMapping: Partial<Record<RequiredAthleteField, string | undefined>> = {};
    Object.keys(requiredAthleteFields).forEach(key => {
      initialMapping[key as RequiredAthleteField] = undefined;
    });
    return initialMapping as Record<RequiredAthleteField, string | undefined>;
  });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: ImportResult[] } | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'results'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      setImportResults(null); // Reset results on new file upload

      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            showError('Erro ao parsear o arquivo CSV: ' + results.errors[0].message);
            setFile(null);
            setCsvHeaders([]);
            setCsvData([]);
            setStep('upload');
            return;
          }
          const headers = Object.keys(results.data[0] || {});
          setCsvHeaders(headers);
          setCsvData(results.data);
          setStep('map');

          // Tenta mapear automaticamente as colunas
          const autoMapping: Partial<Record<RequiredAthleteField, string | undefined>> = {};
          Object.entries(requiredAthleteFields).forEach(([fieldKey, fieldLabel]) => {
            const foundHeader = headers.find(header => header.toLowerCase().includes(fieldLabel.toLowerCase().replace(/ /g, '')));
            if (foundHeader) {
              autoMapping[fieldKey as RequiredAthleteField] = foundHeader;
            }
          });
          setColumnMapping(prev => ({ ...prev, ...autoMapping }));
        },
        error: (err: any) => {
          showError('Erro ao ler o arquivo: ' + err.message);
          setFile(null);
          setCsvHeaders([]);
          setCsvData([]);
          setStep('upload');
        }
      });
    }
  };

  const handleMappingChange = (field: RequiredAthleteField, csvColumn: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: csvColumn }));
  };

  const validateMapping = () => {
    for (const field of Object.keys(requiredAthleteFields) as RequiredAthleteField[]) {
      if (!columnMapping[field]) {
        showError(`O campo "${requiredAthleteFields[field]}" não foi mapeado.`);
        return false;
      }
    }
    return true;
  };

  const handleProcessImport = () => {
    if (!validateMapping()) {
      return;
    }

    const successfulAthletes: Athlete[] = [];
    const failedImports: ImportResult[] = [];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header row
      try {
        const mappedData: Record<string, any> = {};
        for (const [fieldKey, csvColumn] of Object.entries(columnMapping)) {
          if (csvColumn) {
            mappedData[fieldKey] = row[csvColumn];
          }
        }

        const parsed = importSchema.safeParse(mappedData);

        if (!parsed.success) {
          const errors = parsed.error.errors.map(err => err.message).join('; ');
          failedImports.push({ row: rowNumber, data: row, reason: errors });
          return;
        }

        const { fullName, dateOfBirth, belt, weight, phone, email, idNumber, club } = parsed.data;

        // Split fullName into firstName and lastName
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const age = new Date().getFullYear() - dateOfBirth.getFullYear();

        const newAthlete: Athlete = {
          id: `athlete-${Date.now()}-${index}`, // Unique ID
          eventId: eventId!,
          firstName,
          lastName,
          dateOfBirth,
          age,
          club,
          gender: 'Outro', // Default, as gender is not in required fields for import
          belt,
          weight,
          email,
          phone,
          emiratesId: idNumber, // Assuming ID maps to emiratesId for now
          schoolId: undefined, // Not explicitly mapped
          consentAccepted: true, // Assuming consent for batch import
          consentDate: new Date(),
          consentVersion: '1.0',
        };
        successfulAthletes.push(newAthlete);
      } catch (error: any) {
        failedImports.push({ row: rowNumber, data: row, reason: error.message || 'Erro desconhecido' });
      }
    });

    // In a real application, you would send successfulAthletes to your backend API
    // For this MVP, we'll just log them and update a mock state.
    console.log('Atletas importados com sucesso (mock):', successfulAthletes);
    console.log('Atletas com falha na importação:', failedImports);

    setImportResults({
      success: successfulAthletes.length,
      failed: failedImports.length,
      errors: failedImports,
    });
    setStep('results');
  };

  const handleExportErrors = () => {
    if (!importResults || importResults.errors.length === 0) {
      showError('Não há erros para exportar.');
      return;
    }

    const errorCsvData = importResults.errors.map(error => ({
      'Linha do Arquivo': error.row,
      'Dados Originais': JSON.stringify(error.data),
      'Motivo do Erro': error.reason,
    }));

    const csv = Papa.unparse(errorCsvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `erros_importacao_atletas_evento_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Erros exportados com sucesso!');
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
            {step === 'upload' && 'Faça upload de um arquivo CSV para iniciar a importação de atletas.'}
            {step === 'map' && 'Mapeie as colunas do seu arquivo CSV para os campos de atleta.'}
            {step === 'review' && 'Revise os dados antes de finalizar a importação.'}
            {step === 'results' && 'Resultados da importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <Label htmlFor="athlete-file">Arquivo CSV</Label>
              <Input id="athlete-file" type="file" accept=".csv" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">
                Certifique-se de que seu arquivo CSV contenha as colunas necessárias: Nome do Atleta, Data de Nascimento (YYYY-MM-DD), Faixa (Branca, Azul, Roxa, Marrom, Preta), Peso (kg), Telefone (E.164), Email, ID (Emirates ID ou School ID), Clube.
              </p>
            </div>
          )}

          {step === 'map' && csvHeaders.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Mapeamento de Colunas</h3>
              <p className="text-muted-foreground">
                Selecione a coluna do seu arquivo CSV que corresponde a cada campo de atleta.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(requiredAthleteFields).map(([fieldKey, fieldLabel]) => (
                  <div key={fieldKey} className="flex flex-col space-y-1.5">
                    <Label htmlFor={`map-${fieldKey}`}>{fieldLabel}</Label>
                    <Select
                      onValueChange={(value) => handleMappingChange(fieldKey as RequiredAthleteField, value)}
                      value={columnMapping[fieldKey as RequiredAthleteField] || ''}
                    >
                      <SelectTrigger id={`map-${fieldKey}`}>
                        <SelectValue placeholder={`Selecione a coluna para ${fieldLabel}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
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
              <h3 className="text-xl font-semibold">Resultados da Importação</h3>
              <p className="text-lg">
                Atletas importados com sucesso: <span className="font-bold text-green-600">{importResults.success}</span>
              </p>
              <p className="text-lg">
                Atletas descartados: <span className="font-bold text-red-600">{importResults.failed}</span>
              </p>

              {importResults.errors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Problemas Encontrados:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Dados Originais</TableHead>
                        <TableHead>Problema</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {JSON.stringify(error.data)}
                          </TableCell>
                          <TableCell className="text-red-500">{error.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button onClick={handleExportErrors} variant="outline">Exportar Lista de Problemas (CSV)</Button>
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