import React, { useState, useMemo, useEffect } from 'react';
import { Athlete, Division } from '@/types/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Save, RotateCcw, Replace, Loader2, ArrowRight, ArrowUpDown } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface BatchEditTabProps {
  athletes: Athlete[];
  onUpdatesSaved: (updatedAthletes: Athlete[]) => void;
  divisions: Division[];
}

type EditableField = 'first_name' | 'last_name' | 'club' | 'email' | 'phone' | 'nationality';

const FIELD_LABELS: Record<EditableField, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  club: 'Club',
  email: 'Email',
  phone: 'Phone',
  nationality: 'Nationality'
};

const BatchEditTab: React.FC<BatchEditTabProps> = ({ athletes, onUpdatesSaved, divisions }) => {
  // Local state for editing
  const [localAthletes, setLocalAthletes] = useState<Athlete[]>([]);
  const [changedAthleteIds, setChangedAthleteIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Search and Replace state
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTargetField, setReplaceTargetField] = useState<EditableField>('club');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: EditableField | 'belt' | 'age_division' | 'weight_division'; direction: 'asc' | 'desc' } | null>(null);

  // Initialize local state
  useEffect(() => {
    setLocalAthletes(athletes);
     setChangedAthleteIds(new Set());
  }, [athletes]);

  // Handle individual cell change
  const handleCellChange = (id: string, field: EditableField, value: string) => {
    setLocalAthletes(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value };
      }
      return a;
    }));
    setChangedAthleteIds(prev => new Set(prev).add(id));
  };

  // Filter athletes for display
  const filteredAthletes = useMemo(() => {
    let result = localAthletes;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.first_name.toLowerCase().includes(lower) ||
        a.last_name.toLowerCase().includes(lower) ||
        a.club.toLowerCase().includes(lower) ||
        (a.email || '').toLowerCase().includes(lower)
      );
    }
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        const valA = a[key as keyof Athlete] || '';
        const valB = b[key as keyof Athlete] || '';
        
        if (valA < valB) {
          return direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [localAthletes, searchTerm, sortConfig]);

  const handleSort = (key: EditableField | 'belt' | 'age_division' | 'weight_division') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Batch Replace Logic
  const handleBatchReplace = () => {
    if (!findText) {
      showError("Please enter text to search for.");
      return;
    }

    let count = 0;
    const newAthletes = localAthletes.map(a => {
      const currentValue = String(a[replaceTargetField] || '');
      // Simple case-insensitive replace? User said "igual ao ctrl+H", usually that implies literal replace.
      // Let's use simple string replaceAll logic but case-insensitive? Or standard string replace.
      // Ideally "Find" matches part of the string.
      
      if (currentValue.includes(findText)) {
        // Only replace if it contains the text
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); // Escape regex chars
        const newValue = currentValue.replace(regex, replaceText);
        
        if (newValue !== currentValue) {
          count++;
          setChangedAthleteIds(prev => new Set(prev).add(a.id));
          return { ...a, [replaceTargetField]: newValue };
        }
      }
      return a;
    });

    setLocalAthletes(newAthletes);
    showSuccess(`Replaced in ${count} athletes.`);
  };

  // Save functionality
  const handleSaveChanges = async () => {
    if (changedAthleteIds.size === 0) return;

    setIsSaving(true);
    const toastId = showLoading(`Saving changes to ${changedAthleteIds.size} athletes...`);

    try {
      const athletesToUpdate = localAthletes.filter(a => changedAthleteIds.has(a.id));
      
      // Perform updates - parallel requests or one big upsert? 
      // Supabase upsert works well if we send an array.
      // However, we must ensure we only send fields that belong to the table.
      // We'll prepare a simplified object for update to avoid sending 'division' relation objects etc.
      
      // Use parallel updates instead of bulk upsert to avoid RLS "new row" violation if user lacks INSERT permission
       const updatePromises = athletesToUpdate.map(a => {
         return supabase
           .from('sjjp_athletes')
           .update({
             first_name: a.first_name,
             last_name: a.last_name,
             club: a.club,
             email: a.email,
             phone: a.phone,
             nationality: a.nationality,
           })
           .eq('id', a.id);
       });

       const results = await Promise.all(updatePromises);
       
       // Check for errors
       const firstError = results.find(r => r.error)?.error;
       if (firstError) throw firstError;



      dismissToast(toastId);
      showSuccess("Changes saved successfully!");
      
      // Clear changes tracking
      setChangedAthleteIds(new Set());
      
      // Notify parent
      onUpdatesSaved(localAthletes);

    } catch (err: any) {
      dismissToast(toastId);
      console.error(err);
      showError("Error saving: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = changedAthleteIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg border items-end">
        <div className="space-y-2 flex-grow">
          <span className="text-sm font-medium">Find and Replace</span>
          <div className="flex gap-2">
            <div className="w-1/3 min-w-[120px]">
              <Select value={replaceTargetField} onValueChange={(v: EditableField) => setReplaceTargetField(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input 
              placeholder="Text to find..." 
              value={findText} 
              onChange={e => setFindText(e.target.value)}
              className="flex-grow"
            />
          </div>
        </div>
        
        <div className="hidden md:flex pb-3">
          <ArrowRight className="text-muted-foreground w-4 h-4" />
        </div>

        <div className="space-y-2 flex-grow">
          <span className="text-sm font-medium md:invisible">Replace with</span>
            <div className="flex gap-2">
            <Input 
              placeholder="Replace with..." 
              value={replaceText} 
              onChange={e => setReplaceText(e.target.value)}
              className="flex-grow min-w-[150px]"
            />
            <Button onClick={handleBatchReplace} variant="secondary">
              <Replace className="w-4 h-4 mr-2" />
              Apply
            </Button>
            <div className="w-px h-8 bg-border mx-2" /> {/* Separator */}
            <Button 
              variant="outline" 
              onClick={() => {
                  setLocalAthletes(athletes);
                  setChangedAthleteIds(new Set());
              }}
              disabled={!hasChanges || isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Discard
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              disabled={!hasChanges || isSaving}
              className={hasChanges ? "animate-pulse" : ""}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes ({changedAthleteIds.size})
            </Button>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter table..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
          <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead className="w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('first_name')}>
                    First Name <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('last_name')}>
                    Last Name <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('club')}>
                    Club <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('email')}>
                    Email <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('phone')}>
                    Phone <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nationality')}>
                    Nationality <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-[200px] text-muted-foreground">Info (Read-Only)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAthletes.map(athlete => {
                const isModified = changedAthleteIds.has(athlete.id);
                return (
                  <TableRow key={athlete.id} className={isModified ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                    <TableCell className="p-1">
                      <Input 
                        value={athlete.first_name} 
                        onChange={e => handleCellChange(athlete.id, 'first_name', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        value={athlete.last_name} 
                        onChange={e => handleCellChange(athlete.id, 'last_name', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        value={athlete.club} 
                        onChange={e => handleCellChange(athlete.id, 'club', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                      <TableCell className="p-1">
                      <Input 
                        value={athlete.email} 
                        onChange={e => handleCellChange(athlete.id, 'email', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                      <TableCell className="p-1">
                      <Input 
                        value={athlete.phone} 
                        onChange={e => handleCellChange(athlete.id, 'phone', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                      <TableCell className="p-1">
                      <Input 
                        value={athlete.nationality} 
                        onChange={e => handleCellChange(athlete.id, 'nationality', e.target.value)}
                        className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {athlete.belt} - {athlete.age_division} - {athlete.weight_division}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAthletes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No athletes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
      </div>
    </div>
  );
};

export default BatchEditTab;
