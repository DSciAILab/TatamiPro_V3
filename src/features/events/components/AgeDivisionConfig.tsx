"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit, Save, XCircle } from 'lucide-react';
import { AgeDivisionSetting } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';

interface AgeDivisionConfigProps {
  settings: AgeDivisionSetting[];
  onUpdateSettings: (updatedSettings: AgeDivisionSetting[]) => void;
}

const AgeDivisionConfig: React.FC<AgeDivisionConfigProps> = ({ settings, onUpdateSettings }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentEdit, setCurrentEdit] = useState<Omit<AgeDivisionSetting, 'id'>>({ name: '', min_age: 0, fight_duration: 5 });
  const [newSetting, setNewSetting] = useState<Omit<AgeDivisionSetting, 'id'>>({ name: '', min_age: 0, fight_duration: 5 });

  const sortedSettings = [...settings].sort((a, b) => a.min_age - b.min_age);

  const handleAdd = () => {
    if (!newSetting.name || newSetting.min_age === undefined || newSetting.fight_duration === undefined) {
      showError('Por favor, preencha todos os campos.');
      return;
    }
    const updatedSettings = [...settings, { ...newSetting, id: uuidv4() }];
    onUpdateSettings(updatedSettings);
    setNewSetting({ name: '', min_age: 0, fight_duration: 5 });
    showSuccess('Categoria de idade adicionada.');
  };

  const handleEdit = (setting: AgeDivisionSetting) => {
    setEditingId(setting.id);
    setCurrentEdit({ name: setting.name, min_age: setting.min_age, fight_duration: setting.fight_duration });
  };

  const handleSave = () => {
    if (!currentEdit.name || currentEdit.min_age === undefined || currentEdit.fight_duration === undefined) {
      showError('Os campos não podem estar vazios.');
      return;
    }
    const updatedSettings = settings.map(s => s.id === editingId ? { ...s, ...currentEdit } : s);
    onUpdateSettings(updatedSettings);
    setEditingId(null);
    showSuccess('Categoria de idade atualizada.');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta categoria de idade?')) {
      const updatedSettings = settings.filter(s => s.id !== id);
      onUpdateSettings(updatedSettings);
      showSuccess('Categoria de idade removida.');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Configuração de Categorias de Idade</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
        <div>
          <Label htmlFor="newCatName">Nome da Categoria</Label>
          <Input id="newCatName" value={newSetting.name} onChange={(e) => setNewSetting(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Master 1" />
        </div>
        <div>
          <Label htmlFor="newMinAge">Idade Mínima</Label>
          <Input id="newMinAge" type="number" value={newSetting.min_age} onChange={(e) => setNewSetting(p => ({ ...p, min_age: Number(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="newFightDuration">Tempo de Luta (min)</Label>
          <Input id="newFightDuration" type="number" value={newSetting.fight_duration} onChange={(e) => setNewSetting(p => ({ ...p, fight_duration: Number(e.target.value) }))} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAdd} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da Categoria</TableHead>
            <TableHead>Idade Mínima</TableHead>
            <TableHead>Tempo de Luta (min)</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSettings.map(setting => (
            <TableRow key={setting.id}>
              {editingId === setting.id ? (
                <>
                  <TableCell><Input value={currentEdit.name} onChange={(e) => setCurrentEdit(p => ({ ...p, name: e.target.value }))} /></TableCell>
                  <TableCell><Input type="number" value={currentEdit.min_age} onChange={(e) => setCurrentEdit(p => ({ ...p, min_age: Number(e.target.value) }))} /></TableCell>
                  <TableCell><Input type="number" value={currentEdit.fight_duration} onChange={(e) => setCurrentEdit(p => ({ ...p, fight_duration: Number(e.target.value) }))} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={handleSave}><Save className="h-4 w-4 text-green-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}><XCircle className="h-4 w-4 text-red-600" /></Button>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{setting.name}</TableCell>
                  <TableCell>&gt;= {setting.min_age}</TableCell>
                  <TableCell>{setting.fight_duration} min</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(setting)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(setting.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AgeDivisionConfig;