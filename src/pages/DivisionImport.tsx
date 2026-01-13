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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2 } from "lucide-react";
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { AgeCategory, DivisionBelt, DivisionGender } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { getAppId } from '@/lib/app-id';

const ageCategoryMap: { [key: string]: { min: number; max: number } } = {
  'kids 1': { min: 4, max: 5 }, 'kids 2': { min: 6, max: 7 }, 'kids 3': { min: 8, max: 9 },
  'infant': { min: 10, max: 11  }, 'junior': { min: 12, max: 13 }, 'teen': { min: 14, max: 15 },
  'juvenile': { min: 16, max: 17 }, 'adulto': { min: 18, max: 29 }, 'adult': { min: 18, max: 29 },
  'master': { min: 30, max: 99 },
};

const requiredDivisionFields = {
  name: 'Nome da Divisão', age_category_name: 'Categoria de Idade', max_weight: 'Peso Máximo',
  gender: 'Gênero', belt: 'Faixa',
};
type RequiredDivisionField = keyof typeof requiredDivisionFields;

const importSchema = z.object({
  name: z.string().min(1),
  age_category_name: z.string().transform((str, ctx) => {
    const lower = str.toLowerCase();
    if (ageCategoryMap[lower]) return str as AgeCategory;
    const validValues = Object.keys(ageCategoryMap).join(', ');
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      message: `Categoria de idade inválida: '${str}'. Valores esperados: ${validValues}` 
    });
    return z.NEVER;
  }),
  max_weight: z.coerce.number().min(0),
  gender: z.string().transform((str, ctx) => {
    const lower = str.toLowerCase();
    if (['masculino', 'male'].includes(lower)) return 'Masculino';
    if (['feminino', 'female'].includes(lower)) return 'Feminino';
    if (['ambos', 'both'].includes(lower)) return 'Ambos';
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      message: `Gênero inválido: '${str}'. Valores esperados: Masculino, Feminino, Ambos` 
    });
    return z.NEVER;
  }) as z.ZodType<DivisionGender>,
  belt: z.string().transform((str, ctx) => {
    const lower = str.toLowerCase();
    const beltMap: { [key: string]: DivisionBelt } = {
      'branca': 'Branca', 'white': 'Branca', 'cinza': 'Cinza', 'grey': 'Cinza', 'gray': 'Cinza',
      'amarela': 'Amarela', 'yellow': 'Amarela', 'laranja': 'Laranja', 'orange': 'Laranja',
      'verde': 'Verde', 'green': 'Verde', 'azul': 'Azul', 'blue': 'Azul', 'roxa': 'Roxa',
      'purple': 'Roxa', 'marrom': 'Marrom', 'brown': 'Marrom', 'preta': 'Preta', 'black': 'Preta',
      'todas': 'Todas', 'all': 'Todas',
    };
    if (beltMap[lower]) return beltMap[lower];
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      message: `Faixa inválida: '${str}'. Valores esperados: Branca, Cinza, Amarela, Laranja, Verde, Azul, Roxa, Marrom, Preta, Todas` 
    });
    return z.NEVER;
  }) as z.ZodType<DivisionBelt>,
});

interface ImportResult { row: number; data: any; reason: string; }

