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
import { Division, DivisionBelt, DivisionGender, AgeCategory } from '@/types/index';
import ColumnMappingDialog from '@/components/ColumnMappingDialog';

// Define expected fields for divisions
const EXPECTED_DIVISION_FIELDS = [
  { key: 'name', label: 'Division Name', required: true },
  { key: 'gender', label: 'Gender (Male/Female/Both)', required: true },
  { key: 'ageCategoryName', label: 'Age Category (e.g., Adult, Master 1)', required: true },
  { key: 'minAge', label: 'Minimum Age', required: true },
  { key: 'maxAge', label: 'Maximum Age', required: true },
  { key: 'belt', label: 'Belt (e.g., Branca, Todas)', required: true },
  { key: 'minWeight', label: 'Minimum Weight (kg)', required: true },
  { key: 'maxWeight', label: 'Maximum Weight (kg)', required: true },
  { key: 'isNoGi', label: 'No-Gi (true/false)', required: false },
  { key: 'isEnabled', label: 'Enabled (true/false)', required: false },
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

      Papa.parse(file, {
        header: true,
        preview: 1,
        complete: (results) => {
          if (results.meta.fields) {
            setFileHeaders(results.meta.fields);
            setShowMappingDialog(true);
          } else {
            showError('Could not extract headers from the CSV file.');
          }
        },
        error: (error) => {
          showError(`Error reading CSV headers: ${error.message}`);
          console.error('CSV header parsing error:', error);
        }
      });
    }
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
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
          const rowNum = index + 2;
          const division: Partial<Division> = { eventId: eventId };

          const getMappedValue = (fieldKey: string) => {
            const header = mapping[fieldKey];
            return header ? row[header] : undefined;
          };

          // Validate and assign name
          const name = getMappedValue('name');
          if (!name) errors.push(`Row ${rowNum}: Division Name is required.`);
          division.name = name;

          // Validate and assign gender
          const gender = getMappedValue('gender');
          const validGenders: DivisionGender[] = ['Male', 'Female', 'Both']; // Updated to English
          if (!gender || !validGenders.includes(gender as DivisionGender)) {
            errors.push(`Row ${rowNum}: Invalid Gender. Must be 'Male', 'Female', or 'Both'.`);
          }
          division.gender = gender as DivisionGender;

          // Validate and assign ageCategoryName
          const ageCategoryName = getMappedValue('ageCategoryName');
          const validAgeCategories: AgeCategory[] = [
            'Kids I', 'Kids II', 'Kids III', 'Junior', 'Teen', 'Juvenile', 'Adult',
            'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'
          ];
          if (!ageCategoryName || !validAgeCategories.includes(ageCategoryName as AgeCategory)) {
            errors.push(`Row ${rowNum}: Invalid Age Category.`);
          }
          division.ageCategoryName = ageCategoryName as AgeCategory;

          // Validate and assign minAge
          const minAgeStr = getMappedValue('minAge');
          const minAge = parseInt(minAgeStr);
          if (isNaN(minAge) || minAge < 0) {
            errors.push(`Row ${rowNum}: Invalid Minimum Age. Must be a non-negative number.`);
          }
          division.minAge = minAge;

          // Validate and assign maxAge
          const maxAgeStr = getMappedValue('maxAge');
          const maxAge = parseInt(maxAgeStr);
          if (isNaN(maxAge) || maxAge < minAge) {
            errors.push(`Row ${rowNum}: Invalid Maximum Age. Must be a number greater than or equal to Minimum Age.`);
          }
          division.maxAge = maxAge;

          // Validate and assign belt
          const belt = getMappedValue('belt');
          const validBelts: DivisionBelt[] = ['Todas', 'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
          if (!belt || !validBelts.includes(belt as DivisionBelt)) {
            errors.push(`Row ${rowNum}: Invalid Belt.`);
          }
          division.belt = belt as DivisionBelt;

          // Validate and assign minWeight
          const minWeightStr = getMappedValue('minWeight');
          const minWeight = parseFloat(minWeightStr);
          if (isNaN(minWeight) || minWeight < 0) {
            errors.push(`Row ${rowNum}: Invalid Minimum Weight. Must be a non-negative number.`);
          }
          division.minWeight = minWeight;

          // Validate and assign maxWeight
          const maxWeightStr = getMappedValue('maxWeight');
          const maxWeight = parseFloat(maxWeightStr);
          if (isNaN(maxWeight) || maxWeight <= minWeight) {
            errors.push(`Row ${rowNum}: Invalid Maximum Weight. Must be a number greater than Minimum Weight.`);
          }
          division.maxWeight = maxWeight;

          // Optional fields
          const isNoGiStr = getMappedValue('isNoGi');
          division.isNoGi = isNoGiStr ? (isNoGiStr.toLowerCase() === 'true') : false;

          const isEnabledStr = getMappedValue('isEnabled');
          division.isEnabled = isEnabledStr ? (isEnabledStr.toLowerCase() === 'true') : true; // Default to true

          division.id = uuidv4();

          return division;
        });

        setValidationErrors(errors);
        if (errors.length === 0) {
          setParsedData(processedData);
          showSuccess('CSV processed successfully! Review divisions before importing.');
        } else {
          showError('Errors found in CSV. Please correct and try again.');
        }
      },
      error: (error) => {
        showError(`Error parsing CSV: ${error.message}`);
        console.error('CSV parsing error:', error);
      }
    });
  };

  const handleImportDivisions = () => {
    if (validationErrors.length > 0) {
      showError('Cannot import divisions with validation errors.');
      return;
    }
    if (parsedData.length === 0) {
      showError('No valid divisions to import.');
      return;
    }

    const existingEventData = localStorage.getItem(`event_${eventId}`);
    let eventToUpdate: any = { divisions: [] };
    if (existingEventData) {
      try {
        eventToUpdate = JSON.parse(existingEventData);
      } catch (e) {
        console.error("Failed to parse existing event data", e);
      }
    }

    const updatedDivisions = [...(eventToUpdate.divisions || []), ...parsedData];
    localStorage.setItem(`event_${eventId}`, JSON.stringify({ ...eventToUpdate, divisions: updatedDivisions }));

    showSuccess(`${parsedData.length} divisions imported successfully!`);
    navigate(`/events/${eventId}`);
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Batch Division Import for {eventId}</CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple divisions at once.
            After uploading, you can map your file columns to the expected fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="csvFile" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" /> Select CSV File
              </Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
              {csvFile && <p className="text-sm text-muted-foreground mt-1">Selected file: {csvFile.name}</p>}
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Validation Errors:</strong>
              <ul className="mt-2 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Divisions to be Imported ({parsedData.length})</h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age Category</TableHead>
                      <TableHead>Age Range</TableHead>
                      <TableHead>Belt</TableHead>
                      <TableHead>Weight Range</TableHead>
                      <TableHead>No-Gi</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((division: Division) => (
                      <TableRow key={division.id}>
                        <TableCell className="font-medium">{division.name}</TableCell>
                        <TableCell>{division.gender}</TableCell>
                        <TableCell>{division.ageCategoryName}</TableCell>
                        <TableCell>{division.minAge}-{division.maxAge}</TableCell>
                        <TableCell>{division.belt}</TableCell>
                        <TableCell>{division.minWeight}kg-{division.maxWeight}kg</TableCell>
                        <TableCell>{division.isNoGi ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{division.isEnabled ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" /> Valid
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImportDivisions} className="mt-4 w-full">
                Import Divisions
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