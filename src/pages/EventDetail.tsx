// ... (previous imports)
import { generateMatFightOrder } from '@/utils/fight-order-generator';

const EventDetail: React.FC = () => {
  // ... (previous code)

  const handleUpdateMatAssignments = (assignments: Record<string, string[]>) => {
    const result = generateMatFightOrder({ 
      ...event, 
      mat_assignments: assignments 
    });
    // Use result here
    console.log(result);
  };

  return (
    // ... (component JSX)
  );
};

export default EventDetail;