import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGroupSettle } from '@/hooks/useGroupSettlements';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SimplifiedDebt {
  from: Member;
  to: Member;
  amount: number;
}

interface GroupSettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: SimplifiedDebt | null;
  groupId: string;
}

export function GroupSettleDialog({
  open,
  onOpenChange,
  debt,
  groupId,
}: GroupSettleDialogProps) {
  const { formatCurrency, currency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [isSettled, setIsSettled] = useState(false);
  const [settledAmount, setSettledAmount] = useState(0);
  
  const { mutateAsync: settle, isPending } = useGroupSettle();

  useEffect(() => {
    if (open && debt) {
      setAmount(debt.amount.toString());
      setIsSettled(false);
      setSettledAmount(0);
    }
  }, [open, debt]);

  if (!debt) return null;

  const handleSettle = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    try {
      await settle({
        payerId: debt.from.user_id,
        receiverId: debt.to.user_id,
        amount: numAmount,
        groupId,
      });
      
      setSettledAmount(numAmount);
      setIsSettled(true);
      
      // Close dialog after showing success
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Settlement failed:', error);
    }
  };

  const handleFullSettle = () => {
    setAmount(debt.amount.toString());
  };

  if (isSettled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-positive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Payment Recorded!</h3>
            <p className="text-muted-foreground text-center">
              {formatCurrency(settledAmount)} paid to {debt.to.display_name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment within this group. Everyone in the group will see this settlement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visual representation */}
          <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 mb-1">
                <AvatarImage src={debt.from.avatar_url || undefined} />
                <AvatarFallback>
                  {(debt.from.display_name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {debt.from.display_name?.split(' ')[0]}
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">pays</span>
            </div>
            
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 mb-1">
                <AvatarImage src={debt.to.avatar_url || undefined} />
                <AvatarFallback>
                  {(debt.to.display_name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {debt.to.display_name?.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Suggested amount */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Suggested amount</p>
            <Button variant="outline" onClick={handleFullSettle}>
              {formatCurrency(debt.amount)}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency.symbol}
              </span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <Button
            onClick={handleSettle}
            disabled={isPending || !amount || parseFloat(amount) <= 0}
            className="w-full"
          >
            {isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
