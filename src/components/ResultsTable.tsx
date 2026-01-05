import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RaceResult } from "@/lib/types";

interface ResultsTableProps {
  results: RaceResult[];
}

function getStatusBadge(status: string) {
  if (status === 'Finished') {
    return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Finished</Badge>;
  }
  // DNF reasons get a muted/warning style
  return <Badge variant="outline" className="text-muted-foreground">{status}</Badge>;
}

export function ResultsTable({ results }: ResultsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Pos</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead className="w-20">Car #</TableHead>
            <TableHead className="w-24 text-right">Laps</TableHead>
            <TableHead className="w-28">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={`${result.position}-${result.driverName}`}>
              <TableCell className="font-medium">{result.position}</TableCell>
              <TableCell>{result.driverName}</TableCell>
              <TableCell>{result.carNumber}</TableCell>
              <TableCell className="text-right">{result.lapsCompleted}</TableCell>
              <TableCell>{getStatusBadge(result.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
