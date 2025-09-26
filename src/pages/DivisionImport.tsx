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
import { Division, Gender, AthleteBelt } from '@/types/index';
import ColumnMappingDialog from '@/components/ColumnMappingDialog'; // Importar o novo componente

// Definir os campos esperados para divisões
const EXPECTED_DIVISION_FIELDS = [
  { key: 'name', label: 'Nome da Divisão', required: true },
  { key: 'gender', label: 'Gênero (Masculino/Feminino)', required: true },
  { key: 'minAge', label: 'Idade Mínima', required: true },
  { key: 'maxAge', label: 'Idade Máxima', required: true },
  { key: 'minWeight', label: 'Peso Mínimo (kg)', required: true },
  { key: 'maxWeight', label: 'Peso Máximo (kg)', required: true },
  { key: 'belt', label: 'Faixa (Branca/Azul/etc.)', required: true },
  { key: 'isNoGi', label: 'No-Gi (true/false)', required: false },
];

const DivisionImport: React.FC = () => {
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
          const division: Partial<Division> = {};

          // Helper para obter valor mapeado
          const getMappedValue = (fieldKey: string) => {
            const header = mapping[fieldKey];
            return header ? row[header] : undefined;
          };

          // Validate and assign name
          const name = getMappedValue('name');
          if (!name) errors.push(`Linha ${rowNum}: Nome da Divisão (name) é obrigatório.`);
          division.name = name;

          // Validate and assign gender
          const gender = getMappedValue('gender');
          const validGenders: Gender[] = ['Masculino', 'Feminino'];
          if (!gender || !validGenders.includes(gender as Gender)) {
            errors.push(`Linha ${rowNum}: Gênero (gender) inválido. Deve ser 'Masculino' ou 'Feminino'.`);
          }
          division.gender = gender as Gender;

          // Validate and assign minAge
          const minAgeStr = getMappedValue('minAge');
          const minAge = parseInt(minAgeStr);
          if (isNaN(minAge) || minAge < 0) {
            errors.push(`Linha ${rowNum}: Idade Mínima (minAge) inválida. Deve ser um número maior ou igual a 0.`);
          }
          division.minAge = minAge;

          // Validate and assign maxAge
          const maxAgeStr = getMappedValue('maxAge');
          const maxAge = parseInt(maxAgeStr);
          if (isNaN(maxAge) || maxAge < minAge) {
            errors.push(`Linha ${rowNum}: Idade Máxima (maxAge) inválida. Deve ser um número maior ou igual à Idade Mínima.`);
          }
          division.maxAge = maxAge;

          // Validate and assign minWeight
          const minWeightStr = getMappedValue('minWeight');
          const minWeight = parseFloat(minWeightStr);
          if (isNaN(minWeight) || minWeight < 0) {
            errors.push(`Linha ${rowNum}: Peso Mínimo (minWeight) inválido. Deve ser um número maior ou igual a 0.`);
          }
          division.minWeight = minWeight;

          // Validate and assign maxWeight
          const maxWeightStr = getMappedValue('maxWeight');
          const maxWeight = parseFloat(maxWeightStr);
          if (isNaN(maxWeight) || maxWeight < minWeight) {
            errors.push(`Linha ${rowNum}: Peso Máximo (maxWeight) inválido. Deve ser um número maior ou igual ao Peso Mínimo.`);
          }
          division.maxWeight = maxWeight;

          // Validate and assign belt
          const belt = getMappedValue('belt');
          const validBelts: AthleteBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
          if (!belt || !validBelts.includes(belt as AthleteBelt)) {
            errors.push(`Linha ${rowNum}: Faixa (belt) inválida.`);
          }
          division.belt = belt as AthleteBelt;

          // Optional field: isNoGi
          const isNoGiStr = getMappedValue('isNoGi');
          division.isNoGi = isNoGiStr ? (isNoGiStr.toLowerCase() === 'true' || isNoGiStr === '1') : false;

          division.id = uuidv4();
          division.eventId = eventId; // Associar à ID do evento

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
        showError(`Erro ao analisar o CSV de divisões: ${error.message}`);
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

    // Store imported divisions temporarily in localStorage
    localStorage.setItem(`importedDivisions_${eventId}`, JSON.stringify(parsedData));
    showSuccess(`${parsedData.length} divisões importadas com sucesso!`);
    navigate(`/events/${eventId}`); // Redirect back to event detail page
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Importar Divisões em Lote para {eventId}</CardTitle>
          <CardDescription>
            Faça o upload de um arquivo CSV para importar múltiplas divisões de uma vez.
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
              <h3 className="text-xl font-semibold mb-4">Divisões a serem importadas ({parsedData.length})</h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Gênero</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>No-Gi</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((division: Division) => (
                      <TableRow key={division.id}>
                        <TableCell className="font-medium">{division.name}</TableCell>
                        <TableCell>{division.gender}</TableCell>
                        <TableCell>{division.minAge}-{division.maxAge} anos</TableCell>
                        <TableCell>{division.minWeight}-{division.maxWeight}kg</TableCell>
                        <TableCell>{division.belt}</TableCell>
                        <TableCell>{division.isNoGi ? 'Sim' : 'Não'}</TableCell>
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

      <ColumnMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        fileHeaders={fileHeaders}
        expectedFields={EXPECTED_DIVISION_FIELDS}
        onConfirm={handleMappingConfirm}
      />
    </Layout>
  );
};

export default DivisionImport;