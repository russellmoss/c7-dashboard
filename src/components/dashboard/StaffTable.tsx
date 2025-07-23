import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, ThumbsUp, AlertCircle } from 'lucide-react';

interface Staff {
  name: string;
  orders: number;
  revenue: number;
  bottles: number;
  clubSignups: number;
  wineBottleConversionRate?: number;
  clubConversionRate?: number;
  wineBottleConversionGoalVariance?: number;
  clubConversionGoalVariance?: number;
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
            <TableHead>Wine Conv. Rate</TableHead>
            <TableHead>Club Conv. Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => {
            return (
              <TableRow key={s.name}>
                <TableCell className="font-medium text-wine-700">{s.name}</TableCell>
                <TableCell>{s.orders}</TableCell>
                <TableCell>${s.revenue.toLocaleString()}</TableCell>
                <TableCell>{s.bottles}</TableCell>
                <TableCell>{s.clubSignups}</TableCell>
                <TableCell>
                  <span>{s.wineBottleConversionRate != null ? `${s.wineBottleConversionRate}%` : '-'}</span>
                  {s.wineBottleConversionGoalVariance != null && (
                    <span className={s.wineBottleConversionGoalVariance >= 0 ? 'ml-2 text-green-600 font-semibold' : 'ml-2 text-red-600 font-semibold'}>
                      {s.wineBottleConversionGoalVariance >= 0 ? `▲ ${s.wineBottleConversionGoalVariance}%` : `▼ ${Math.abs(s.wineBottleConversionGoalVariance)}%`}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span>{s.clubConversionRate != null ? `${s.clubConversionRate}%` : '-'}</span>
                  {s.clubConversionGoalVariance != null && (
                    <span className={s.clubConversionGoalVariance >= 0 ? 'ml-2 text-green-600 font-semibold' : 'ml-2 text-red-600 font-semibold'}>
                      {s.clubConversionGoalVariance >= 0 ? `▲ ${s.clubConversionGoalVariance}%` : `▼ ${Math.abs(s.clubConversionGoalVariance)}%`}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 