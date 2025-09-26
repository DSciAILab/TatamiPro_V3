"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { z } from 'zod';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { Division, AgeCategory, DivisionBelt, DivisionGender } from '@/types/index'; // Importar tipos

// Mapeamento de categoria de idade para minAge/maxAge
const ageCategoryMap: { [key: string]: { min: number; max: number } } = {
  'kids 1': { min: 4, max: 6 },
  'kids 2': { min: 7, max: 8 },
  'kids 3': { min: 9, max: 10 },
  'infant': { min: 11, max: 12 },
  'junior': { min: 13, max: 14 },
  'teen': { min: 15, max: 15 },
  'juvenile': { min: 16, max: 17 },
  'adulto': { min: 18, max: 29 },
  'adult': { min: 18, max: 29 },
  'master': { min: 30, max: 99 },
};

// Define os campos mínimos esperados no arquivo de importação para divisões
const requiredDivisionFields = {
  name: 'Nome da Divisão', // Corresponde a Division.name
  ageCategory: 'Categoria de Idade', // Corresponde a Division.ageCategoryName e para derivar minAge/maxAge
  maxWeight: 'Peso Máximo', // minWeight removido
  gender: 'Gênero',
  belt: 'Faixa',
};

type RequiredDivisionField = keyof typeof requiredDivisionFields;

