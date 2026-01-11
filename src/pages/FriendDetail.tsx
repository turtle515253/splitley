import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBalances } from '@/hooks/useBalances';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { SettleUpDialog } from '@/components/friends/SettleUpDialog';
import { RemindDialog } from '@/components/friends/RemindDialog';
import { SettlementHistory } from '@/components/friends/SettlementHistory';
import { Skeleton } from '@/components/ui/skeleton';

export default function FriendDetail() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showRemind, setShowRemind] = useState(false);
  
  const { data: balances, isLoading } = useBalances();
  
  const balance = balances?.find(b => b.user.id === friendId);

  if (isLoading) {
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
              <div className="flex flex-col items-center">
                <Skeleton className="h-20 w-20 rounded-full mb-3" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!balance) {
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
        <div className="p-4">
          <p className="text-center text-muted-foreground mt-8">
            No balance found with this friend. You may have already settled up!
          </p>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const displayBalance = balance.amount;
  const friend = {
    id: balance.user.id,
    name: balance.user.name,
    avatar: balance.user.avatar,
  };

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
                <AvatarImage src={friend.avatar} />
                <AvatarFallback className="text-xl">
                  {friend.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{friend.name}</h2>
              
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
                <Button 
                  className="w-full mt-4" 
                  onClick={() => displayBalance > 0 ? setShowRemind(true) : setShowSettleUp(true)}
                >
                  {displayBalance > 0 ? 'Remind' : 'Settle Up'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <SettleUpDialog
          open={showSettleUp}
          onOpenChange={setShowSettleUp}
          friend={friend}
          balanceAmount={displayBalance}
        />

        <RemindDialog
          open={showRemind}
          onOpenChange={setShowRemind}
          friend={friend}
          balanceAmount={displayBalance}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {displayBalance > 0 
                  ? `${friend.name} owes you ${formatCurrency(Math.abs(displayBalance))} from shared expenses.`
                  : displayBalance < 0
                  ? `You owe ${friend.name} ${formatCurrency(Math.abs(displayBalance))} from shared expenses.`
                  : `You're all settled up with ${friend.name}!`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <SettlementHistory friendId={friend.id} friendName={friend.name} />
      </div>
    </div>
  );
}
