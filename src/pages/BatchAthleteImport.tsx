"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link2 } from "lucide-react";
import { parseISO, parse, isValid } from "date-fns";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { Belt, Gender, AgeDivisionSetting } from "@/types/index";
import { getAgeDivision, getWeightDivision } from "@/utils/athlete-utils";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { getAppId } from "@/lib/app-id";
import { getStoredMapping, saveStoredMapping } from "@/utils/csv-mapping";

// Define os campos mínimos esperados no arquivo de importação
const baseRequiredAthleteFields = {
  fullName: "Nome Completo",
  date_of_birth: "Data de Nascimento",
  belt: "Faixa",
  weight: "Peso",
  phone: "Telefone",
  email: "Email",
  idNumber: "ID (Emirates ID ou School ID)",
  club: "Clube",
  gender: "Gênero",
  nationality: "Nacionalidade",
  photo_url: "URL da Foto de Perfil",
  emirates_id_front_url: "URL da Frente do EID",
  emirates_id_back_url: "URL do Verso do EID",
  payment_proof_url: "URL do Comprovante de Pagamento",
};

type RequiredAthleteField = keyof typeof baseRequiredAthleteFields;

// Define os esquemas base para campos de importação
const importFullNameSchema = z
  .string()
  .min(1, { message: "Nome completo é obrigatório." })
  .transform((str) => str.replace(/\s+/g, " ").trim())
  .refine((str) => str.split(" ").filter(Boolean).length >= 2, {
    message: "Nome completo deve conter pelo menos duas palavras.",
  })
  .transform((str) =>
    str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  );

