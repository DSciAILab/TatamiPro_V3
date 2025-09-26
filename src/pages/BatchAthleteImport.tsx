"use client";

import React, { useState, useMemo } from 'react';
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
import { Athlete, Belt, Gender } from '@/types/index';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';

// Define os campos mínimos esperados no arquivo de importação
const baseRequiredAthleteFields = {
  fullName: 'Nome Completo', // Agora lida com o nome completo
  dateOfBirth: 'Data de Nascimento',
  belt: 'Faixa',
  weight: 'Peso',
  phone: 'Telefone', // Será opcional no esquema
  email: 'Email',   // Será opcional no esquema
  idNumber: 'ID (Emirates ID ou School ID)', // Permanece obrigatório via refine
  club: 'Clube',
  gender: 'Gênero',
  nationality: 'Nacionalidade',
  photoUrl: 'URL da Foto de Perfil',
  emiratesIdFrontUrl: 'URL da Frente do EID',
  emiratesIdBackUrl: 'URL do Verso do EID',
  paymentProofUrl: 'URL do Comprovante de Pagamento',
};

type RequiredAthleteField = keyof typeof baseRequiredAthleteFields;

// Define os esquemas base para campos de importação
const importFullNameSchema = z.string()
  .min(1, { message: 'Nome completo é obrigatório.' })
  .transform(str => str.replace(/\s+/g, ' ').trim()) // Normaliza espaços
  .refine(str => str.split(' ').filter(Boolean).length >= 2, { message: 'Nome completo deve conter pelo menos duas palavras.' }) // Não aceita um único nome
  .transform(str => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')); // Capitaliza a primeira letra de cada palavra

const importDateOfBirthSchema = z.string().transform((str, ctx) => {
  try {
    const date = parseISO(str);
    if (isNaN(date.getTime())) {
      throw new Error('Formato de data inválido. Use YYYY-MM-DD.');
    }
    return date;
  } catch (e: any) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    return z.NEVER;
  }
}).pipe(z.date());

