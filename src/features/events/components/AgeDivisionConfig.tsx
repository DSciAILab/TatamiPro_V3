"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Save, XCircle } from 'lucide-react';
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
  const [isAdding, setIsAdding] = useState(false);
  const [newSetting, setNewSetting] = useState<Omit<AgeDivisionSetting, 'id'>>({ name: '', min_age: 0, fight_duration: 5 });

  const sortedSettings = [...settings].sort((a, b) => a.min_age - b.min_age);

  const handleAdd = () => {
    if (!newSetting.name.trim()) {
      showError('O nome da categoria é obrigatório.');
      return;
    }
    const updatedSettings = [...settings, { ...newSetting, id: uuidv4() }];
    onUpdateSettings(updatedSettings);
    setNewSetting({ name: '', min_age: 0, fight_duration: 5 });
    setIsAdding(false);
    showSuccess('Categoria de idade adicionada.');
  };

  const handleEdit = (setting: AgeDivisionSetting) => {
    setEditingId(setting.id);
    setCurrentEdit({ name: setting.name, min_age: setting.min_age, fight_duration: setting.fight_duration });
  };

  const handleSave = () => {
    if (!currentEdit.name.trim()) {
      showError('O nome da categoria é obrigatório.');
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Configuração de Categorias de Idade</h3>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Age Category</TableHead>
              <TableHead>Min Age</TableHead>
              <TableHead>Fight Time (min)</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSettings.map(setting => (
              <TableRow key={setting.id}>
                {editingId === setting.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={currentEdit.name}
                        onChange={(e) => setCurrentEdit(p => ({ ...p, name: e.target.value }))}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentEdit.min_age}
                        onChange={(e) => setCurrentEdit(p => ({ ...p, min_age: Number(e.target.value) }))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentEdit.fight_duration}
                        onChange={(e) => setCurrentEdit(p => ({ ...p, fight_duration: Number(e.target.value) }))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell
                      className="font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleEdit(setting)}
                    >
                      {setting.name}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleEdit(setting)}
                    >
                      &gt;= {setting.min_age}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleEdit(setting)}
                    >
                      {setting.fight_duration} min
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(setting.id)} className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}

            {/* Inline add row */}
            {isAdding && (
              <TableRow className="bg-muted/30">
                <TableCell>
                  <Input
                    placeholder="Ex: Master 1"
                    value={newSetting.name}
                    onChange={(e) => setNewSetting(p => ({ ...p, name: e.target.value }))}
                    className="h-8"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newSetting.min_age}
                    onChange={(e) => setNewSetting(p => ({ ...p, min_age: Number(e.target.value) }))}
                    className="h-8 w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newSetting.fight_duration}
                    onChange={(e) => setNewSetting(p => ({ ...p, fight_duration: Number(e.target.value) }))}
                    className="h-8 w-20"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={handleAdd} className="h-8 w-8">
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)} className="h-8 w-8">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {sortedSettings.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  Nenhuma categoria configurada. Clique em &quot;Adicionar&quot; para criar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AgeDivisionConfig;