const importDateOfBirthSchema = z.string().transform((str, ctx) => {
  // List of date formats to try (most common first)
  const dateFormats = [
    'dd/MM/yyyy',  // Brazilian/European format
    'dd-MM-yyyy',  // Brazilian/European format with dashes
    'MM/dd/yyyy',  // US format
    'MM-dd-yyyy',  // US format with dashes
    'yyyy-MM-dd',  // ISO format
    'yyyy/MM/dd',  // Alternative ISO format
  ];

  const trimmedStr = str.trim();
  
  // Try parsing with each format
  for (const format of dateFormats) {
    try {
      const date = parse(trimmedStr, format, new Date());
      if (isValid(date)) {
        return date;
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback: try ISO parsing for formats like 2000-01-15T00:00:00.000Z
  try {
    const date = parseISO(trimmedStr);
    if (isValid(date)) {
      return date;
    }
  } catch {
    // Ignore
  }

  ctx.addIssue({ 
    code: z.ZodIssueCode.custom, 
    message: `Formato de data inválido: "${str}". Use dd/mm/yyyy, mm/dd/yyyy ou yyyy-mm-dd.` 
  });
  return z.NEVER;
}).pipe(z.date());

const importBeltSchema = z
  .string()
  .transform((str, ctx) => {
    const lowerStr = str.toLowerCase();
    const beltMap: { [key: string]: Belt } = {
      white: "Branca",
      branca: "Branca",
      grey: "Cinza",
      gray: "Cinza",
      cinza: "Cinza",
      yellow: "Amarela",
      amarela: "Amarela",
      orange: "Laranja",
      laranja: "Laranja",
      green: "Verde",
      verde: "Verde",
      blue: "Azul",
      azul: "Azul",
      purple: "Roxa",
      roxa: "Roxa",
      brown: "Marrom",
      marrom: "Marrom",
      black: "Preta",
      preta: "Preta",
    };
    if (beltMap[lowerStr]) return beltMap[lowerStr];
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Faixa inválida." });
    return z.NEVER;
  })
  .pipe(
    z.enum([
      "Branca",
      "Cinza",
      "Amarela",
      "Laranja",
      "Verde",
      "Azul",
      "Roxa",
      "Marrom",
      "Preta",
    ])
  );

const importWeightSchema = z.coerce.number().min(16).max(200);
const importPhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/)
  .optional()
  .or(z.literal(""));
const importEmailSchema = z.string().email().optional().or(z.literal(""));
const importClubSchema = z.string().min(1);
const importGenderSchema = z
  .string()
  .transform((str, ctx) => {
    const lowerStr = str.toLowerCase();
    const genderMap: { [key: string]: Gender } = {
      male: "Masculino",
      masculino: "Masculino",
      female: "Feminino",
      feminino: "Feminino",
      other: "Outro",
      outro: "Outro",
    };
    if (genderMap[lowerStr]) return genderMap[lowerStr];
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Gênero inválido." });
    return z.NEVER;
  })
  .pipe(z.enum(["Masculino", "Feminino", "Outro"]));
const importNationalitySchema = z.string().min(2);
const importIdNumberSchema = z.string().optional();
const importUrlSchema = z.string().url().optional().or(z.literal(""));

interface ImportResult {
  row: number;
  data: any;
  reason: string;
}

const BatchAthleteImport: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [columnMapping, setColumnMapping] = useState<
    Record<RequiredAthleteField, string | undefined>
  >(() => ({} as any));
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: ImportResult[];
  } | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "results">("upload");
  const [ageSettings, setAgeSettings] = useState<AgeDivisionSetting[]>([]);
  const [isAutoApproveEnabled, setIsAutoApproveEnabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!eventId) return;
      const { data, error } = await supabase
        .from("sjjp_events")
        .select("age_division_settings, is_auto_approve_registrations_enabled")
        .eq("id", eventId)
        .single();

      if (error) {
        showError("Failed to load event settings.");
      } else if (data) {
        if (data.age_division_settings) setAgeSettings(data.age_division_settings);
        setIsAutoApproveEnabled(data.is_auto_approve_registrations_enabled ?? false);
      }
    };
    fetchSettings();
  }, [eventId]);

  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(
      `mandatoryCheckInFields_${eventId}`
    );
    return storedConfig ? JSON.parse(storedConfig) : {};
  }, [eventId]);

  const createDynamicImportSchema = (config: Record<string, boolean>) => {
    return z
      .object({
        fullName: importFullNameSchema,
        date_of_birth: importDateOfBirthSchema,
        belt: importBeltSchema,
        weight: importWeightSchema,
        phone: importPhoneSchema,
        email: importEmailSchema,
        idNumber: importIdNumberSchema,
        club: importClubSchema,
        gender: importGenderSchema,
        nationality: importNationalitySchema,
        photo_url: config.photo ? z.string().url().min(1) : importUrlSchema,
        emirates_id_front_url: config.emiratesIdFront
          ? z.string().url().min(1)
          : importUrlSchema,
        emirates_id_back_url: config.emiratesIdBack
          ? z.string().url().min(1)
          : importUrlSchema,
        payment_proof_url: config.paymentProof
          ? z.string().url().min(1)
          : importUrlSchema,
      })
      .refine((data) => data.idNumber, {
        message: "Pelo menos um ID (Emirates ID ou School ID) é obrigatório.",
        path: ["idNumber"],
      });
  };

  const currentImportSchema = useMemo(
    () => createDynamicImportSchema(mandatoryFieldsConfig),
    [mandatoryFieldsConfig]
  );
  type AthleteImportOutput = z.output<typeof currentImportSchema>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      parseCsvFile(file);
    }
  };

  const handleParsedData = async (results: any) => {
    if (results.errors.length) {
      if (results.data.length === 0) {
          showError("Erro ao parsear o arquivo CSV: " + results.errors[0].message);
          return;
      }
    }
    
    const headers = results.meta.fields || Object.keys(results.data[0] || {});
    if (headers.length === 0) {
        showError("A planilha parece estar vazia ou sem cabeçalhos.");
        return;
    }

    setCsvHeaders(headers);
    setCsvData(results.data);
    setStep("map");

    const autoMapping: Partial<Record<RequiredAthleteField, string>> = {};
    
    // 1. Try exact/fuzzy matches (existing logic)
    Object.entries(baseRequiredAthleteFields).forEach(([key, label]) => {
      const found = headers.find(
        (h: string) =>
          h.toLowerCase().replace(/ /g, "") ===
          label.toLowerCase().replace(/ /g, "")
      );
      if (found) autoMapping[key as RequiredAthleteField] = found;
    });

    // 2. Try to fetch stored mapping from database
    try {
        const storedMapping = await getStoredMapping('registration', headers);
        if (storedMapping) {
            console.log('Found stored mapping:', storedMapping);
            Object.assign(autoMapping, storedMapping);
            showSuccess('Mapeamento de colunas sugerido com base em importações anteriores.');
        }
    } catch (err: any) {
        console.error('Error fetching stored mapping:', err);
    }
    
    setColumnMapping((prev) => ({ ...prev, ...autoMapping }));
  };

  const parseCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: handleParsedData,
      error: (err: any) => showError("Erro ao ler o arquivo: " + err.message),
    });
  }

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

      // Convert string back to file-like object for Papa Parse logic (easier to reuse)
      // Actually Papa.parse can take a string directly
      Papa.parse(data.csvData, {
        header: true,
        skipEmptyLines: true,
        complete: handleParsedData,
        error: (err: any) => {
          showError("Erro ao processar CSV da planilha: " + err.message);
        }
      });

    } catch (err: any) {
      console.error("Error fetching sheet:", err);
      showError("Falha ao importar planilha. Verifique se o link é público (Qualquer pessoa com o link). " + err.message);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleMappingChange = (
    field: RequiredAthleteField,
    csvColumn: string
  ) => {
    setColumnMapping((prev) => ({ ...prev, [field]: csvColumn }));
  };

  const validateMapping = () => {
    const mandatoryFields = [
      "fullName",
      "date_of_birth",
      "belt",
      "weight",
      "idNumber",
      "club",
      "gender",
      "nationality",
    ];
    for (const field of mandatoryFields) {
      if (!columnMapping[field as RequiredAthleteField]) {
        showError(
          `O campo "${
            baseRequiredAthleteFields[field as RequiredAthleteField]
          }" não foi mapeado.`
        );
        return false;
      }
    }
    return true;
  };

  const handleProcessImport = async () => {
    if (!validateMapping()) return;
    const loadingToast = showLoading("Processando importação...");

    const appId = await getAppId();
    const successfulAthletesForDb: any[] = [];
    const failedImports: ImportResult[] = [];

    csvData.forEach((row, index) => {
      try {
        const mappedData: Record<string, any> = {};
        for (const [key, col] of Object.entries(columnMapping)) {
          if (col) mappedData[key] = row[col];
        }
        const parsed = currentImportSchema.safeParse(mappedData);
        if (!parsed.success) {
          throw new Error(parsed.error.errors.map((e) => e.message).join("; "));
        }
        const data = parsed.data as AthleteImportOutput;
        const nameParts = data.fullName.split(" ");
        const athleteId = uuidv4();
        const age = new Date().getFullYear() - data.date_of_birth.getFullYear();
        successfulAthletesForDb.push({
          id: athleteId,
          event_id: eventId!,
          app_id: appId, // Required field
          registration_qr_code_id: `EV_${eventId}_ATH_${athleteId}`,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(" "),
          date_of_birth: data.date_of_birth.toISOString(),
          age: age,
          club: data.club,
          gender: data.gender,
          belt: data.belt,
          weight: data.weight,
          nationality: data.nationality,
          age_division: getAgeDivision(age, ageSettings),
          weight_division: getWeightDivision(data.weight),
          email: data.email || "",
          phone: data.phone || "",
          emirates_id: data.idNumber,
          photo_url: data.photo_url || undefined,
          emirates_id_front_url: data.emirates_id_front_url || undefined,
          emirates_id_back_url: data.emirates_id_back_url || undefined,
          consent_accepted: true,
          consent_date: new Date().toISOString(),
          consent_version: "1.0",
          payment_proof_url: data.payment_proof_url || undefined,
          registration_status: isAutoApproveEnabled ? "approved" : "under_approval",
          check_in_status: "pending",
          attendance_status: "pending",
        });
      } catch (error: any) {
        failedImports.push({
          row: index + 2,
          data: row,
          reason: error.message,
        });
      }
    });

    if (successfulAthletesForDb.length > 0) {
      console.log('[BatchImport] Tentando inserir', successfulAthletesForDb.length, 'atletas');
      console.log('[BatchImport] Primeiro atleta:', successfulAthletesForDb[0]);
      
      const { data: insertedData, error } = await supabase
        .from("sjjp_athletes")
        .insert(successfulAthletesForDb)
        .select();
        
      if (error) {
        console.error('[BatchImport] Erro ao inserir:', error);
        dismissToast(loadingToast);
        showError(`Erro ao salvar no banco de dados: ${error.message} (Code: ${error.code})`);
        return;
      }
      
      console.log('[BatchImport] Dados inseridos:', insertedData?.length || 0, 'registros');
      
      if (!insertedData || insertedData.length === 0) {
        console.warn('[BatchImport] Insert retornou sem dados - possível problema de RLS');
        dismissToast(loadingToast);
        showError('Os atletas foram processados mas não foram salvos. Verifique as permissões do banco de dados.');
        return;
      }
      
      // Invalidate event cache so athletes appear immediately
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      showSuccess(`${insertedData.length} atletas importados com sucesso!`);
    }

    dismissToast(loadingToast);
    
    if (successfulAthletesForDb.length > 0) {
       // Save mapping
       await saveStoredMapping('registration', csvHeaders, columnMapping as Record<string, string>);
    }

    setImportResults({
      success: successfulAthletesForDb.length,
      failed: failedImports.length,
      errors: failedImports,
    });
    setStep("results");
  };

  const handleExportErrors = () => {
    if (!importResults || importResults.errors.length === 0) return;
    const errorCsvData = importResults.errors.map((e) => ({
      ...e.data,
      "Motivo do Erro": e.reason,
    }));
    const csv = Papa.unparse(errorCsvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `erros_importacao_atletas.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Importar Atletas em Lote para Evento #{eventId}
        </h1>
        <Button
          onClick={() => navigate(`/events/${eventId}`)}
          variant="outline"
        >
          Voltar para o Evento
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Importar Atletas</CardTitle>
          <CardDescription>
            Escolha como você deseja importar os dados dos atletas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "upload" && (
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                <TabsTrigger value="url">Importar via URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload">
                <div className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="athlete-file">Arquivo CSV</Label>
                    <Input
                      id="athlete-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de um arquivo .csv do seu computador.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url">
                <div className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="sheet-url">URL do Arquivo (Google Sheets ou CSV)</Label>
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="sheet-url"
                            type="url"
                            placeholder="https://docs.google.com/spreadsheets/d/... ou https://site.com/arquivo.csv"
                            className="pl-9"
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleUrlImport} disabled={isLoadingUrl}>
                          {isLoadingUrl ? "Carregando..." : "Carregar"}
                        </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                    <p className="font-semibold mb-1">Dicas de Link:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Google Sheets:</strong> Use o link padrão (certifique-se que está público).</li>
                        <li><strong>CSV Online:</strong> Cole o link direto para o arquivo .csv.</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {step === "upload" && (
            <div className="mt-8 p-4 bg-muted rounded-md text-sm">
              <p className="font-semibold mb-2">Requisitos do Arquivo/Planilha:</p>
              <p className="text-muted-foreground mb-2">
              Certifique-se de que seu arquivo contenha as colunas
              necessárias.
              </p>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Mapeamento de Colunas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(baseRequiredAthleteFields).map(
                  ([key, label]) => {
                    // Get columns already used by OTHER fields (excluding current field)
                    const usedColumns = Object.entries(columnMapping)
                      .filter(([k, v]) => k !== key && v)
                      .map(([_, v]) => v);
                    const availableHeaders = csvHeaders.filter(h => !usedColumns.includes(h));
                    
                    return (
                    <div key={key}>
                      <Label htmlFor={`map-${key}`}>{label}</Label>
                      <Select
                        onValueChange={(v) =>
                          handleMappingChange(key as RequiredAthleteField, v)
                        }
                        value={columnMapping[key as RequiredAthleteField] || ""}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={`Selecione a coluna para ${label}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableHeaders.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                )}
              </div>
              <Button onClick={handleProcessImport} className="w-full">
                Processar Importação
              </Button>
            </div>
          )}
          {step === "results" && importResults && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Resultados</h3>
              <p>
                Sucesso:{" "}
                <span className="font-bold text-green-600">
                  {importResults.success}
                </span>
              </p>
              <p>
                Falhas:{" "}
                <span className="font-bold text-red-600">
                  {importResults.failed}
                </span>
              </p>
              {importResults.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold">Detalhes dos Erros:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell>{e.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    onClick={handleExportErrors}
                    variant="outline"
                    className="mt-4"
                  >
                    Exportar Erros
                  </Button>
                </div>
              )}
              <Button
                onClick={() => navigate(`/events/${eventId}`)}
                className="w-full"
              >
                Voltar para o Evento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default BatchAthleteImport;
