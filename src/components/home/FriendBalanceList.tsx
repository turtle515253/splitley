import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBalances, FriendBalance } from '@/hooks/useBalances';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettleUpDialog } from '@/components/friends/SettleUpDialog';

export function FriendBalanceList() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { data: balances = [], isLoading } = useBalances();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<FriendBalance | null>(null);

  const handleSettleClick = (e: React.MouseEvent, balance: FriendBalance) => {
    e.stopPropagation();
    setSelectedBalance(balance);
    setSettleDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Friend Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No balances yet. Add an expense to get started!
            </p>
          ) : (
            balances.map((balance, index) => (
              <div
                key={balance.user.id}
                onClick={() => navigate(`/friend/${balance.user.id}`)}
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
                    {balance.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(balance.amount))}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleSettleClick(e, balance)}
                    className="text-xs h-7 px-2"
                  >
                    Settle
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedBalance && (
        <SettleUpDialog
          open={settleDialogOpen}
          onOpenChange={setSettleDialogOpen}
          friend={{
            id: selectedBalance.user.id,
            name: selectedBalance.user.name,
            avatar: selectedBalance.user.avatar,
          }}
          balanceAmount={selectedBalance.amount}
        />
      )}
    </>
  );
}
