import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { balances } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function FriendBalanceList() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const activeBalances = balances.filter(b => b.amount !== 0);
  const settledBalances = balances.filter(b => b.amount === 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Friend Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeBalances.length === 0 && settledBalances.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No balances yet. Add an expense to get started!
          </p>
        )}
        
        {activeBalances.map((balance, index) => (
          <div
            key={balance.userId}
            onClick={() => navigate(`/friend/${balance.userId}`)}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:bg-accent/50 cursor-pointer animate-slide-up",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={balance.user.avatar} />
                <AvatarFallback>
                  {balance.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{balance.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {balance.amount > 0 ? 'owes you' : 'you owe'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-semibold",
                balance.amount > 0 ? "text-positive" : "text-negative"
              )}>
                {balance.amount > 0 ? '+' : '-'}{formatCurrency(balance.amount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}

        {settledBalances.length > 0 && (
          <>
            {activeBalances.length > 0 && (
              <div className="pt-2 pb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Settled</p>
              </div>
            )}
            {settledBalances.map((balance) => (
              <div
                key={balance.userId}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 opacity-60">
                    <AvatarImage src={balance.user.avatar} />
                    <AvatarFallback>
                      {balance.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm text-muted-foreground">{balance.user.name}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Settled up</span>
                </div>
              </div>
            ))}
          </>
        )}

        {activeBalances.length > 0 && (
          <Button variant="secondary" className="w-full mt-3">
            Settle All Balances
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
