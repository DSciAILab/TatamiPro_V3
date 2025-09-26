"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Edit, Save, XCircle } from 'lucide-react';
import { Division, AthleteBelt, Gender, DivisionBelt, DivisionGender, AgeCategory } from '@/types/index'; // Importar tipos atualizados
import { showSuccess, showError } from '@/utils/toast';

interface DivisionTableProps {
  divisions: Division[];
  onUpdateDivisions: (updatedDivisions: Division[]) => void;
  eventId: string;
}

const DivisionTable: React.FC<DivisionTableProps> = ({ divisions, onUpdateDivisions, eventId }) => {
  const [currentDivisions, setCurrentDivisions] = useState<Division[]>(divisions);
  const [newDivision, setNewDivision] = useState<Omit<Division, 'id'>>({
    eventId: eventId,
    name: '',
    minAge: 0,
    maxAge: 99,
    minWeight: 0,
    maxWeight: 999,
    gender: 'Ambos', // Usar DivisionGender
    belt: 'Todas', // Usar DivisionBelt
    ageCategoryName: 'Adult', // Default para uma das novas categorias
    isNoGi: false,
    isEnabled: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentEdit, setCurrentEdit] = useState<Division | null>(null);

  useEffect(() => {
    setCurrentDivisions(divisions);
  }, [divisions]);

  const ageCategoryOrder: AgeCategory[] = [
    'Kids I', 'Kids II', 'Kids III', 'Junior', 'Teen', 'Juvenile', 'Adult',
    'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'
  ];

  const beltOrder: DivisionBelt[] = ['Todas', 'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  const genderOrder: DivisionGender[] = ['Ambos', 'Masculino', 'Feminino'];

  const handleAddDivision = () => {
    if (!newDivision.name || !newDivision.ageCategoryName || newDivision.minAge === undefined || newDivision.maxAge === undefined ||
      newDivision.minWeight === undefined || newDivision.maxWeight === undefined) {
      showError('Por favor, preencha todos os campos obrigatórios para a nova divisão.');
      return;
    }
    const divisionToAdd: Division = { ...newDivision, id: `div-${Date.now()}` }; // Usar um ID temporário ou UUID
    const updatedDivisions = [...currentDivisions, divisionToAdd];
    onUpdateDivisions(updatedDivisions);
    showSuccess('Divisão adicionada com sucesso!');
    setNewDivision({
      eventId: eventId,
      name: '', minAge: 0, maxAge: 99, minWeight: 0, maxWeight: 999,
      gender: 'Ambos', belt: 'Todas', ageCategoryName: 'Adult', isNoGi: false, isEnabled: true
    });
  };

  const handleEditDivision = (division: Division) => {
    setEditingId(division.id);
    setCurrentEdit({ ...division });
  };

  const handleSaveEdit = () => {
    if (currentEdit) {
      if (!currentEdit.name || !currentEdit.ageCategoryName || currentEdit.minAge === undefined || currentEdit.maxAge === undefined ||
        currentEdit.minWeight === undefined || currentEdit.maxWeight === undefined) {
        showError('Por favor, preencha todos os campos obrigatórios para a divisão.');
        return;
      }
      const updatedDivisions = currentDivisions.map(div =>
        div.id === currentEdit.id ? currentEdit : div
      );
      onUpdateDivisions(updatedDivisions);
      showSuccess('Divisão atualizada com sucesso!');
      setEditingId(null);
      setCurrentEdit(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentEdit(null);
  };

  const handleDeleteDivision = (id: string) => {
    const updatedDivisions = currentDivisions.filter(div => div.id !== id);
    onUpdateDivisions(updatedDivisions);
    showSuccess('Divisão removida com sucesso!');
  };

  const handleToggleEnable = (id: string, checked: boolean) => {
    const updatedDivisions = currentDivisions.map(div =>
      div.id === id ? { ...div, isEnabled: checked } : div
    );
    onUpdateDivisions(updatedDivisions);
    showSuccess(`Divisão ${checked ? 'ativada' : 'desativada'} com sucesso!`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newName">Nome da Divisão</Label>
          <Input id="newName" value={newDivision.name} onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Adulto Masculino Faixa Branca" />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newAgeCategoryName">Categoria de Idade</Label>
          <Select value={newDivision.ageCategoryName} onValueChange={(value: AgeCategory) => setNewDivision(prev => ({ ...prev, ageCategoryName: value }))}>
            <SelectTrigger id="newAgeCategoryName"><SelectValue placeholder="Categoria de Idade" /></SelectTrigger>
            <SelectContent>
              {ageCategoryOrder.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newMinAge">Idade Mínima</Label>
          <Input id="newMinAge" type="number" value={newDivision.minAge} onChange={(e) => setNewDivision(prev => ({ ...prev, minAge: parseInt(e.target.value) }))} />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newMaxAge">Idade Máxima</Label>
          <Input id="newMaxAge" type="number" value={newDivision.maxAge} onChange={(e) => setNewDivision(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))} />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newMinWeight">Peso Mínimo (kg)</Label>
          <Input id="newMinWeight" type="number" step="0.1" value={newDivision.minWeight} onChange={(e) => setNewDivision(prev => ({ ...prev, minWeight: parseFloat(e.target.value) }))} />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newMaxWeight">Peso Máximo (kg)</Label>
          <Input id="newMaxWeight" type="number" step="0.1" value={newDivision.maxWeight} onChange={(e) => setNewDivision(prev => ({ ...prev, maxWeight: parseFloat(e.target.value) }))} />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newGender">Gênero</Label>
          <Select value={newDivision.gender} onValueChange={(value: DivisionGender) => setNewDivision(prev => ({ ...prev, gender: value }))}>
            <SelectTrigger id="newGender"><SelectValue placeholder="Gênero" /></SelectTrigger>
            <SelectContent>
              {genderOrder.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="newBelt">Faixa</Label>
          <Select value={newDivision.belt} onValueChange={(value: DivisionBelt) => setNewDivision(prev => ({ ...prev, belt: value }))}>
            <SelectTrigger id="newBelt"><SelectValue placeholder="Faixa" /></SelectTrigger>
            <SelectContent>
              {beltOrder.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="newIsNoGi"
            checked={newDivision.isNoGi}
            onCheckedChange={(checked) => setNewDivision(prev => ({ ...prev, isNoGi: checked }))}
          />
          <Label htmlFor="newIsNoGi">No-Gi</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="newIsEnabled"
            checked={newDivision.isEnabled}
            onCheckedChange={(checked) => setNewDivision(prev => ({ ...prev, isEnabled: checked }))}
          />
          <Label htmlFor="newIsEnabled">Ativada</Label>
        </div>
        <Button onClick={handleAddDivision} className="col-span-full lg:col-span-1">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Divisão
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria de Idade</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Faixa</TableHead>
              <TableHead>No-Gi</TableHead>
              <TableHead>Ativada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDivisions.map((division) => (
              <TableRow key={division.id}>
                {editingId === division.id && currentEdit ? (
                  <>
                    <TableCell><Input value={currentEdit.name} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, name: e.target.value } : null)} /></TableCell>
                    <TableCell>
                      <Select value={currentEdit.ageCategoryName} onValueChange={(value: AgeCategory) => setCurrentEdit(prev => prev ? { ...prev, ageCategoryName: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ageCategoryOrder.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" value={currentEdit.minAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, minAge: parseInt(e.target.value) } : null)} className="mt-1" />
                      <Input type="number" value={currentEdit.maxAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxAge: parseInt(e.target.value) } : null)} className="mt-1" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.1" value={currentEdit.minWeight} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, minWeight: parseFloat(e.target.value) } : null)} />
                      <Input type="number" step="0.1" value={currentEdit.maxWeight} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxWeight: parseFloat(e.target.value) } : null)} className="mt-1" />
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.gender} onValueChange={(value: DivisionGender) => setCurrentEdit(prev => prev ? { ...prev, gender: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {genderOrder.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={currentEdit.belt} onValueChange={(value: DivisionBelt) => setCurrentEdit(prev => prev ? { ...prev, belt: value } : null)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {beltOrder.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={currentEdit.isNoGi}
                        onCheckedChange={(checked) => setCurrentEdit(prev => prev ? { ...prev, isNoGi: checked } : null)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={currentEdit.isEnabled}
                        onCheckedChange={(checked) => setCurrentEdit(prev => prev ? { ...prev, isEnabled: checked } : null)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={handleSaveEdit} className="mr-2"><Save className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}><XCircle className="h-4 w-4" /></Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{division.name}</TableCell>
                    <TableCell>{division.ageCategoryName} ({division.minAge}-{division.maxAge})</TableCell>
                    <TableCell>Até {division.maxWeight}kg</TableCell>
                    <TableCell>{division.gender}</TableCell>
                    <TableCell>{division.belt}</TableCell>
                    <TableCell>{division.isNoGi ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={division.isEnabled}
                        onCheckedChange={(checked) => handleToggleEnable(division.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditDivision(division)} className="mr-2"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDivision(division.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DivisionTable;