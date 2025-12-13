"use client";

import React, { useState } from 'react';
import { Event, Division } from '@/types/index';
import FightOverview from '@/components/FightOverview';
import DivisionDetailView from '@/components/DivisionDetailView';

interface PublicBracketsProps {
  event: Event;
}

const PublicBrackets: React.FC<PublicBracketsProps> = ({ event }) => {
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  if (selectedDivision) {
    return (
      <DivisionDetailView
        event={event}
        division={selectedDivision}
        onBack={() => setSelectedDivision(null)}
        isPublic={true}
      />
    );
  }

  return (
    <FightOverview
      event={event}
      onDivisionSelect={(division) => setSelectedDivision(division)}
    />
  );
};

export default PublicBrackets;