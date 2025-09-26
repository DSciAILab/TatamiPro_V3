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
import { Division, AgeCategory, AthleteBelt, DivisionBelt, DivisionGender, Event } from '@/types/index'; // Importar tipos

const DivisionImport: React.FC = () => {
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

  const ageCategoryMap: { [key: string]: { min: number; max: number } } = {
    'kids': { min: 4, max: 6 },
    'juvenile': { min: 7, max: 9 },
    'adult': { min: 18, max: 29 },
    'master 1': { min: 30, max: 35 },
    'master 2': { min: 36, max: 40 },
    'master 3': { min: 41, max: 45 },
    'master 4': { min: 46, max: 50 },
    'master 5': { min: 51, max: 55 },
    'master 6': { min: 56, max: 60 },
    'master 7': { min: 61, max: 99 },
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
          const division: Partial<Division> = {};

          // Validate name
          if (!row.name || typeof row.name !== 'string') {
            errors.push(`Linha ${rowNum}: Nome (name) é obrigatório e deve ser uma string.`);
          }
          division.name = row.name as string;

          // Validate ageCategoryName and get age bounds
          const ageCategory = (row.ageCategoryName as string)?.toLowerCase();
          const ageBounds = ageCategoryMap[ageCategory];
          if (!ageCategory || !ageBounds) {
            errors.push(`Linha ${rowNum}: Categoria de Idade (ageCategoryName) inválida ou não reconhecida.`);
          } else {
            division.ageCategoryName = row.ageCategoryName as AgeCategory;
            division.minAge = ageBounds.min;
            division.maxAge = ageBounds.max;
          }

          // Validate maxWeight
          const maxWeight = parseFloat(row.maxWeight);
          if (isNaN(maxWeight) || maxWeight <= 0) {
            errors.push(`Linha ${rowNum}: Peso Máximo (maxWeight) inválido. Deve ser um número maior que 0.`);
          }
          division.maxWeight = maxWeight;
          division.minWeight = 0; // Default minWeight to 0 for simplicity in import

          // Validate gender
          const validGenders: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];
          if (!row.gender || !validGenders.includes(row.gender as DivisionGender)) {
            errors.push(`Linha ${rowNum}: Gênero (gender) inválido. Deve ser 'Masculino', 'Feminino' ou 'Ambos'.`);
          }
          division.gender = row.gender as DivisionGender;

          // Validate belt
          const validBelts: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];
          if (!row.belt || !validBelts.includes(row.belt as DivisionBelt)) {
            errors.push(`Linha ${rowNum}: Faixa (belt) inválida.`);
          }
          division.belt = row.belt as DivisionBelt;

          // Validate isEnabled
          const isEnabled = row.isEnabled === 'true' || row.isEnabled === true; // Allow 'true' string or boolean true
          division.isEnabled = isEnabled;

          division.id = uuidv4();

          return division;
        });

        setValidationErrors(errors);
        if (errors.length === 0) {
          setParsedData(processedData);
          showSuccess('CSV de divisões processado com sucesso! Revise antes de importar.');
        } else {
          showError('Erros encontrados no CSV de divisões. Por favor, corrija e tente novamente.');
        }
      },
      error: (error) => {
        showError(`Erro ao analisar o CSV: ${error.message}`);
        console.error('CSV parsing error:', error);
      }
    });
  };

  const handleImportDivisions = () => {
    if (validationErrors.length > 0) {
      showError('Não é possível importar divisões com erros de validação.');
      return;
    }
    if (parsedData.length === 0) {
      showError('Nenhuma divisão válida para importar.');
      return;
    }

    const existingEventData = localStorage.getItem(`event_${eventId}`);
    let currentEvent: Event | null = null;
    if (existingEventData) {
      try {
        currentEvent = JSON.parse(existingEventData) as Event; // Asserção de tipo aqui
      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
      }
    }

    if (currentEvent) {
      const updatedDivisions = [...currentEvent.divisions, ...(parsedData as Division[])];
      localStorage.setItem(`event_${eventId}`, JSON.stringify({ ...currentEvent, divisions: updatedDivisions }));
      showSuccess(`${parsedData.length} divisões importadas com sucesso!`);
      navigate(`/events/${eventId}`); // Redireciona de volta para a página de detalhes do evento
    } else {
      showError('Evento não encontrado para importar divisões.');
    }
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Importar Divisões em Lote para {eventId}</CardTitle>
          <CardDescription>
            Faça o upload de um arquivo CSV para importar múltiplas divisões de uma vez.
            <p className="mt-2">O arquivo CSV deve conter as seguintes colunas (case-sensitive):</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded-md mt-1">
              name,ageCategoryName (Kids/Adult/Master 1/etc.),maxWeight (kg),gender (Masculino/Feminino/Ambos),belt (Branca/Todas/etc.),isEnabled (true/false)
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
              <h3 className="text-xl font-semibold mb-4">Divisões a serem importadas ({parsedData.length})</h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria de Idade</TableHead>
                      <TableHead>Idade Mínima</TableHead>
                      <TableHead>Idade Máxima</TableHead>
                      <TableHead>Peso Máximo</TableHead>
                      <TableHead>Gênero</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Ativa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((division: Division) => (
                      <TableRow key={division.id}>
                        <TableCell className="font-medium">{division.name}</TableCell>
                        <TableCell>{division.ageCategoryName}</TableCell>
                        <TableCell>{division.minAge}</TableCell>
                        <TableCell>{division.maxAge}</TableCell>
                        <TableCell>{division.maxWeight}kg</TableCell>
                        <TableCell>{division.gender}</TableCell>
                        <TableCell>{division.belt}</TableCell>
                        <TableCell>{division.isEnabled ? 'Sim' : 'Não'}</TableCell>
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
              <Button onClick={handleImportDivisions} className="mt-4 w-full">
                Importar Divisões
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default DivisionImport;