// Esquema de validação para os dados de entrada do CSV
const importSchema = z.object({
  name: z.string().min(1, { message: 'Nome da divisão é obrigatório.' }),
  ageCategory: z.string().transform((str, ctx) => {
    const lowerStr = str.toLowerCase();
    if (ageCategoryMap[lowerStr]) {
      return str as AgeCategory; // Retorna a string original se for uma categoria válida
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Categoria de idade inválida. Use: ${Object.keys(ageCategoryMap).join(', ')}.`,
    });
    return z.NEVER;
  }),
  maxWeight: z.coerce.number().min(0, { message: 'Peso máximo deve ser >= 0.' }), // minWeight removido
  gender: z.string().transform((str, ctx) => {
    const lowerStr = str.toLowerCase();
    if (lowerStr === 'masculino' || lowerStr === 'male') return 'Masculino';
    if (lowerStr === 'feminino' || lowerStr === 'female') return 'Feminino';
    if (lowerStr === 'ambos' || lowerStr === 'both') return 'Ambos';
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Gênero inválido. Use "Masculino", "Feminino" ou "Ambos" (ou seus equivalentes em inglês).',
    });
    return z.NEVER;
  }) as z.ZodType<DivisionGender>,
  belt: z.string().transform((str, ctx) => {
    const lowerStr = str.toLowerCase();
    if (lowerStr === 'branca' || lowerStr === 'white') return 'Branca';
    if (lowerStr === 'cinza' || lowerStr === 'grey' || lowerStr === 'gray') return 'Cinza';
    if (lowerStr === 'amarela' || lowerStr === 'yellow') return 'Amarela';
    if (lowerStr === 'laranja' || lowerStr === 'orange') return 'Laranja';
    if (lowerStr === 'verde' || lowerStr === 'green') return 'Verde';
    if (lowerStr === 'azul' || lowerStr === 'blue') return 'Azul';
    if (lowerStr === 'roxa' || lowerStr === 'purple') return 'Roxa';
    if (lowerStr === 'marrom' || lowerStr === 'brown') return 'Marrom';
    if (lowerStr === 'preta' || lowerStr === 'black') return 'Preta';
    if (lowerStr === 'todas' || lowerStr === 'all') return 'Todas';
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Faixa inválida. Use "Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Preta" ou "Todas" (ou seus equivalentes em inglês).',
    });
    return z.NEVER;
  }) as z.ZodType<DivisionBelt>,
}).refine(() => true, { // Validação de peso mínimo vs máximo removida aqui, pois minWeight não existe mais
  message: 'A validação de peso será feita na lógica de encaixe.',
  path: ['maxWeight'],
});

interface ImportResult {
  row: number;
  data: any;
  reason: string;
}

const DivisionImport: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<RequiredDivisionField, string | undefined>>(() => {
    const initialMapping: Partial<Record<RequiredDivisionField, string | undefined>> = {};
    Object.keys(requiredDivisionFields).forEach(key => {
      initialMapping[key as RequiredDivisionField] = undefined;
    });
    return initialMapping as Record<RequiredDivisionField, string | undefined>;
  });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: ImportResult[] } | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'results'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      setImportResults(null);

      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          if (results.errors.length) {
            showError('Erro ao parsear o arquivo CSV: ' + results.errors[0].message);
            setCsvHeaders([]);
            setCsvData([]);
            setStep('upload');
            return;
          }
          const headers = Object.keys(results.data[0] || {});
          setCsvHeaders(headers);
          setCsvData(results.data);
          setStep('map');

          const autoMapping: Partial<Record<RequiredDivisionField, string | undefined>> = {};
          Object.entries(requiredDivisionFields).forEach(([fieldKey, fieldLabel]) => {
            const foundHeader = headers.find(header => header.toLowerCase().includes(fieldLabel.toLowerCase().replace(/ /g, '')));
            if (foundHeader) {
              autoMapping[fieldKey as RequiredDivisionField] = foundHeader;
            }
          });
          setColumnMapping(prev => ({ ...prev, ...autoMapping }));
        },
        error: (err: any) => {
          showError('Erro ao ler o arquivo: ' + err.message);
          setCsvHeaders([]);
          setCsvData([]);
          setStep('upload');
        }
      });
    }
  };

  const handleMappingChange = (field: RequiredDivisionField, csvColumn: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: csvColumn }));
  };

  const validateMapping = () => {
    for (const field of Object.keys(requiredDivisionFields) as RequiredDivisionField[]) {
      if (!columnMapping[field]) {
        showError(`O campo "${requiredDivisionFields[field]}" não foi mapeado.`);
        return false;
      }
    }
    return true;
  };

  const handleProcessImport = () => {
    if (!validateMapping()) {
      return;
    }

    const successfulDivisions: Division[] = [];
    const failedImports: ImportResult[] = [];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2;
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

        const { name, ageCategory, maxWeight, gender, belt } = parsed.data; // minWeight removido

        const ageBounds = ageCategoryMap[ageCategory.toLowerCase()];
        if (!ageBounds) {
          failedImports.push({ row: rowNumber, data: row, reason: `Categoria de idade "${ageCategory}" não reconhecida.` });
          return;
        }

        const newDivision: Division = {
          id: `division-${Date.now()}-${index}`,
          name,
          minAge: ageBounds.min,
          maxAge: ageBounds.max,
          maxWeight, // minWeight removido
          gender,
          belt,
          ageCategoryName: ageCategory,
          isEnabled: true, // Default to enabled
        };
        successfulDivisions.push(newDivision);
      } catch (error: any) {
        failedImports.push({ row: rowNumber, data: row, reason: error.message || 'Erro desconhecido' });
      }
    });

    // Load existing event data to merge divisions
    const existingEventData = localStorage.getItem(`event_${eventId}`);
    let currentEvent = { divisions: [] };
    if (existingEventData) {
      try {
        currentEvent = JSON.parse(existingEventData);
      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
      }
    }

    const updatedDivisions = [...(currentEvent.divisions || []), ...successfulDivisions];
    localStorage.setItem(`event_${eventId}`, JSON.stringify({ ...currentEvent, divisions: updatedDivisions }));

    setImportResults({
      success: successfulDivisions.length,
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
    link.setAttribute('download', `erros_importacao_divisoes_evento_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Erros exportados com sucesso!');
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Importar Divisões em Lote para Evento #{eventId}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">Voltar para o Evento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importação de Divisões</CardTitle>
          <CardDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV para iniciar a importação de divisões.'}
            {step === 'map' && 'Mapeie as colunas do seu arquivo CSV para os campos de divisão.'}
            {step === 'review' && 'Revise os dados antes de finalizar a importação.'}
            {step === 'results' && 'Resultados da importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <Label htmlFor="division-file">Arquivo CSV</Label>
              <Input id="division-file" type="file" accept=".csv" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">
                Certifique-se de que seu arquivo CSV contenha as colunas necessárias: Nome da Divisão, Categoria de Idade (Kids 1, Kids 2, Kids 3, Infant, Junior, Teen, Juvenile, Adulto, Master), Peso Máximo (kg), Gênero (Masculino/Feminino/Ambos/Male/Female/Both), Faixa (Branca/Cinza/Amarela/Laranja/Verde/Azul/Roxa/Marrom/Preta/Todas, ou seus equivalentes em inglês).
              </p>
            </div>
          )}

          {step === 'map' && csvHeaders.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Mapeamento de Colunas</h3>
              <p className="text-muted-foreground">
                Selecione a coluna do seu arquivo CSV que corresponde a cada campo de divisão.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(requiredDivisionFields).map(([fieldKey, fieldLabel]) => (
                  <div key={fieldKey} className="flex flex-col space-y-1.5">
                    <Label htmlFor={`map-${fieldKey}`}>{fieldLabel}</Label>
                    <Select
                      onValueChange={(value) => handleMappingChange(fieldKey as RequiredDivisionField, value)}
                      value={columnMapping[fieldKey as RequiredDivisionField] || ''}
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
                Divisões importadas com sucesso: <span className="font-bold text-green-600">{importResults.success}</span>
              </p>
              <p className="text-lg">
                Divisões descartadas: <span className="font-bold text-red-600">{importResults.failed}</span>
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

export default DivisionImport;