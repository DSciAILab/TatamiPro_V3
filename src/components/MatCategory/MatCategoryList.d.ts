import React from 'react';
import { Event, DivisionGender, AgeCategory, DivisionBelt } from '@/types/index';
interface MatCategoryListProps {
    event: Event;
    selectedMat: string | 'all-mats';
    selectedCategoryKey: string | null;
    onSelectCategory: (categoryKey: string, divisionId: string) => void;
    hasOngoingFights: (divisionId: string) => boolean;
}
interface CategoryGroup {
    key: string;
    display: string;
    gender: DivisionGender;
    ageCategoryName: AgeCategory;
    belt?: DivisionBelt;
    athleteCount: number;
    divisionIds: string[];
    bracketStatus: 'Não Gerado' | 'Gerado' | 'Em Andamento' | 'Sem Atletas';
}
declare const MatCategoryList: React.FC<MatCategoryListProps>;
export default MatCategoryList;