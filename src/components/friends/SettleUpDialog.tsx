import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { useSettleUp } from '@/hooks/useExpenses';
import { CheckCircle } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: Friend;
  balanceAmount: number;
  onSettle?: (amount: number) => void;
}

export function SettleUpDialog({ open, onOpenChange, friend, balanceAmount, onSettle }: SettleUpDialogProps) {
  const { formatCurrency, currency } = useCurrency();
  const settleUp = useSettleUp();
  const [amount, setAmount] = useState(Math.abs(balanceAmount).toString());
  const [isSettled, setIsSettled] = useState(false);
  const [settledAmount, setSettledAmount] = useState(0);

  // Reset amount when dialog opens with new balance
  useEffect(() => {
    if (open) {
      setAmount(Math.abs(balanceAmount).toString());
      setIsSettled(false);
      setSettledAmount(0);
    }
  }, [open, balanceAmount]);

  const isYouOwe = balanceAmount < 0;
  const suggestedAmount = Math.abs(balanceAmount);

  const handleSettle = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    settleUp.mutate(
      { friendId: friend.id, amount: numAmount },
      {
        onSuccess: (result) => {
          setSettledAmount(numAmount);
          setIsSettled(true);
          toast.success(`Payment of ${formatCurrency(numAmount)} recorded!`);
          onSettle?.(numAmount);
          
          // Auto-close after showing success state
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        },
      }
    );
  };

  const handleFullSettle = () => {
    setAmount(suggestedAmount.toString());
  };

  // Show success state after settlement
  if (isSettled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-positive/20 flex items-center justify-center animate-scale-in">
              <CheckCircle className="h-10 w-10 text-positive" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Payment Recorded!</h3>
              <p className="text-muted-foreground">
                {isYouOwe 
                  ? `You paid ${friend.name.split(' ')[0]} ${formatCurrency(settledAmount)}`
                  : `${friend.name.split(' ')[0]} paid you ${formatCurrency(settledAmount)}`
                }
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar} />
              <AvatarFallback>
                {friend.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{friend.name}</p>
              <p className="text-sm text-muted-foreground">
                {isYouOwe ? 'You owe' : 'Owes you'} {formatCurrency(suggestedAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency.symbol}
              </span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {parseFloat(amount) !== suggestedAmount && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleFullSettle}
                className="w-full"
              >
                Settle full amount ({formatCurrency(suggestedAmount)})
              </Button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/30 text-sm">
            <p className="text-muted-foreground">
              {isYouOwe 
                ? `Recording that you paid ${friend.name.split(' ')[0]}`
                : `Recording that ${friend.name.split(' ')[0]} paid you`
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={settleUp.isPending}>
            {settleUp.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
