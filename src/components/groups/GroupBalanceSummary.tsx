import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Expense {
  id: string;
  amount: number;
  paid_by: string;
  splits?: { user_id: string; amount: number; is_settled?: boolean }[];
}

interface GroupBalanceSummaryProps {
  members: Member[];
  expenses: Expense[];
}

interface MemberBalance {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

export function GroupBalanceSummary({ members, expenses }: GroupBalanceSummaryProps) {
  const { formatCurrency } = useCurrency();

  // Calculate each member's contribution and share
  const memberBalances: MemberBalance[] = members.map((member) => {
    let totalPaid = 0;
    let totalShare = 0;

    for (const expense of expenses) {
      // What they paid
      if (expense.paid_by === member.user_id) {
        totalPaid += Number(expense.amount);
      }

      // What they owe (their share)
      const split = expense.splits?.find((s) => s.user_id === member.user_id);
      if (split) {
        totalShare += Number(split.amount);
      }
    }

    return {
      user_id: member.user_id,
      display_name: member.display_name || 'Unknown',
      avatar_url: member.avatar_url,
      totalPaid: Math.round(totalPaid),
      totalShare: Math.round(totalShare),
      netBalance: Math.round(totalPaid - totalShare),
    };
  });

  // Sort by net balance (creditors first)
  memberBalances.sort((a, b) => b.netBalance - a.netBalance);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Balance Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {memberBalances.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>
                {member.display_name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{member.display_name}</p>
              <p className="text-xs text-muted-foreground">
                Paid {formatCurrency(member.totalPaid)} • Share {formatCurrency(member.totalShare)}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5">
              {member.netBalance > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(member.netBalance)}
                  </span>
                </>
              ) : member.netBalance < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(member.netBalance)}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Settled
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}