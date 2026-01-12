import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGroupSettlements } from '@/hooks/useGroupSettlements';
import { ArrowRight, History } from 'lucide-react';
import { format } from 'date-fns';

interface GroupSettlementHistoryProps {
  groupId: string;
}

export function GroupSettlementHistory({ groupId }: GroupSettlementHistoryProps) {
  const { formatCurrency } = useCurrency();
  const { data: settlements = [], isLoading } = useGroupSettlements(groupId);

  if (isLoading || settlements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Settlement History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement) => (
          <div
            key={settlement.id}
            className="flex items-center gap-2 p-3 rounded-lg bg-positive-muted/50"
          >
            {/* Payer */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={settlement.payer_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(settlement.payer_profile?.display_name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">
                {settlement.payer_profile?.display_name?.split(' ')[0] || 'Unknown'}
              </span>
            </div>

            {/* Arrow and amount */}
            <div className="flex items-center gap-1.5 flex-shrink-0 px-2">
              <span className="text-sm font-semibold text-positive">
                {formatCurrency(settlement.amount)}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Receiver */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-sm font-medium truncate">
                {settlement.receiver_profile?.display_name?.split(' ')[0] || 'Unknown'}
              </span>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={settlement.receiver_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(settlement.receiver_profile?.display_name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Date */}
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {format(new Date(settlement.created_at), 'MMM d')}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
