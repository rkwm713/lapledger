import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface PaymentInfoCardProps {
  entryFee: number;
  paymentDeadline: string | null;
  paymentPaypal: string | null;
  paymentVenmo: string | null;
  paymentInstructions: string | null;
  userPaymentStatus?: 'pending' | 'paid' | 'overdue';
}

export function PaymentInfoCard({
  entryFee,
  paymentDeadline,
  paymentPaypal,
  paymentVenmo,
  paymentInstructions,
  userPaymentStatus
}: PaymentInfoCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isOverdue = paymentDeadline && new Date(paymentDeadline) < new Date() && userPaymentStatus !== 'paid';
  const formattedDeadline = paymentDeadline 
    ? new Date(paymentDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  // Don't show the card if there's no payment info
  if (!paymentPaypal && !paymentVenmo && !paymentInstructions) {
    return null;
  }

  return (
    <Card className={isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Payment Information
          </CardTitle>
          {userPaymentStatus && (
            <Badge 
              variant={userPaymentStatus === 'paid' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
              className={userPaymentStatus === 'paid' ? 'bg-green-600' : ''}
            >
              {userPaymentStatus === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Entry Fee</span>
          <span className="font-bold text-lg">${entryFee.toFixed(2)}</span>
        </div>

        {formattedDeadline && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Deadline</span>
            <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
              {formattedDeadline}
            </span>
          </div>
        )}

        {paymentPaypal && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">PayPal</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={() => copyToClipboard(paymentPaypal, 'paypal')}
              >
                {copiedField === 'paypal' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="font-mono text-sm">{paymentPaypal}</p>
          </div>
        )}

        {paymentVenmo && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Venmo</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={() => copyToClipboard(paymentVenmo, 'venmo')}
              >
                {copiedField === 'venmo' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="font-mono text-sm">{paymentVenmo}</p>
          </div>
        )}

        {paymentInstructions && (
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium text-muted-foreground">Instructions</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{paymentInstructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
