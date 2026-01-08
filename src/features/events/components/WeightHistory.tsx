import React from 'react';
import { WeightAttempt } from '@/types/index';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeightHistoryProps {
  attempts: WeightAttempt[];
}

const WeightHistory: React.FC<WeightHistoryProps> = ({ attempts }) => {
  if (!attempts || attempts.length === 0) return null;

  return (
    <div className="text-xs text-muted-foreground mt-1 leading-snug">
      {attempts.map((attempt, index) => {
        const isLast = index === attempts.length - 1;
        const isApproved = attempt.status === 'checked_in';
        
        return (
          <span key={index} className={cn(isLast && isApproved ? "text-green-600 font-semibold" : "")}>
            {index > 0 && " / "}
            {format(new Date(attempt.timestamp), 'HH:mm')} - {attempt.weight}kg
          </span>
        );
      })}
    </div>
  );
};

export default WeightHistory;