const DivisionImport: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<RequiredDivisionField, string | undefined>>(() => ({} as any));
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: ImportResult[] } | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'results'>('upload');
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseCsvFile(e.target.files[0]);
    }
  };

  const parseCsvFile = (file: File | string) => {
      Papa.parse(file as any, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length && results.data.length === 0) {
            showError('Erro ao parsear o arquivo CSV: ' + results.errors[0].message);
            return;
          }
          const data = results.data;
          const headers = results.meta.fields || Object.keys(data[0] || {});
          
          if (headers.length === 0) {
             showError("A planilha parece estar vazia ou sem cabeçalhos.");
             return;
          }

          setCsvHeaders(headers);
          setCsvData(data);
          setStep('map');

          // Auto-mapping
           const autoMapping: Partial<Record<RequiredDivisionField, string>> = {};
           Object.entries(requiredDivisionFields).forEach(([key, label]) => {
             const found = headers.find(h => h.toLowerCase().replace(/ /g, "") === label.toLowerCase().replace(/ /g, ""));
             if (found) autoMapping[key as RequiredDivisionField] = found;
           });
           setColumnMapping(prev => ({ ...prev, ...autoMapping }));
        },
        error: (err: any) => showError('Erro ao ler o arquivo: ' + err.message)
      });
  };

  const handleUrlImport = async () => {
    if (!sheetUrl) {
      showError("Por favor, insira a URL da planilha.");
      return;
    }

    setIsLoadingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-sheet', {
        body: { sheetUrl }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      parseCsvFile(data.csvData);

    } catch (err: any) {
      console.error("Error fetching sheet:", err);
      showError("Falha ao importar planilha. Verifique se o link é público. " + err.message);
    } finally {
      setIsLoadingUrl(false);
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

  const handleProcessImport = async () => {
    if (!validateMapping()) return;
    const loadingToast = showLoading('Processando importação...');

    const appId = await getAppId();
    const successfulDivisionsForDb: any[] = [];
    const failedImports: ImportResult[] = [];

    csvData.forEach((row, index) => {
      try {
        const mappedData: Record<string, any> = {};
        for (const [key, col] of Object.entries(columnMapping)) {
          if (col) mappedData[key] = row[col];
        }
        const parsed = importSchema.safeParse(mappedData);
        if (!parsed.success) {
          throw new Error(parsed.error.errors.map(e => e.message).join('; '));
        }
        const data = parsed.data;
        const ageBounds = ageCategoryMap[data.age_category_name.toLowerCase()];
        successfulDivisionsForDb.push({
          id: uuidv4(),
          event_id: eventId,
          app_id: appId, // Required field
          name: data.name,
          min_age: ageBounds.min,
          max_age: ageBounds.max,
          max_weight: data.max_weight,
          gender: data.gender,
          belt: data.belt,
          age_category_name: data.age_category_name,
          is_enabled: true,
        });
      } catch (error: any) {
        failedImports.push({ row: index + 2, data: row, reason: error.message });
      }
    });

    if (successfulDivisionsForDb.length > 0) {
      const { error } = await supabase.from('sjjp_divisions').insert(successfulDivisionsForDb);
      if (error) {
        dismissToast(loadingToast);
        showError(`Erro ao salvar no banco de dados: ${error.message}`);
        return;
      }
    }

    dismissToast(loadingToast);
    setImportResults({
      success: successfulDivisionsForDb.length,
      failed: failedImports.length,
      errors: failedImports,
    });
    setStep('results');
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Importar Divisões para Evento #{eventId}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">Voltar</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Importação de Divisões</CardTitle>
          <CardDescription>
            {step === 'upload' && 'Escolha a fonte dos dados.'}
            {step === 'map' && 'Mapeie as colunas do seu arquivo.'}
            {step === 'results' && 'Resultados da importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
             <Tabs defaultValue="upload" className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-4">
                 <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                 <TabsTrigger value="url">Importar via URL</TabsTrigger>
               </TabsList>
               
               <TabsContent value="upload">
                <div className="space-y-4">
                  <Label htmlFor="division-file">Arquivo CSV</Label>
                  <Input id="division-file" type="file" accept=".csv" onChange={handleFileChange} />
                  <p className="text-sm text-muted-foreground">Faça upload de um arquivo .csv do seu computador.</p>
                </div>
               </TabsContent>

               <TabsContent value="url">
                <div className="space-y-4">
                  <Label htmlFor="sheet-url">URL do Arquivo (Google Sheets ou CSV)</Label>
                  <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="sheet-url"
                          type="url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="pl-9"
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleUrlImport} disabled={isLoadingUrl}>
                        {isLoadingUrl ? "Carregando..." : "Carregar"}
                      </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                    <p className="font-semibold mb-1">Dicas:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Google Sheets:</strong> Use o link público (Compartilhar - Qualquer pessoa com o link).</li>
                        <li><strong>CSV:</strong> Link direto para arquivo .csv.</li>
                    </ul>
                  </div>
                </div>
               </TabsContent>
            </Tabs>
          )}

          {step === 'map' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(requiredDivisionFields).map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={`map-${key}`}>{label}</Label>
                    <Select onValueChange={(v) => handleMappingChange(key as RequiredDivisionField, v)} value={columnMapping[key as RequiredDivisionField] || ''}>
                      <SelectTrigger><SelectValue placeholder={`Selecione a coluna para ${label}`} /></SelectTrigger>
                      <SelectContent>
                        {csvHeaders.filter(h => h && h.trim() !== '').map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={handleProcessImport} className="w-full">Processar</Button>
            </div>
          )}
          {step === 'results' && importResults && (
            <div className="space-y-6">
              <p>Sucesso: {importResults.success}</p>
              <p>Falhas: {importResults.failed}</p>
              {importResults.errors.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {importResults.errors.map((e, i) => <TableRow key={i}><TableCell>{e.row}</TableCell><TableCell>{e.reason}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              )}
              <Button onClick={() => navigate(`/events/${eventId}`)} className="w-full">Voltar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default DivisionImport;