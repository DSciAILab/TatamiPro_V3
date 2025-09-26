"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, Save, XCircle } from 'lucide-react';
import { Division, Belt, DivisionBelt, DivisionGender, AgeCategory } from '@/types/index'; // Importar tipos
import { showSuccess, showError } from '@/utils/toast';

interface DivisionTableProps {
  divisions: Division[];
  onUpdateDivisions: (updatedDivisions: Division[]) => void;
}

const DivisionTable: React.FC<DivisionTableProps> = ({ divisions, onUpdateDivisions }) => {
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [newDivision, setNewDivision] = useState<Omit<Division, 'id' | 'isEnabled'>>({
    name: '',
    minAge: 0,
    maxAge: 99,
    maxWeight: 999, // minWeight removido
    gender: 'Ambos',
    belt: 'Todas',
    ageCategoryName: 'Adult', // Default para uma das novas categorias
  });
  const [currentEdit, setCurrentEdit] = useState<Division | null>(null);

  const handleAddDivision = () => {
    if (!newDivision.name || !newDivision.ageCategoryName || newDivision.minAge === undefined || newDivision.maxAge === undefined ||
        newDivision.maxWeight === undefined) { // minWeight removido da validação
      showError('Por favor, preencha todos os campos da nova divisão.');
      return;
    }
    if (newDivision.minAge > newDivision.maxAge) {
      showError('Idade mínima não pode ser maior que idade máxima.');
      return;
    }

    const id = `division-${Date.now()}`;
    const updatedDivisions = [...divisions, { ...newDivision, id, isEnabled: true }];
    onUpdateDivisions(updatedDivisions);
    showSuccess('Divisão adicionada com sucesso!');
    setNewDivision({ name: '', minAge: 0, maxAge: 99, maxWeight: 999, gender: 'Ambos', belt: 'Todas', ageCategoryName: 'Adult' });
  };

  const handleEditDivision = (division: Division) => {
    setEditingDivisionId(division.id);
    setCurrentEdit({ ...division });
  };

  const handleSaveEdit = () => {
    if (currentEdit) {
      if (!currentEdit.name || !currentEdit.ageCategoryName || currentEdit.minAge === undefined || currentEdit.maxAge === undefined ||
          currentEdit.maxWeight === undefined) { // minWeight removido da validação
        showError('Por favor, preencha todos os campos da divisão.');
        return;
      }
      if (currentEdit.minAge > currentEdit.maxAge) {
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
    }
  };

  const handleToggleEnable = (id: string, isEnabled: boolean) => {
    const updatedDivisions = divisions.map(div =>
      div.id === id ? { ...div, isEnabled } : div
    );
    onUpdateDivisions(updatedDivisions);
    showSuccess(`Divisão ${isEnabled ? 'habilitada' : 'desabilitada'}.`);
  };

  const beltOptions: DivisionBelt[] = ['Todas', 'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  const genderOptions: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];
  const ageCategoryOptions: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master'];


  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Divisões do Evento</h3>
      <p className="text-muted-foreground">Defina e gerencie as divisões de idade, peso, gênero e faixa para este evento.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/20">
        <div className="col-span-full text-lg font-medium mb-2">Adicionar Nova Divisão</div>
        <div>
          <Label htmlFor="newName">Nome da Divisão</Label>
          <Input id="newName" value={newDivision.name} onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="newAgeCategoryName">Categoria de Idade</Label>
          <Select value={newDivision.ageCategoryName} onValueChange={(value: AgeCategory) => setNewDivision(prev => ({ ...prev, ageCategoryName: value }))}>
            <SelectTrigger id="newAgeCategoryName"><SelectValue placeholder="Categoria de Idade" /></SelectTrigger>
            <SelectContent>
              {ageCategoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="newMinAge">Idade Mínima</Label>
          <Input id="newMinAge" type="number" value={newDivision.minAge} onChange={(e) => setNewDivision(prev => ({ ...prev, minAge: Number(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="newMaxAge">Idade Máxima</Label>
          <Input id="newMaxAge" type="number" value={newDivision.maxAge} onChange={(e) => setNewDivision(prev => ({ ...prev, maxAge: Number(e.target.value) }))} />
        </div>
        {/* minWeight removido */}
        <div>
          <Label htmlFor="newMaxWeight">Peso Máximo (kg)</Label>
          <Input id="newMaxWeight" type="number" step="0.1" value={newDivision.maxWeight} onChange={(e) => setNewDivision(prev => ({ ...prev, maxWeight: Number(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="newGender">Gênero</Label>
          <Select value={newDivision.gender} onValueChange={(value: DivisionGender) => setNewDivision(prev => ({ ...prev, gender: value }))}>
            <SelectTrigger id="newGender"><SelectValue placeholder="Gênero" /></SelectTrigger>
            <SelectContent>
              {genderOptions.map(gen => <SelectItem key={gen} value={gen}>{gen}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="newBelt">Faixa</Label>
          <Select value={newDivision.belt} onValueChange={(value: DivisionBelt) => setNewDivision(prev => ({ ...prev, belt: value }))}>
            <SelectTrigger id="newBelt"><SelectValue placeholder="Faixa" /></SelectTrigger>
            <SelectContent>
              {beltOptions.map(belt => <SelectItem key={belt} value={belt}>{belt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-full flex justify-end">
          <Button onClick={handleAddDivision}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Divisão</Button>
        </div>
      </div>

      {divisions.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma divisão configurada ainda. Adicione uma acima ou importe.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Divisão</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Peso (kg)</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Faixa</TableHead>
              <TableHead className="text-center">Habilitada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((division) => (
              <TableRow key={division.id}>
                {editingDivisionId === division.id && currentEdit ? (
                  <>
                    <TableCell><Input value={currentEdit.name} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, name: e.target.value } : null)} /></TableCell>
                    <TableCell>
                      <Select value={currentEdit.ageCategoryName} onValueChange={(value: AgeCategory) => setCurrentEdit(prev => prev ? { ...prev, ageCategoryName: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ageCategoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex space-x-1 mt-1">
                        <Input type="number" value={currentEdit.minAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, minAge: Number(e.target.value) } : null)} className="w-1/2 text-xs" placeholder="Min Age" />
                        <Input type="number" value={currentEdit.maxAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxAge: Number(e.target.value) } : null)} className="w-1/2 text-xs" placeholder="Max Age" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* minWeight removido */}
                      <Input type="number" step="0.1" value={currentEdit.maxWeight} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxWeight: Number(e.target.value) } : null)} className="w-full" />
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.gender} onValueChange={(value: DivisionGender) => setCurrentEdit(prev => prev ? { ...prev, gender: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {genderOptions.map(gen => <SelectItem key={gen} value={gen}>{gen}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.belt} onValueChange={(value: DivisionBelt) => setCurrentEdit(prev => prev ? { ...prev, belt: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {beltOptions.map(belt => <SelectItem key={belt} value={belt}>{belt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={currentEdit.isEnabled}
                        onCheckedChange={(checked) => setCurrentEdit(prev => prev ? { ...prev, isEnabled: checked } : null)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={handleSaveEdit}><Save className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}><XCircle className="h-4 w-4 text-red-600" /></Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{division.name}</TableCell>
                    <TableCell>{division.ageCategoryName} ({division.minAge}-{division.maxAge})</TableCell>
                    <TableCell>Até {division.maxWeight}kg</TableCell> {/* Exibir apenas maxWeight */}
                    <TableCell>{division.gender}</TableCell>
                    <TableCell>{division.belt}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={division.isEnabled}
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