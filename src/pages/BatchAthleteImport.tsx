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
import ColumnMappingDialog from '@/components/ColumnMappingDialog';

// Define expected fields for athletes
const EXPECTED_ATHLETE_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'dateOfBirth', label: 'Date of Birth (YYYY-MM-DD)', required: true },
  { key: 'gender', label: 'Gender (Male/Female)', required: true }, // Updated label
  { key: 'nationality', label: 'Nationality', required: true },
  { key: 'belt', label: 'Belt (White/Blue/etc.)', required: true },
  { key: 'weight', label: 'Weight (kg)', required: true },
  { key: 'club', label: 'Club', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'idNumber', label: 'Identification Number', required: true },
  { key: 'emiratesId', label: 'Emirates ID', required: false },
  { key: 'schoolId', label: 'School ID', required: false },
  { key: 'photoUrl', label: 'Photo URL', required: false },
  { key: 'emiratesIdFrontUrl', label: 'Emirates ID Front URL', required: false },
  { key: 'emiratesIdBackUrl', label: 'Emirates ID Back URL', required: false },
  { key: 'paymentProofUrl', label: 'Payment Proof URL', required: false },
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

      // Parse only headers for mapping
      Papa.parse(file, {
        header: true,
        preview: 1, // Only the first row for headers
        complete: (results) => {
          if (results.meta.fields) {
            setFileHeaders(results.meta.fields);
            setShowMappingDialog(true); // Open mapping dialog
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
    // Now that we have the mapping, we can process the full file
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

          // Helper to get mapped value
          const getMappedValue = (fieldKey: string) => {
            const header = mapping[fieldKey];
            return header ? row[header] : undefined;
          };

          // Validate and assign firstName
          const firstName = getMappedValue('firstName');
          if (!firstName) errors.push(`Row ${rowNum}: First Name is required.`);
          athlete.firstName = firstName;

          // Validate and assign lastName
          const lastName = getMappedValue('lastName');
          if (!lastName) errors.push(`Row ${rowNum}: Last Name is required.`);
          athlete.lastName = lastName;

          // Validate and assign dateOfBirth
          const dateOfBirthStr = getMappedValue('dateOfBirth');
          try {
            const dob = new Date(dateOfBirthStr);
            if (isNaN(dob.getTime())) {
              errors.push(`Row ${rowNum}: Invalid Date of Birth.`);
            } else {
              athlete.dateOfBirth = dob;
              athlete.age = new Date().getFullYear() - dob.getFullYear();
              athlete.ageDivision = getAgeDivision(athlete.age);
            }
          } catch (e) {
            errors.push(`Row ${rowNum}: Invalid Date of Birth.`);
          }

          // Validate and assign gender
          const gender = getMappedValue('gender');
          const validGenders: Gender[] = ['Male', 'Female']; // Updated to English
          if (!gender || !validGenders.includes(gender as Gender)) {
            errors.push(`Row ${rowNum}: Invalid Gender. Must be 'Male' or 'Female'.`); // Updated message
          }
          athlete.gender = gender as Gender;

          // Validate and assign nationality
          const nationality = getMappedValue('nationality');
          if (!nationality) errors.push(`Row ${rowNum}: Nationality is required.`);
          athlete.nationality = nationality;

          // Validate and assign belt
          const belt = getMappedValue('belt');
          const validBelts: AthleteBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
          if (!belt || !validBelts.includes(belt as AthleteBelt)) {
            errors.push(`Row ${rowNum}: Invalid Belt.`);
          }
          athlete.belt = belt as AthleteBelt;

          // Validate and assign weight
          const weightStr = getMappedValue('weight');
          const weight = parseFloat(weightStr);
          if (isNaN(weight) || weight <= 0) {
            errors.push(`Row ${rowNum}: Invalid Weight. Must be a number greater than 0.`);
          } else {
            athlete.weight = weight;
            athlete.weightDivision = getWeightDivision(weight);
          }

          // Validate and assign club
          const club = getMappedValue('club');
          if (!club) errors.push(`Row ${rowNum}: Club is required.`);
          athlete.club = club;

          // Validate and assign email
          const email = getMappedValue('email');
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email || !emailRegex.test(email)) {
            errors.push(`Row ${rowNum}: Invalid Email.`);
          }
          athlete.email = email;

          // Validate and assign phone
          const phone = getMappedValue('phone');
          if (!phone) errors.push(`Row ${rowNum}: Phone is required.`);
          athlete.phone = phone;

          // Validate and assign idNumber
          const idNumber = getMappedValue('idNumber');
          if (!idNumber) errors.push(`Row ${rowNum}: Identification Number is required.`);
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
          showSuccess('CSV processed successfully! Review athletes before importing.');
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

  const handleImportAthletes = () => {
    if (validationErrors.length > 0) {
      showError('Cannot import athletes with validation errors.');
      return;
    }
    if (parsedData.length === 0) {
      showError('No valid athletes to import.');
      return;
    }

    localStorage.setItem(`importedAthletes_${eventId}`, JSON.stringify(parsedData));
    showSuccess(`${parsedData.length} athletes imported successfully!`);
    navigate(`/events/${eventId}`);
  };

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Batch Athlete Import for {eventId}</CardTitle> {/* Translated */}
          <CardDescription>
            Upload a CSV file to import multiple athletes at once.
            After uploading, you can map your file columns to the expected fields.
          </CardDescription> {/* Translated */}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="csvFile" className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4" /> Select CSV File {/* Translated */}
              </Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
              {csvFile && <p className="text-sm text-muted-foreground mt-1">Selected file: {csvFile.name}</p>} {/* Translated */}
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Validation Errors:</strong> {/* Translated */}
              <ul className="mt-2 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Athletes to be Imported ({parsedData.length})</h3> {/* Translated */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead> {/* Translated */}
                      <TableHead>Birth Date</TableHead> {/* Translated */}
                      <TableHead>Gender</TableHead> {/* Translated */}
                      <TableHead>Belt</TableHead> {/* Translated */}
                      <TableHead>Weight</TableHead> {/* Translated */}
                      <TableHead>Club</TableHead> {/* Translated */}
                      <TableHead>Email</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead> {/* Translated */}
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
                            <CheckCircle className="h-4 w-4 mr-1" /> Valid {/* Translated */}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImportAthletes} className="mt-4 w-full">
                Import Athletes {/* Translated */}
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