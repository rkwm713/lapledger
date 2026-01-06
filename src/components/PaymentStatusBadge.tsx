import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'overdue';
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = {
    paid: {
      label: 'Paid',
      icon: CheckCircle,
      className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20'
    },
    overdue: {
      label: 'Overdue',
      icon: AlertCircle,
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
    }
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1', statusClassName, className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
