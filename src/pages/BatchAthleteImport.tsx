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
import { showSuccess, showError } from '@/utils/toast';
import { Athlete, AthleteBelt, Gender } from '@/types/index'; // Usar AthleteBelt e Gender exportados
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { format } from 'date-fns';

const BatchAthleteImport: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
      setParsedData([]);
      setValidationErrors([]);
    }
  };

  const handleParseCsv = () => {
    if (!csvFile) {
      showError('Por favor, selecione um arquivo CSV.');
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const processedData = results.data.map((row: any, index) => {
          const rowNum = index + 2; // +1 for header, +1 for 0-indexed array
          const athlete: Partial<Athlete> = {};

          // Validate and assign firstName
          if (!row.firstName) errors.push(`Linha ${rowNum}: Nome (firstName) é obrigatório.`);
          athlete.firstName = row.firstName;

          // Validate and assign lastName
          if (!row.lastName) errors.push(`Linha ${rowNum}: Sobrenome (lastName) é obrigatório.`);
          athlete.lastName = row.lastName;

          // Validate and assign dateOfBirth
          try {
            const dob = new Date(row.dateOfBirth);
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
          const validGenders: Gender[] = ['Masculino', 'Feminino'];
          if (!row.gender || !validGenders.includes(row.gender as Gender)) {
            errors.push(`Linha ${rowNum}: Gênero (gender) inválido. Deve ser 'Masculino' ou 'Feminino'.`);
          }
          athlete.gender = row.gender as Gender;

          // Validate and assign nationality
          if (!row.nationality) errors.push(`Linha ${rowNum}: Nacionalidade (nationality) é obrigatória.`);
          athlete.nationality = row.nationality;

          // Validate and assign belt
          const validBelts: AthleteBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
          if (!row.belt || !validBelts.includes(row.belt as AthleteBelt)) {
            errors.push(`Linha ${rowNum}: Faixa (belt) inválida.`);
          }
          athlete.belt = row.belt as AthleteBelt;

          // Validate and assign weight
          const weight = parseFloat(row.weight);
          if (isNaN(weight) || weight <= 0) {
            errors.push(`Linha ${rowNum}: Peso (weight) inválido. Deve ser um número maior que 0.`);
          } else {
            athlete.weight = weight;
            athlete.weightDivision = getWeightDivision(weight);
          }

          // Validate and assign club
          if (!row.club) errors.push(`Linha ${rowNum}: Clube (club) é obrigatório.`);
          athlete.club = row.club;

          // Validate and assign email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!row.email || !emailRegex.test(row.email)) {
            errors.push(`Linha ${rowNum}: Email (email) inválido.`);
          }
          athlete.email = row.email;

          // Validate and assign phone
          if (!row.phone) errors.push(`Linha ${rowNum}: Telefone (phone) é obrigatório.`);
          athlete.phone = row.phone;

          // Validate and assign idNumber
          if (!row.idNumber) errors.push(`Linha ${rowNum}: Número de Identificação (idNumber) é obrigatório.`);
          athlete.idNumber = row.idNumber;

          // Optional fields
          athlete.emiratesId = row.emiratesId || undefined;
          athlete.schoolId = row.schoolId || undefined;
          athlete.photoUrl = row.photoUrl || undefined;
          athlete.emiratesIdFrontUrl = row.emiratesIdFrontUrl || undefined;
          athlete.emiratesIdBackUrl = row.emiratesIdBackUrl || undefined;
          athlete.paymentProofUrl = row.paymentProofUrl || undefined;

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

    // Store imported athletes temporarily in localStorage
    localStorage.setItem(`importedAthletes_${eventId}`, JSON.stringify(parsedData));
    showSuccess(`${parsedData.length} atletas importados com sucesso!`);
    navigate(`/events/${eventId}`); // Redirect back to event detail page
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Importar Atletas em Lote para {eventId}</CardTitle>
          <CardDescription>
            Faça o upload de um arquivo CSV para importar múltiplos atletas de uma vez.
            <p className="mt-2">O arquivo CSV deve conter as seguintes colunas (case-sensitive):</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded-md mt-1">
              firstName,lastName,dateOfBirth (YYYY-MM-DD),gender (Masculino/Feminino),nationality,belt (Branca/Azul/etc.),weight (kg),club,email,phone,idNumber (Emirates ID/School ID),emiratesId (opcional),schoolId (opcional),photoUrl (opcional),emiratesIdFrontUrl (opcional),emiratesIdBackUrl (opcional),paymentProofUrl (opcional)
            </p>
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
            <Button onClick={handleParseCsv} disabled={!csvFile} className="md:self-end">
              Processar CSV
            </Button>
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
    </Layout>
  );
};

export default BatchAthleteImport;