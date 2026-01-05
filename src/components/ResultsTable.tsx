import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
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

function getPositionStyle(position: number) {
  switch (position) {
    case 1:
      return "text-nascar-yellow bg-nascar-yellow/10";
    case 2:
      return "text-gray-500 bg-gray-500/10";
    case 3:
      return "text-amber-600 bg-amber-600/10";
    default:
      return "text-muted-foreground bg-muted";
  }
}

// Mobile card view for results
function MobileResultCard({ result }: { result: RaceResult }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${getPositionStyle(result.position)}`}>
            {result.position}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{result.driverName}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>Car #{result.carNumber}</span>
              <span>•</span>
              <span>{result.lapsCompleted} laps</span>
            </div>
            <div className="mt-2">
              {getStatusBadge(result.status)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultsTable({ results }: ResultsTableProps) {
  const isMobile = useIsMobile();

  // Mobile: Card-based layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {results.map((result) => (
          <MobileResultCard key={`${result.position}-${result.driverName}`} result={result} />
        ))}
      </div>
    );
  }

  // Desktop: Table layout
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
