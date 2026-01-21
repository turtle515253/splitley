import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface BalanceCardProps {
  totals?: {
    you_are_owed: number;
    you_owe: number;
    net_balance: number;
  };
  isLoading?: boolean;
}

export function BalanceCard({ totals, isLoading = false }: BalanceCardProps) {
  const { formatCurrency } = useCurrency();
  
  const totalOwed = totals?.you_are_owed ?? 0;
  const totalOwe = totals?.you_owe ?? 0;
  const netBalance = totals?.net_balance ?? 0;

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
          <div className="space-y-2">
            <Skeleton className="h-10 w-40 bg-primary-foreground/20" />
            <Skeleton className="h-4 w-28 bg-primary-foreground/20" />
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
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-lg font-semibold text-positive">
                  {formatCurrency(totalOwed)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-negative-muted">
            <div className="p-2 rounded-lg bg-negative/10">
              <ArrowUpRight className="h-4 w-4 text-negative" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You owe</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-lg font-semibold text-negative">
                  {formatCurrency(totalOwe)}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
