import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, ThumbsUp, AlertCircle } from 'lucide-react';

interface Staff {
  name: string;
  orders: number;
  revenue: number;
  bottles: number;
  clubSignups: number;
}
interface StaffFeedback {
  name: string;
  reason: string;
  metrics: string[];
}
interface StaffTableProps {
  staff: Staff[];
  praise?: StaffFeedback[];
  coaching?: StaffFeedback[];
}

export function StaffTable({ staff, praise = [], coaching = [] }: StaffTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Bottles</TableHead>
            <TableHead>Club Signups</TableHead>
            <TableHead>Praise</TableHead>
            <TableHead>Coaching</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => {
            const praiseItem = praise.find(p => p.name === s.name);
            const coachingItem = coaching.find(c => c.name === s.name);
            return (
              <TableRow key={s.name}>
                <TableCell className="font-medium text-wine-700">{s.name}</TableCell>
                <TableCell>{s.orders}</TableCell>
                <TableCell>${s.revenue.toLocaleString()}</TableCell>
                <TableCell>{s.bottles}</TableCell>
                <TableCell>{s.clubSignups}</TableCell>
                <TableCell>{praiseItem && <ThumbsUp className="h-4 w-4 text-green-600" title={praiseItem.reason} />}</TableCell>
                <TableCell>{coachingItem && <AlertCircle className="h-4 w-4 text-amber-600" title={coachingItem.reason} />}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 