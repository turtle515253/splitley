import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { balances, activities, formatRelativeTime } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { SettleUpDialog } from '@/components/friends/SettleUpDialog';

export default function FriendDetail() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const balance = balances.find(b => b.userId === friendId);
  const friendActivities = activities.filter(a => a.user.id === friendId);

  // Use local state for balance if settled, otherwise use original
  const displayBalance = currentBalance !== null ? currentBalance : (balance?.amount ?? 0);

  const handleSettle = (amount: number) => {
    if (!balance) return;
    const newBalance = balance.amount < 0 
      ? displayBalance + amount 
      : displayBalance - amount;
    setCurrentBalance(Math.max(0, Math.min(0, newBalance)) === 0 ? newBalance : newBalance);
  };

  if (!balance) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-center text-muted-foreground mt-8">Friend not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Friend Details</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={balance.user.avatar} />
                <AvatarFallback className="text-xl">
                  {balance.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{balance.user.name}</h2>
              <p className="text-sm text-muted-foreground">{balance.user.email}</p>
              
              <div className="mt-4 p-4 rounded-xl bg-muted/30 w-full">
                <p className="text-sm text-muted-foreground mb-1">
                  {displayBalance > 0 ? 'owes you' : displayBalance < 0 ? 'you owe' : 'settled up'}
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  displayBalance > 0 ? "text-positive" : displayBalance < 0 ? "text-negative" : "text-muted-foreground"
                )}>
                  {displayBalance !== 0 && (displayBalance > 0 ? '+' : '-')}
                  {formatCurrency(Math.abs(displayBalance))}
                </p>
              </div>

              {displayBalance !== 0 && (
                <Button className="w-full mt-4" onClick={() => setShowSettleUp(true)}>
                  {displayBalance > 0 ? 'Remind' : 'Settle Up'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <SettleUpDialog
          open={showSettleUp}
          onOpenChange={setShowSettleUp}
          friend={balance.user}
          balanceAmount={displayBalance}
          onSettle={handleSettle}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {friendActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity with this friend yet.
              </p>
            ) : (
              friendActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                  {activity.amount && (
                    <span className="font-semibold text-sm">
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
