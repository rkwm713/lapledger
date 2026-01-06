import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { Check, X, Crown } from 'lucide-react';

interface MemberPaymentRowProps {
  member: {
    id: string;
    user_id: string;
    display_name: string;
    payment_status: 'pending' | 'paid' | 'overdue';
    payment_date: string | null;
    isOwner: boolean;
  };
  canEdit: boolean;
  onTogglePayment: (memberId: string, currentStatus: string) => void;
}

export function MemberPaymentRow({ member, canEdit, onTogglePayment }: MemberPaymentRowProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.display_name}</span>
          {member.isOwner && (
            <Crown className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <PaymentStatusBadge status={member.payment_status} />
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatDate(member.payment_date)}
      </TableCell>
      {canEdit && (
        <TableCell className="text-right">
          {member.payment_status === 'paid' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePayment(member.id, member.payment_status)}
              className="h-8 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mark Unpaid</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePayment(member.id, member.payment_status)}
              className="h-8 text-green-600 hover:text-green-600"
            >
              <Check className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
