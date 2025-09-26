"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess, showError, showWarning } from '@/utils/toast';
import { Athlete, AthleteBelt, Gender } from '@/types/index';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { format } from 'date-fns';
import ColumnMappingDialog from '@/components/ColumnMappingDialog'; // Importar o novo componente

// Definir os campos esperados para atletas
const EXPECTED_ATHLETE_FIELDS = [
  { key: 'firstName', label: 'Nome', required: true },
  { key: 'lastName', label: 'Sobrenome', required: true },
  { key: 'dateOfBirth', label: 'Data de Nascimento (YYYY-MM-DD)', required: true },
  { key: 'gender', label: 'Gênero (Masculino/Feminino)', required: true },
  { key: 'nationality', label: 'Nacionalidade', required: true },
  { key: 'belt', label: 'Faixa (Branca/Azul/etc.)', required: true },
  { key: 'weight', label: 'Peso (kg)', required: true },
  { key: 'club', label: 'Clube', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Telefone', required: true },
  { key: 'idNumber', label: 'Número de Identificação', required: true },
  { key: 'emiratesId', label: 'Emirates ID', required: false },
  { key: 'schoolId', label: 'School ID', required: false },
  { key: 'photoUrl', label: 'URL da Foto', required: false },
  { key: 'emiratesIdFrontUrl', label: 'URL Frente Emirates ID', required: false },
  { key: 'emiratesIdBackUrl', label: 'URL Verso Emirates ID', required: false },
  { key: 'paymentProofUrl', label: 'URL Comprovante de Pagamento', required: false },
];

const BatchAthleteImport: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setCsvFile(file);
      setParsedData([]);
      setValidationErrors([]);
      setFileHeaders([]);
      setColumnMapping({});

      // Parse apenas os cabeçalhos para o mapeamento
      Papa.parse(file, {
        header: true,
        preview: 1, // Apenas a primeira linha para cabeçalhos
        complete: (results) => {
          if (results.meta.fields) {
            setFileHeaders(results.meta.fields);
            setShowMappingDialog(true); // Abre o diálogo de mapeamento
          } else {
            showError('Não foi possível extrair os cabeçalhos do arquivo CSV.');
          }
        },
        error: (error) => {
          showError(`Erro ao ler cabeçalhos do CSV: ${error.message}`);
          console.error('CSV header parsing error:', error);
        }
      });
    }
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    // Agora que temos o mapeamento, podemos processar o arquivo completo
    if (csvFile) {
      processFullCsv(csvFile, mapping);
    }
  };

  const processFullCsv = (file: File, mapping: Record<string, string>) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const processedData = results.data.map((row: any, index) => {
          const rowNum = index + 2; // +1 for header, +1 for 0-indexed array
          const athlete: Partial<Athlete> = {};

          // Helper para obter valor mapeado
          const getMappedValue = (fieldKey: string) => {
            const header = mapping[fieldKey];
            return header ? row[header] : undefined;
          };

          // Validate and assign firstName
          const firstName = getMappedValue('firstName');
          if (!firstName) errors.push(`Linha ${rowNum}: Nome (firstName) é obrigatório.`);
          athlete.firstName = firstName;

          // Validate and assign lastName
          const lastName = getMappedValue('lastName');
          if (!lastName) errors.push(`Linha ${rowNum}: Sobrenome (lastName) é obrigatório.`);
          athlete.lastName = lastName;

          // Validate and assign dateOfBirth
          const dateOfBirthStr = getMappedValue('dateOfBirth');
          try {
            const dob = new Date(dateOfBirthStr);
            if (isNaN(dob.getTime())) {
              errors.push(`Linha ${rowNum}: Data de Nascimento (dateOfBirth) inválida.`);
            } else {
              athlete.dateOfBirth = dob;
              athlete.age = new Date().getFullYear() - dob.getFullYear();
              athlete.ageDivision = getAgeDivision(athlete.age);
            }
          } catch (e) {
            errors.push(`Linha ${rowNum}: Data de Nascimento (dateOfBirth) inválida.`);
          }

          // Validate and assign gender
          const gender = getMappedValue('gender');
          const validGenders: Gender[] = ['Masculino', 'Feminino'];
          if (!gender || !validGenders.includes(gender as Gender)) {
            errors.push(`Linha ${rowNum}: Gênero (gender) inválido. Deve ser 'Masculino' ou 'Feminino'.`);
          }
          athlete.gender = gender as Gender;

          // Validate and assign nationality
          const nationality = getMappedValue('nationality');
          if (!nationality) errors.push(`Linha ${rowNum}: Nacionalidade (nationality) é obrigatória.`);
          athlete.nationality = nationality;

          // Validate and assign belt
          const belt = getMappedValue('belt');
          const validBelts: AthleteBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
          if (!belt || !validBelts.includes(belt as AthleteBelt)) {
            errors.push(`Linha ${rowNum}: Faixa (belt) inválida.`);
          }
          athlete.belt = belt as AthleteBelt;

          // Validate and assign weight
          const weightStr = getMappedValue('weight');
          const weight = parseFloat(weightStr);
          if (isNaN(weight) || weight <= 0) {
            errors.push(`Linha ${rowNum}: Peso (weight) inválido. Deve ser um número maior que 0.`);
          } else {
            athlete.weight = weight;
            athlete.weightDivision = getWeightDivision(weight);
          }

          // Validate and assign club
          const club = getMappedValue('club');
          if (!club) errors.push(`Linha ${rowNum}: Clube (club) é obrigatório.`);
          athlete.club = club;

          // Validate and assign email
          const email = getMappedValue('email');
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email || !emailRegex.test(email)) {
            errors.push(`Linha ${rowNum}: Email (email) inválido.`);
          }
          athlete.email = email;

          // Validate and assign phone
          const phone = getMappedValue('phone');
          if (!phone) errors.push(`Linha ${rowNum}: Telefone (phone) é obrigatório.`);
          athlete.phone = phone;

          // Validate and assign idNumber
          const idNumber = getMappedValue('idNumber');
          if (!idNumber) errors.push(`Linha ${rowNum}: Número de Identificação (idNumber) é obrigatório.`);
          athlete.idNumber = idNumber;

          // Optional fields
          athlete.emiratesId = getMappedValue('emiratesId') || undefined;
          athlete.schoolId = getMappedValue('schoolId') || undefined;
          athlete.photoUrl = getMappedValue('photoUrl') || undefined;
          athlete.emiratesIdFrontUrl = getMappedValue('emiratesIdFrontUrl') || undefined;
          athlete.emiratesIdBackUrl = getMappedValue('emiratesIdBackUrl') || undefined;
          athlete.paymentProofUrl = getMappedValue('paymentProofUrl') || undefined;

          athlete.id = uuidv4();
          athlete.consentDate = new Date();
          athlete.registrationStatus = 'under_approval';
          athlete.checkInStatus = 'pending';
          athlete.weightAttempts = [];
          athlete.attendanceStatus = 'pending';

          return athlete;
        });

        setValidationErrors(errors);
        if (errors.length === 0) {
          setParsedData(processedData);
          showSuccess('CSV processado com sucesso! Revise os atletas antes de importar.');
        } else {
          showError('Erros encontrados no CSV. Por favor, corrija e tente novamente.');
        }
      },
      error: (error) => {
        showError(`Erro ao analisar o CSV: ${error.message}`);
        console.error('CSV parsing error:', error);
      }
    });
  };

  const handleImportAthletes = () => {
    if (validationErrors.length > 0) {
      showError('Não é possível importar atletas com erros de validação.');
      return;
    }
    if (parsedData.length === 0) {
      showError('Nenhum atleta válido para importar.');
      return;
    }

    localStorage.setItem(`importedAthletes_${eventId}`, JSON.stringify(parsedData));
    showSuccess(`${parsedData.length} atletas importados com sucesso!`);
    navigate(`/events/${eventId}`);
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Importar Atletas em Lote para {eventId}</CardTitle>
          <CardDescription>
            Faça o upload de um arquivo CSV para importar múltiplos atletas de uma vez.
            Após o upload, você poderá mapear as colunas do seu arquivo para os campos esperados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="csvFile" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" /> Selecionar Arquivo CSV
              </Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
              {csvFile && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {csvFile.name}</p>}
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Erros de Validação:</strong>
              <ul className="mt-2 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Atletas a serem importados ({parsedData.length})</h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>Gênero</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Clube</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((athlete: Athlete) => (
                      <TableRow key={athlete.id}>
                        <TableCell className="font-medium">{athlete.firstName} {athlete.lastName}</TableCell>
                        <TableCell>{format(athlete.dateOfBirth, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{athlete.gender}</TableCell>
                        <TableCell>{athlete.belt}</TableCell>
                        <TableCell>{athlete.weight}kg</TableCell>
                        <TableCell>{athlete.club}</TableCell>
                        <TableCell>{athlete.email}</TableCell>
                        <TableCell>{athlete.idNumber}</TableCell>
                        <TableCell>
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" /> Válido
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImportAthletes} className="mt-4 w-full">
                Importar Atletas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ColumnMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        fileHeaders={fileHeaders}
        expectedFields={EXPECTED_ATHLETE_FIELDS}
        onConfirm={handleMappingConfirm}
      />
    </Layout>
  );
};

export default BatchAthleteImport;