const importBeltSchema = z.string().transform((str, ctx) => {
  const lowerStr = str.toLowerCase();
  const validBelts = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta', 'white', 'grey', 'gray', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'];
  if (validBelts.includes(lowerStr)) {
    // Retorna a versão padronizada em português para o tipo Belt
    if (lowerStr === 'white') return 'Branca';
    if (lowerStr === 'grey' || lowerStr === 'gray') return 'Cinza';
    if (lowerStr === 'yellow') return 'Amarela';
    if (lowerStr === 'orange') return 'Laranja';
    if (lowerStr === 'green') return 'Verde';
    if (lowerStr === 'blue') return 'Azul';
    if (lowerStr === 'purple') return 'Roxa';
    if (lowerStr === 'brown') return 'Marrom';
    if (lowerStr === 'black') return 'Preta';
    return str as Belt; // Se já estiver em português, mantém
  }
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Faixa inválida.' });
  return z.NEVER;
}).pipe(z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta']));

const importWeightSchema = z.coerce.number().min(20, { message: 'Peso deve ser no mínimo 20kg.' }).max(200, { message: 'Peso deve ser no máximo 200kg.' });

// Email e Telefone agora são opcionais
const importPhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido (formato E.164).' }).optional().or(z.literal(''));
const importEmailSchema = z.string().email({ message: 'Email inválido.' }).optional().or(z.literal(''));

const importClubSchema = z.string().min(1, { message: 'Clube é obrigatório.' });

const importGenderSchema = z.string().transform((str, ctx) => {
  const lowerStr = str.toLowerCase();
  const validGenders = ['masculino', 'feminino', 'outro', 'male', 'female', 'other'];
  if (validGenders.includes(lowerStr)) {
    // Retorna a versão padronizada em português para o tipo Gender
    if (lowerStr === 'male') return 'Masculino';
    if (lowerStr === 'female') return 'Feminino';
    if (lowerStr === 'other') return 'Outro';
    return str as Gender; // Se já estiver em português, mantém
  }
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gênero inválido.' });
  return z.NEVER;
}).pipe(z.enum(['Masculino', 'Feminino', 'Outro']));

const importNationalitySchema = z.string().min(2, { message: 'Nacionalidade é obrigatória.' });

const importIdNumberSchema = z.string().optional(); // Pode ser Emirates ID ou School ID

const importUrlSchema = z.string().url().optional().or(z.literal(''));


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
    Object.keys(baseRequiredAthleteFields).forEach(key => {
      initialMapping[key as RequiredAthleteField] = undefined;
    });
    return initialMapping as Record<RequiredAthleteField, string | undefined>;
  });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: ImportResult[] } | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'results'>('upload');

  // Mock para a configuração de campos obrigatórios (em um cenário real viria do backend ou localStorage)
  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      belt: true,
      weight: true,
      idNumber: true, // ID (Emirates ID ou School ID)
      gender: true,
      nationality: true,
      email: true,
      phone: true,
      photo: false,
      emiratesIdFront: false,
      emiratesIdBack: false,
      paymentProof: false,
    };
  }, [eventId]);

  // Função para criar o esquema de validação dinamicamente
  const createDynamicImportSchema = (config: Record<string, boolean>) => {
    const schemaDefinition = {
      fullName: importFullNameSchema,
      dateOfBirth: importDateOfBirthSchema,
      belt: importBeltSchema,
      weight: importWeightSchema,
      phone: importPhoneSchema, // Sempre opcional para importação
      email: importEmailSchema,   // Sempre opcional para importação
      idNumber: importIdNumberSchema,
      club: importClubSchema,
      gender: importGenderSchema,
      nationality: importNationalitySchema,
      photoUrl: config.photo
        ? z.string().url({ message: 'URL da foto de perfil inválida.' }).min(1, { message: 'URL da foto de perfil é obrigatória.' })
        : importUrlSchema,
      emiratesIdFrontUrl: config.emiratesIdFront
        ? z.string().url({ message: 'URL da frente do EID inválida.' }).min(1, { message: 'URL da frente do EID é obrigatória.' })
        : importUrlSchema,
      emiratesIdBackUrl: config.emiratesIdBack
        ? z.string().url({ message: 'URL do verso do EID inválida.' }).min(1, { message: 'URL do verso do EID é obrigatória.' })
        : importUrlSchema,
      paymentProofUrl: config.paymentProof
        ? z.string().url({ message: 'URL do comprovante de pagamento inválida.' }).min(1, { message: 'URL do comprovante de pagamento é obrigatória.' })
        : importUrlSchema,
    };

    return z.object(schemaDefinition).refine(data => data.idNumber, {
      message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
      path: ['idNumber'],
    });
  };

  const currentImportSchema = useMemo(() => createDynamicImportSchema(mandatoryFieldsConfig), [mandatoryFieldsConfig]);

  // Define output type for parsed data
  type AthleteImportOutput = z.output<typeof currentImportSchema>;

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
          Object.entries(baseRequiredAthleteFields).forEach(([fieldKey, fieldLabel]) => {
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
    for (const field of Object.keys(baseRequiredAthleteFields) as RequiredAthleteField[]) {
      // Campos que são sempre obrigatórios para importação (conforme solicitação do usuário e lógica existente)
      const alwaysMandatoryForImport = ['fullName', 'dateOfBirth', 'belt', 'weight', 'idNumber', 'club', 'gender', 'nationality'];
      const isMandatory = alwaysMandatoryForImport.includes(field);

      if (isMandatory && !columnMapping[field]) {
        showError(`O campo "${baseRequiredAthleteFields[field]}" não foi mapeado.`);
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

        const parsed = currentImportSchema.safeParse(mappedData);

        if (!parsed.success) {
          const errors = parsed.error.errors.map(err => err.message).join('; ');
          failedImports.push({ row: rowNumber, data: row, reason: errors });
          return;
        }

        const { fullName, dateOfBirth, belt, weight, phone, email, idNumber, club, gender, nationality, photoUrl, emiratesIdFrontUrl, emiratesIdBackUrl, paymentProofUrl } = parsed.data as AthleteImportOutput;

        const nameParts = fullName.split(' ').filter(Boolean);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' '); // O restante do nome como sobrenome

        const age = new Date().getFullYear() - dateOfBirth.getFullYear();
        const ageDivision = getAgeDivision(age);
        const weightDivision = getWeightDivision(weight);

        const newAthlete: Athlete = {
          id: `athlete-${Date.now()}-${index}`, // Unique ID
          eventId: eventId!,
          firstName,
          lastName,
          dateOfBirth,
          age,
          club,
          gender,
          belt,
          weight,
          nationality,
          ageDivision,
          weightDivision,
          email: email || '', // Garante que email é string, mesmo se opcional
          phone: phone || '', // Garante que phone é string, mesmo se opcional
          emiratesId: idNumber, // Assumindo que ID mapeia para emiratesId por enquanto
          schoolId: undefined, // Não explicitamente mapeado
          photoUrl: photoUrl || undefined,
          emiratesIdFrontUrl: emiratesIdFrontUrl || undefined,
          emiratesIdBackUrl: emiratesIdBackUrl || undefined,
          consentAccepted: true, // Assumindo consentimento para importação em lote
          consentDate: new Date(),
          consentVersion: '1.0',
          paymentProofUrl: paymentProofUrl || undefined,
          registrationStatus: 'under_approval',
          checkInStatus: 'pending',
          registeredWeight: undefined,
          weightAttempts: [],
          attendanceStatus: 'pending', // Default attendance status
        };
        successfulAthletes.push(newAthlete);
      } catch (error: any) {
        failedImports.push({ row: rowNumber, data: row, reason: error.message || 'Erro desconhecido' });
      }
    });

    // Store successful athletes in localStorage for EventDetail to pick up
    if (successfulAthletes.length > 0) {
      const existingImportedAthletes = JSON.parse(localStorage.getItem(`importedAthletes_${eventId}`) || '[]') as Athlete[];
      const updatedImportedAthletes = [...existingImportedAthletes, ...successfulAthletes];
      localStorage.setItem(`importedAthletes_${eventId}`, JSON.stringify(updatedImportedAthletes));
    }

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
        <Button onClick={() => navigate(`/events/${eventId}/registration-options`)} variant="outline">Voltar para Opções de Inscrição</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importação de Atletas</CardTitle>
          <CardDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV para iniciar a importação de atletas.'}
            {step === 'map' && 'Mapeie as colunas do seu arquivo CSV para os campos de atleta.'}
            {step === 'results' && 'Resultados da importação.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <Label htmlFor="athlete-file">Arquivo CSV</Label>
              <Input id="athlete-file" type="file" accept=".csv" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">
                Certifique-se de que seu arquivo CSV contenha as colunas necessárias: Nome Completo (pelo menos duas palavras), Data de Nascimento (YYYY-MM-DD), Faixa (Branca, Cinza, Amarela, Laranja, Verde, Azul, Roxa, Marrom, Preta, ou seus equivalentes em inglês), Peso (kg), ID (Emirates ID ou School ID), Clube, Gênero (Masculino/Feminino/Outro/Male/Female/Other), Nacionalidade. Campos opcionais: Telefone (E.164), Email, URL da Foto de Perfil, URL da Frente do EID, URL do Verso do EID, URL do Comprovante de Pagamento.
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
                {Object.entries(baseRequiredAthleteFields).map(([fieldKey, fieldLabel]) => (
                  <div key={fieldKey} className="flex flex-col space-y-1.5">
                    <Label htmlFor={`map-${fieldKey}`}>
                      {fieldLabel}
                      {(['fullName', 'dateOfBirth', 'belt', 'weight', 'idNumber', 'club', 'gender', 'nationality'].includes(fieldKey)) && <span className="text-red-500">*</span>}
                    </Label>
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