import { Card, CardContent } from '@/components/ui/card';
import { useBalances } from '@/hooks/useBalances';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Loader2 } from 'lucide-react';

export function BalanceCard() {
  const { formatCurrency } = useCurrency();
  const { data: balances = [], isLoading } = useBalances();
  
  const totalOwed = balances
    .filter(b => b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
  
  const totalOwe = balances
    .filter(b => b.amount < 0)
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
  
  const netBalance = totalOwed - totalOwe;

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-6 text-primary-foreground"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 opacity-80" />
          <span className="text-sm font-medium opacity-90">Total Balance</span>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold tracking-tight">
              {netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netBalance))}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {netBalance >= 0 ? "You're owed overall" : "You owe overall"}
            </p>
          </>
        )}
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-positive-muted">
            <div className="p-2 rounded-lg bg-positive/10">
              <ArrowDownRight className="h-4 w-4 text-positive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You're owed</p>
              <p className="text-lg font-semibold text-positive">
                {isLoading ? '...' : formatCurrency(totalOwed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-negative-muted">
            <div className="p-2 rounded-lg bg-negative/10">
              <ArrowUpRight className="h-4 w-4 text-negative" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You owe</p>
              <p className="text-lg font-semibold text-negative">
                {isLoading ? '...' : formatCurrency(totalOwe)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
