"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, Save, XCircle, Search } from 'lucide-react';
import { Division, DivisionBelt, DivisionGender, AgeCategory, AgeDivisionSetting } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

interface DivisionTableProps {
  divisions: Division[];
  onUpdateDivisions: (updatedDivisions: Division[]) => void;
  ageDivisionSettings: AgeDivisionSetting[];
}

const DivisionTable: React.FC<DivisionTableProps> = ({ divisions, onUpdateDivisions, ageDivisionSettings }) => {
  const { t } = useTranslations();
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [newDivision, setNewDivision] = useState<Omit<Division, 'id' | 'is_enabled'>>({
    name: '',
    min_age: 0,
    max_age: 99,
    max_weight: 999,
    gender: 'Ambos',
    belt: 'Todas',
    age_category_name: '',
  });
  const [currentEdit, setCurrentEdit] = useState<Division | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const sortedAgeSettings = useMemo(() => [...ageDivisionSettings].sort((a, b) => a.min_age - b.min_age), [ageDivisionSettings]);

  const handleAgeCategoryChange = (
    ageCategoryName: AgeCategory,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const selectedSettingIndex = sortedAgeSettings.findIndex(s => s.name === ageCategoryName);
    if (selectedSettingIndex === -1) return;

    const min_age = sortedAgeSettings[selectedSettingIndex].min_age;
    const max_age = (selectedSettingIndex + 1 < sortedAgeSettings.length)
      ? sortedAgeSettings[selectedSettingIndex + 1].min_age - 1
      : 99;

    setter((prev: any) => ({ ...prev, age_category_name: ageCategoryName, min_age, max_age }));
  };

  const filteredDivisions = useMemo(() => {
    if (!searchTerm) {
      return divisions;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return divisions.filter(division =>
      division.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      division.age_category_name.toLowerCase().includes(lowerCaseSearchTerm) ||
      t(`gender_${division.gender}` as any).toLowerCase().includes(lowerCaseSearchTerm) ||
      t(`belt_${division.belt}` as any).toLowerCase().includes(lowerCaseSearchTerm) ||
      `${division.min_age}-${division.max_age}`.includes(lowerCaseSearchTerm) ||
      `${division.max_weight}kg`.includes(lowerCaseSearchTerm)
    );
  }, [divisions, searchTerm, t]);

  const handleAddDivision = () => {
    if (!newDivision.name || !newDivision.age_category_name || newDivision.min_age === undefined || newDivision.max_age === undefined ||
        newDivision.max_weight === undefined) {
      showError('Por favor, preencha todos os campos da nova divisão.');
      return;
    }
    if (newDivision.min_age > newDivision.max_age) {
      showError('Idade mínima não pode ser maior que idade máxima.');
      return;
    }

    const id = uuidv4(); // Gera um UUID válido
    const updatedDivisions = [...divisions, { ...newDivision, id, is_enabled: true }];
    onUpdateDivisions(updatedDivisions);
    showSuccess('Divisão adicionada com sucesso!');
    setNewDivision({ name: '', min_age: 0, max_age: 99, max_weight: 999, gender: 'Ambos', belt: 'Todas', age_category_name: '' });
  };

  const handleEditDivision = (division: Division) => {
    setEditingDivisionId(division.id);
    setCurrentEdit({ ...division });
  };

  const handleSaveEdit = () => {
    if (currentEdit) {
      if (!currentEdit.name || !currentEdit.age_category_name || currentEdit.min_age === undefined || currentEdit.max_age === undefined ||
          currentEdit.max_weight === undefined) {
        showError('Por favor, preencha todos os campos da divisão.');
        return;
      }
      if (currentEdit.min_age > currentEdit.max_age) {
        showError('Idade mínima não pode ser maior que idade máxima.');
        return;
      }

      const updatedDivisions = divisions.map(div =>
        div.id === currentEdit.id ? currentEdit : div
      );
      onUpdateDivisions(updatedDivisions);
      showSuccess('Divisão atualizada com sucesso!');
      setEditingDivisionId(null);
      setCurrentEdit(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingDivisionId(null);
    setCurrentEdit(null);
  };

  const handleDeleteDivision = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta divisão?')) {
      const updatedDivisions = divisions.filter(div => div.id !== id);
      onUpdateDivisions(updatedDivisions);
      showSuccess('Divisão removida.');
      setSelectedDivisionIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleToggleEnable = (id: string, is_enabled: boolean) => {
    const updatedDivisions = divisions.map(div =>
      div.id === id ? { ...div, is_enabled } : div
    );
    onUpdateDivisions(updatedDivisions);
    showSuccess(`Divisão ${is_enabled ? 'habilitada' : 'desabilitada'}.`);
  };

  const handleToggleSelectDivision = (id: string, checked: boolean) => {
    setSelectedDivisionIds(prev =>
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleSelectAllDivisions = (checked: boolean) => {
    if (checked) {
      setSelectedDivisionIds(filteredDivisions.map(div => div.id));
    } else {
      setSelectedDivisionIds([]);
    }
  };

  const handleBatchEnable = () => {
    if (selectedDivisionIds.length === 0) {
      showError('Nenhuma divisão selecionada.');
      return;
    }
    const updatedDivisions = divisions.map(div =>
      selectedDivisionIds.includes(div.id) ? { ...div, is_enabled: true } : div
    );
    onUpdateDivisions(updatedDivisions);
    showSuccess(`${selectedDivisionIds.length} divisões habilitadas.`);
    setSelectedDivisionIds([]);
  };

  const handleBatchDisable = () => {
    if (selectedDivisionIds.length === 0) {
      showError('Nenhuma divisão selecionada.');
      return;
    }
    const updatedDivisions = divisions.map(div =>
      selectedDivisionIds.includes(div.id) ? { ...div, is_enabled: false } : div
    );
    onUpdateDivisions(updatedDivisions);
    showSuccess(`${selectedDivisionIds.length} divisões desabilitadas.`);
    setSelectedDivisionIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedDivisionIds.length === 0) {
      showError('Nenhuma divisão selecionada.');
      return;
    }
    const updatedDivisions = divisions.filter(div => !selectedDivisionIds.includes(div.id));
    onUpdateDivisions(updatedDivisions);
    showSuccess(`${selectedDivisionIds.length} divisões removidas.`);
    setSelectedDivisionIds([]);
    setShowBatchDeleteConfirm(false);
  };

  const beltOptions: DivisionBelt[] = ['Todas', 'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  const genderOptions: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];

  const isAllSelected = filteredDivisions.length > 0 && selectedDivisionIds.length === filteredDivisions.length;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">{t('eventDivisionsTitle')}</h3>
      <p className="text-muted-foreground">{t('eventDivisionsDesc')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/20">
        <div className="col-span-full text-lg font-medium mb-2">{t('addNewDivision')}</div>
        <div>
          <Label htmlFor="newName">{t('divisionName')}</Label>
          <Input id="newName" value={newDivision.name} onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="newAgeCategoryName">{t('ageCategory')}</Label>
          <Select value={newDivision.age_category_name} onValueChange={(value: AgeCategory) => handleAgeCategoryChange(value, setNewDivision)}>
            <SelectTrigger id="newAgeCategoryName"><SelectValue placeholder={t('placeholderSelect')} /></SelectTrigger>
            <SelectContent>
              {sortedAgeSettings.filter(cat => cat.name && cat.name.trim() !== '').map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="newMinAge">{t('minAge')}</Label>
          <Input id="newMinAge" type="number" value={newDivision.min_age} onChange={(e) => setNewDivision(prev => ({ ...prev, min_age: Number(e.target.value) }))} disabled />
        </div>
        <div>
          <Label htmlFor="newMaxAge">{t('maxAge')}</Label>
          <Input id="newMaxAge" type="number" value={newDivision.max_age} onChange={(e) => setNewDivision(prev => ({ ...prev, max_age: Number(e.target.value) }))} disabled />
        </div>
        <div>
          <Label htmlFor="newMaxWeight">{t('maxWeight')}</Label>
          <Input id="newMaxWeight" type="number" step="0.1" value={newDivision.max_weight} onChange={(e) => setNewDivision(prev => ({ ...prev, max_weight: Number(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="newGender">{t('gender')}</Label>
          <Select value={newDivision.gender} onValueChange={(value: DivisionGender) => setNewDivision(prev => ({ ...prev, gender: value }))}>
            <SelectTrigger id="newGender"><SelectValue placeholder={t('placeholderSelectGender')} /></SelectTrigger>
            <SelectContent>
              {genderOptions.map(gen => <SelectItem key={gen} value={gen}>{t(`gender_${gen}` as any)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="newBelt">{t('belt')}</Label>
          <Select value={newDivision.belt} onValueChange={(value: DivisionBelt) => setNewDivision(prev => ({ ...prev, belt: value }))}>
            <SelectTrigger id="newBelt"><SelectValue placeholder={t('placeholderSelectBelt')} /></SelectTrigger>
            <SelectContent>
              {beltOptions.map(belt => <SelectItem key={belt} value={belt}>{t(`belt_${belt}` as any)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-full flex justify-end">
          <Button onClick={handleAddDivision}><PlusCircle className="mr-2 h-4 w-4" /> {t('addDivision')}</Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Input
          type="text"
          placeholder={t('searchDivisions')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {selectedDivisionIds.length > 0 && (
        <div className="flex space-x-2 mb-4">
          <Button onClick={handleBatchEnable} variant="outline">{t('enableSelected')} ({selectedDivisionIds.length})</Button>
          <Button onClick={handleBatchDisable} variant="outline">{t('disableSelected')} ({selectedDivisionIds.length})</Button>
          <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={selectedDivisionIds.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> {t('deleteSelected')} ({selectedDivisionIds.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteSelected')}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirmBatchDeleteDivision')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {filteredDivisions.length === 0 ? (
        <p className="text-muted-foreground">{t('noDivisionsFound')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked: boolean) => handleSelectAllDivisions(checked)}
                  aria-label="Selecionar todas as divisões"
                />
              </TableHead>
              <TableHead>{t('divisionName')}</TableHead>
              <TableHead>{t('ageCategory')}</TableHead>
              <TableHead>{t('maxWeight')}</TableHead>
              <TableHead>{t('gender')}</TableHead>
              <TableHead>{t('belt')}</TableHead>
              <TableHead className="text-center">{t('enabled')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDivisions.map((division) => (
              <TableRow key={division.id} className={cn(!division.is_enabled && "text-muted-foreground")}>
                {editingDivisionId === division.id && currentEdit ? (
                  <>
                    <TableCell /> {/* Empty cell for checkbox in edit mode */}
                    <TableCell><Input value={currentEdit.name} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, name: e.target.value } : null)} /></TableCell>
                    <TableCell>
                      <Select value={currentEdit.age_category_name} onValueChange={(value: AgeCategory) => handleAgeCategoryChange(value, setCurrentEdit as React.Dispatch<React.SetStateAction<any>>)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sortedAgeSettings.filter(cat => cat.name && cat.name.trim() !== '').map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex space-x-1 mt-1">
                        <Input type="number" value={currentEdit.min_age} disabled className="w-1/2 text-xs" />
                        <Input type="number" value={currentEdit.max_age} disabled className="w-1/2 text-xs" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.1" value={currentEdit.max_weight} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, max_weight: Number(e.target.value) } : null)} className="w-full" />
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.gender} onValueChange={(value: DivisionGender) => setCurrentEdit(prev => prev ? { ...prev, gender: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {genderOptions.map(gen => <SelectItem key={gen} value={gen}>{t(`gender_${gen}` as any)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.belt} onValueChange={(value: DivisionBelt) => setCurrentEdit(prev => prev ? { ...prev, belt: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {beltOptions.map(belt => <SelectItem key={belt} value={belt}>{t(`belt_${belt}` as any)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={currentEdit.is_enabled}
                        onCheckedChange={(checked) => setCurrentEdit(prev => prev ? { ...prev, is_enabled: checked } : null)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={handleSaveEdit}><Save className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}><XCircle className="h-4 w-4 text-red-600" /></Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Checkbox
                        checked={selectedDivisionIds.includes(division.id)}
                        onCheckedChange={(checked: boolean) => handleToggleSelectDivision(division.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{division.name}</TableCell>
                    <TableCell>{division.age_category_name} ({division.min_age}-{division.max_age})</TableCell>
                    <TableCell>Até {division.max_weight}kg</TableCell>
                    <TableCell>{t(`gender_${division.gender}` as any)}</TableCell>
                    <TableCell>{t(`belt_${division.belt}` as any)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={division.is_enabled}
                        onCheckedChange={(checked) => handleToggleEnable(division.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditDivision(division)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDivision(division.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default DivisionTable;