import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useBalances, FriendBalance } from '@/hooks/useBalances';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettleUpDialog } from '@/components/friends/SettleUpDialog';
import { RemindDialog } from '@/components/friends/RemindDialog';

export function FriendBalanceList() {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { data: balances = [], isLoading } = useBalances();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [remindDialogOpen, setRemindDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<FriendBalance | null>(null);

  const handleSettleClick = (e: React.MouseEvent, balance: FriendBalance) => {
    e.stopPropagation();
    setSelectedBalance(balance);
    setSettleDialogOpen(true);
  };

  const handleRemindClick = (e: React.MouseEvent, balance: FriendBalance) => {
    e.stopPropagation();
    setSelectedBalance(balance);
    setRemindDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Friend Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-7 w-14 rounded-md" />
                  </div>
                </div>
              ))}
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
                  "flex items-center p-3 rounded-xl transition-all duration-200 hover:bg-accent/50 cursor-pointer animate-slide-up",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={balance.user.avatar} />
                  <AvatarFallback>
                    {balance.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="ml-2 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{balance.user.name}</p>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted-foreground">
                      {balance.amount > 0 ? 'owes you' : 'you owe'}
                    </span>
                    <span className={cn(
                      "font-semibold",
                      balance.amount > 0 ? "text-positive" : "text-negative"
                    )}>
                      {formatCurrency(Math.abs(balance.amount))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {balance.amount > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleRemindClick(e, balance)}
                      className="h-8 w-8"
                      title="Send reminder"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleSettleClick(e, balance)}
                    className="text-xs h-8 px-3"
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
        <>
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
          <RemindDialog
            open={remindDialogOpen}
            onOpenChange={setRemindDialogOpen}
            friend={{
              id: selectedBalance.user.id,
              name: selectedBalance.user.name,
              avatar: selectedBalance.user.avatar,
            }}
            balanceAmount={Math.abs(selectedBalance.amount)}
          />
        </>
      )}
    </>
  );
}
