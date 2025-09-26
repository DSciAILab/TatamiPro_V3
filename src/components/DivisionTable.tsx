"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, Save, XCircle } from 'lucide-react';
import { Division, AthleteBelt, DivisionBelt, DivisionGender, AgeCategory } from '@/types/index'; // Importar tipos
import { showSuccess, showError } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';

interface DivisionTableProps {
  divisions: Division[];
  onUpdateDivisions: (divisions: Division[]) => void;
}

const DivisionTable: React.FC<DivisionTableProps> = ({ divisions, onUpdateDivisions }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentEdit, setCurrentEdit] = useState<Division | null>(null);
  const [newDivision, setNewDivision] = useState<Omit<Division, 'id'>>({
    name: '',
    minAge: 0,
    maxAge: 99,
    minWeight: 0, // minWeight pode ser 0 ou ajustado dinamicamente
    maxWeight: 999,
    gender: 'Ambos',
    belt: 'Todas',
    ageCategoryName: 'Adult', // Default para uma das novas categorias
    isEnabled: true, // Nova propriedade
  });

  const handleAddDivision = () => {
    if (!newDivision.name || !newDivision.ageCategoryName || newDivision.minAge === undefined || newDivision.maxAge === undefined ||
        newDivision.maxWeight === undefined) {
      showError('Por favor, preencha todos os campos obrigatórios para a nova divisão.');
      return;
    }

    const divisionToAdd: Division = {
      ...newDivision,
      id: uuidv4(),
    };

    onUpdateDivisions([...divisions, divisionToAdd]);
    showSuccess('Divisão adicionada com sucesso!');
    setNewDivision({ name: '', minAge: 0, maxAge: 99, minWeight: 0, maxWeight: 999, gender: 'Ambos', belt: 'Todas', ageCategoryName: 'Adult', isEnabled: true });
  };

  const handleEdit = (division: Division) => {
    setEditingId(division.id);
    setCurrentEdit({ ...division });
  };

  const handleSaveEdit = () => {
    if (currentEdit) {
      if (!currentEdit.name || !currentEdit.ageCategoryName || currentEdit.minAge === undefined || currentEdit.maxAge === undefined ||
          currentEdit.maxWeight === undefined) {
        showError('Por favor, preencha todos os campos obrigatórios para a edição.');
        return;
      }
      onUpdateDivisions(divisions.map(div => div.id === currentEdit.id ? currentEdit : div));
      showSuccess('Divisão atualizada com sucesso!');
      setEditingId(null);
      setCurrentEdit(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentEdit(null);
  };

  const handleDelete = (id: string) => {
    onUpdateDivisions(divisions.filter(div => div.id !== id));
    showSuccess('Divisão removida com sucesso!');
  };

  const handleToggleEnable = (id: string, checked: boolean) => {
    onUpdateDivisions(divisions.map(div => div.id === id ? { ...div, isEnabled: checked } : div));
    showSuccess(`Divisão ${checked ? 'ativada' : 'desativada'} com sucesso!`);
  };

  const ageCategories: AgeCategory[] = ['Kids', 'Juvenile', 'Adult', 'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'];
  const belts: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];
  const genders: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg shadow-sm bg-muted/40">
        <h4 className="text-lg font-semibold mb-4">Adicionar Nova Divisão</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="newName">Nome da Divisão</Label>
            <Input id="newName" value={newDivision.name} onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="newAgeCategoryName">Categoria de Idade</Label>
            <Select value={newDivision.ageCategoryName} onValueChange={(value: AgeCategory) => setNewDivision(prev => ({ ...prev, ageCategoryName: value }))}>
              <SelectTrigger id="newAgeCategoryName"><SelectValue placeholder="Categoria de Idade" /></SelectTrigger>
              <SelectContent>
                {ageCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
          <div>
            <Label htmlFor="newMaxWeight">Peso Máximo (kg)</Label>
            <Input id="newMaxWeight" type="number" step="0.1" value={newDivision.maxWeight} onChange={(e) => setNewDivision(prev => ({ ...prev, maxWeight: Number(e.target.value) }))} />
          </div>
          <div>
            <Label htmlFor="newGender">Gênero</Label>
            <Select value={newDivision.gender} onValueChange={(value: DivisionGender) => setNewDivision(prev => ({ ...prev, gender: value }))}>
              <SelectTrigger id="newGender"><SelectValue placeholder="Gênero" /></SelectTrigger>
              <SelectContent>
                {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="newBelt">Faixa</Label>
            <Select value={newDivision.belt} onValueChange={(value: DivisionBelt) => setNewDivision(prev => ({ ...prev, belt: value }))}>
              <SelectTrigger id="newBelt"><SelectValue placeholder="Faixa" /></SelectTrigger>
              <SelectContent>
                {belts.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <Switch
              id="newIsEnabled"
              checked={newDivision.isEnabled}
              onCheckedChange={(checked) => setNewDivision(prev => ({ ...prev, isEnabled: checked }))}
            />
            <Label htmlFor="newIsEnabled">Ativa</Label>
          </div>
        </div>
        <Button onClick={handleAddDivision} className="mt-4 w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Divisão
        </Button>
      </div>

      <h3 className="text-xl font-semibold mb-4">Divisões Existentes ({divisions.length})</h3>
      {divisions.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma divisão configurada ainda.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria de Idade (Idade)</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divisions.map((division) => (
                <TableRow key={division.id}>
                  {editingId === division.id && currentEdit ? (
                    <>
                      <TableCell><Input value={currentEdit.name} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, name: e.target.value } : null)} /></TableCell>
                      <TableCell>
                        <Select value={currentEdit.ageCategoryName} onValueChange={(value: AgeCategory) => setCurrentEdit(prev => prev ? { ...prev, ageCategoryName: value } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ageCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" value={currentEdit.minAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, minAge: Number(e.target.value) } : null)} className="mt-1" />
                        <Input type="number" value={currentEdit.maxAge} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxAge: Number(e.target.value) } : null)} className="mt-1" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.1" value={currentEdit.maxWeight} onChange={(e) => setCurrentEdit(prev => prev ? { ...prev, maxWeight: Number(e.target.value) } : null)} />
                      </TableCell>
                      <TableCell>
                        <Select value={currentEdit.gender} onValueChange={(value: DivisionGender) => setCurrentEdit(prev => prev ? { ...prev, gender: value } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={currentEdit.belt} onValueChange={(value: DivisionBelt) => setCurrentEdit(prev => prev ? { ...prev, belt: value } : null)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {belts.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={currentEdit.isEnabled}
                          onCheckedChange={(checked) => setCurrentEdit(prev => prev ? { ...prev, isEnabled: checked } : null)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{division.name}</TableCell>
                      <TableCell>{division.ageCategoryName} ({division.minAge}-{division.maxAge})</TableCell>
                      <TableCell>Até {division.maxWeight}kg</TableCell>
                      <TableCell>{division.gender}</TableCell>
                      <TableCell>{division.belt}</TableCell>
                      <TableCell>
                        <Switch
                          checked={division.isEnabled}
                          onCheckedChange={(checked) => handleToggleEnable(division.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(division)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(division.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DivisionTable;