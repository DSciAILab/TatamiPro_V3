"use client";

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, Save, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Division, DivisionBelt, DivisionGender, AgeCategory } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';

interface DivisionTableProps {
  divisions: Division[];
  onUpdateDivisions: (divisions: Division[]) => void;
  eventId: string;
}

const DivisionTable: React.FC<DivisionTableProps> = ({ divisions, onUpdateDivisions, eventId }) => {
  const [editableDivisions, setEditableDivisions] = useState<Division[]>([]);
  const [newDivision, setNewDivision] = useState<Division>({
    id: '',
    eventId: eventId,
    name: '',
    minAge: 0,
    maxAge: 99,
    ageCategoryName: 'Adult',
    minWeight: 0,
    maxWeight: 999,
    gender: 'Both', // Updated to English
    belt: 'Todas',
    isNoGi: false,
    isEnabled: true,
  });

  useEffect(() => {
    setEditableDivisions(divisions);
  }, [divisions]);

  const beltOrder: DivisionBelt[] = ['Todas', 'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  const genderOrder: DivisionGender[] = ['Both', 'Male', 'Female']; // Updated to English
  const ageCategoryOrder: AgeCategory[] = [
    'Kids I', 'Kids II', 'Kids III', 'Junior', 'Teen', 'Juvenile', 'Adult',
    'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'
  ];

  const handleAddDivision = () => {
    if (!newDivision.name || newDivision.minAge === undefined || newDivision.maxAge === undefined ||
      newDivision.minWeight === undefined || newDivision.maxWeight === undefined ||
      !newDivision.gender || !newDivision.belt || !newDivision.ageCategoryName) {
      showError('Please fill all fields for the new division.');
      return;
    }

    const divisionToAdd: Division = {
      ...newDivision,
      id: uuidv4(),
      eventId: eventId,
    };

    setEditableDivisions(prev => [...prev, divisionToAdd]);
    setNewDivision({
      id: '',
      eventId: eventId,
      name: '',
      minAge: 0,
      maxAge: 99,
      ageCategoryName: 'Adult',
      minWeight: 0,
      maxWeight: 999,
      gender: 'Both', // Updated to English
      belt: 'Todas',
      isNoGi: false,
      isEnabled: true,
    });
    showSuccess('Division added successfully!');
  };

  const handleUpdateField = (id: string, field: keyof Division, value: any) => {
    setEditableDivisions(prev =>
      prev.map(div => (div.id === id ? { ...div, [field]: value } : div))
    );
  };

  const handleDeleteDivision = (id: string) => {
    setEditableDivisions(prev => prev.filter(div => div.id !== id));
    showSuccess('Division deleted successfully!');
  };

  const handleSaveDivisions = () => {
    onUpdateDivisions(editableDivisions);
    showSuccess('Divisions saved successfully!');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Age Category</TableHead>
              <TableHead>Min Age</TableHead>
              <TableHead>Max Age</TableHead>
              <TableHead>Belt</TableHead>
              <TableHead>Min Weight (kg)</TableHead>
              <TableHead>Max Weight (kg)</TableHead>
              <TableHead>No-Gi</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editableDivisions.map((div) => (
              <TableRow key={div.id}>
                <TableCell>
                  <Input
                    value={div.name}
                    onChange={(e) => handleUpdateField(div.id, 'name', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={div.gender}
                    onValueChange={(value: DivisionGender) => handleUpdateField(div.id, 'gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOrder.map(gender => (
                        <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={div.ageCategoryName}
                    onValueChange={(value: AgeCategory) => handleUpdateField(div.id, 'ageCategoryName', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Age Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageCategoryOrder.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={div.minAge}
                    onChange={(e) => handleUpdateField(div.id, 'minAge', Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={div.maxAge}
                    onChange={(e) => handleUpdateField(div.id, 'maxAge', Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={div.belt}
                    onValueChange={(value: DivisionBelt) => handleUpdateField(div.id, 'belt', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Belt" />
                    </SelectTrigger>
                    <SelectContent>
                      {beltOrder.map(belt => (
                        <SelectItem key={belt} value={belt}>{belt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={div.minWeight}
                    onChange={(e) => handleUpdateField(div.id, 'minWeight', Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={div.maxWeight}
                    onChange={(e) => handleUpdateField(div.id, 'maxWeight', Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={div.isNoGi}
                    onCheckedChange={(checked: boolean) => handleUpdateField(div.id, 'isNoGi', checked)}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={div.isEnabled}
                    onCheckedChange={(checked: boolean) => handleUpdateField(div.id, 'isEnabled', checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDivision(div.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>
                <Input
                  placeholder="New Division Name"
                  value={newDivision.name}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, name: e.target.value }))}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={newDivision.gender}
                  onValueChange={(value: DivisionGender) => setNewDivision(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOrder.map(gender => (
                      <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={newDivision.ageCategoryName}
                  onValueChange={(value: AgeCategory) => setNewDivision(prev => ({ ...prev, ageCategoryName: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Age Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageCategoryOrder.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="Min Age"
                  value={newDivision.minAge}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, minAge: Number(e.target.value) }))}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="Max Age"
                  value={newDivision.maxAge}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, maxAge: Number(e.target.value) }))}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={newDivision.belt}
                  onValueChange={(value: DivisionBelt) => setNewDivision(prev => ({ ...prev, belt: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Belt" />
                  </SelectTrigger>
                  <SelectContent>
                    {beltOrder.map(belt => (
                      <SelectItem key={belt} value={belt}>{belt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="Min Weight"
                  value={newDivision.minWeight}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, minWeight: Number(e.target.value) }))}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  placeholder="Max Weight"
                  value={newDivision.maxWeight}
                  onChange={(e) => setNewDivision(prev => ({ ...prev, maxWeight: Number(e.target.value) }))}
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={newDivision.isNoGi}
                  onCheckedChange={(checked: boolean) => setNewDivision(prev => ({ ...prev, isNoGi: checked }))}
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={newDivision.isEnabled}
                  onCheckedChange={(checked: boolean) => setNewDivision(prev => ({ ...prev, isEnabled: checked }))}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={handleAddDivision}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Button onClick={handleSaveDivisions} className="w-full">
        <Save className="mr-2 h-4 w-4" /> Save All Divisions
      </Button>
    </div>
  );
};

export default DivisionTable;