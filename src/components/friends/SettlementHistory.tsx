import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettlements, useDeleteSettlement } from '@/hooks/useSettlements';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CreditCard, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettlementHistoryProps {
  friendId: string;
  friendName: string;
}

export function SettlementHistory({ friendId, friendName }: SettlementHistoryProps) {
  const { formatCurrency } = useCurrency();
  const { data: settlements = [], isLoading } = useSettlements(friendId);
  const deleteSettlement = useDeleteSettlement();
  const [settlementToDelete, setSettlementToDelete] = useState<{ id: string; amount: number } | null>(null);

  const handleDelete = () => {
    if (settlementToDelete) {
      deleteSettlement.mutate(settlementToDelete.id, {
        onSuccess: () => setSettlementToDelete(null),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No payments recorded with {friendName} yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {settlements.map((settlement, index) => (
              <div
                key={settlement.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50",
                  index !== settlements.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="p-2 rounded-lg bg-positive/10 shrink-0">
                  <CreditCard className="h-4 w-4 text-positive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {settlement.payerName} paid {settlement.receiverName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(settlement.createdAt, 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-positive shrink-0">
                  {formatCurrency(settlement.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setSettlementToDelete({ id: settlement.id, amount: settlement.amount })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!settlementToDelete} onOpenChange={(open) => !open && setSettlementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Settlement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will undo the payment of {settlementToDelete ? formatCurrency(settlementToDelete.amount) : ''} and restore the balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSettlement.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}