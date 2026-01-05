import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RaceResult } from "@/lib/types";

interface ResultsTableProps {
  results: RaceResult[];
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
              <TableCell className="text-muted-foreground">{result.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
