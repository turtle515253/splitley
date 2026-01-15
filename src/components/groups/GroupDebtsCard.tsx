import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowRight, Handshake, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { GroupSettleDialog } from './GroupSettleDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupDebts, SimplifiedGroupDebt } from '@/hooks/useGroupDebts';

interface GroupDebtsCardProps {
  members: any[];
  expenses: any[];
  groupId: string;
}

export function GroupDebtsCard({ groupId }: GroupDebtsCardProps) {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [settleDebt, setSettleDebt] = useState<SimplifiedGroupDebt | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Use the shared hook for consistent debt calculation
  const { data: simplifiedDebts = [], isLoading } = useGroupDebts(groupId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Who Owes Whom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // All settled up
  if (simplifiedDebts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Who Owes Whom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4 text-positive">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All settled up!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Who Owes Whom
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {simplifiedDebts.map((debt, index) => {
            const canSettle = user?.id === debt.from.user_id;
            const isExpanded = expandedIndex === index;
            
            return (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}>
                        {debt.from.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">owes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      <p className={`text-sm font-medium ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}>
                        {debt.to.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">receives</p>
                    </div>
                  </div>
                  {!isExpanded && (
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      Tap to see full names
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-base font-semibold text-negative">
                    {formatCurrency(debt.amount)}
                  </span>
                  {canSettle && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettleDebt(debt);
                      }}
                    >
                      Settle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <GroupSettleDialog
        open={!!settleDebt}
        onOpenChange={(open) => !open && setSettleDebt(null)}
        debt={settleDebt ? {
          from: { user_id: settleDebt.from.user_id, display_name: settleDebt.from.display_name, avatar_url: settleDebt.from.avatar_url },
          to: { user_id: settleDebt.to.user_id, display_name: settleDebt.to.display_name, avatar_url: settleDebt.to.avatar_url },
          amount: settleDebt.amount,
        } : null}
        groupId={groupId}
      />
    </>
  );
}
