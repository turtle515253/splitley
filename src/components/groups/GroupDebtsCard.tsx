import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowRight, Handshake, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { GroupSettleDialog } from './GroupSettleDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupSettlements, GroupSettlement } from '@/hooks/useGroupSettlements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

interface SimplifiedDebt {
  from: Member;
  to: Member;
  amount: number;
}

interface GroupDebtsCardProps {
  members: Member[];
  expenses: Expense[];
  groupId: string;
}

interface Settlement {
  payer_id: string;
  receiver_id: string;
  amount: number;
}

/**
 * Splitwise-style debt simplification algorithm with full settlement priority
 * Goal: Each person pays/receives from as few people as possible
 * Strategy: Try to match each debtor with a single creditor when possible
 */
function calculateSimplifiedDebts(
  members: Member[], 
  expenses: Expense[],
  groupSettlements: GroupSettlement[],
  regularSettlements: Settlement[]
): SimplifiedDebt[] {
  // Calculate net balance for each member
  const balances: Record<string, number> = {};
  
  // Get member IDs for filtering
  const memberIds = new Set(members.map(m => m.user_id));
  
  // Initialize all members with 0
  members.forEach(m => {
    balances[m.user_id] = 0;
  });

  // Calculate what each person paid vs what they owe from expenses
  for (const expense of expenses) {
    // Person who paid gets credit
    if (balances[expense.paid_by] !== undefined) {
      balances[expense.paid_by] += Number(expense.amount);
    }

    // Each person's share is their debt
    for (const split of expense.splits || []) {
      if (balances[split.user_id] !== undefined) {
        balances[split.user_id] -= Number(split.amount);
      }
    }
  }

  // Apply group settlements - when payer pays receiver, payer's balance increases (less in debt)
  // and receiver's balance decreases (received less)
  for (const settlement of groupSettlements) {
    if (balances[settlement.payer_id] !== undefined) {
      balances[settlement.payer_id] += Number(settlement.amount);
    }
    if (balances[settlement.receiver_id] !== undefined) {
      balances[settlement.receiver_id] -= Number(settlement.amount);
    }
  }

  // Apply regular settlements (from Friend Balances) between group members
  for (const settlement of regularSettlements) {
    // Only apply if both parties are group members
    if (memberIds.has(settlement.payer_id) && memberIds.has(settlement.receiver_id)) {
      if (balances[settlement.payer_id] !== undefined) {
        balances[settlement.payer_id] += Number(settlement.amount);
      }
      if (balances[settlement.receiver_id] !== undefined) {
        balances[settlement.receiver_id] -= Number(settlement.amount);
      }
    }
  }

  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors: { member: Member; amount: number }[] = [];
  const debtors: { member: Member; amount: number }[] = [];

  members.forEach(member => {
    const balance = Math.round(balances[member.user_id] || 0);
    if (balance > 0) {
      creditors.push({ member, amount: balance });
    } else if (balance < 0) {
      debtors.push({ member, amount: Math.abs(balance) });
    }
  });

  // Sort by amount (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedDebt[] = [];

  // Phase 1: Try to find exact matches (debtor amount = creditor amount)
  for (let d = 0; d < debtors.length; d++) {
    if (debtors[d].amount < 1) continue;
    
    for (let c = 0; c < creditors.length; c++) {
      if (creditors[c].amount < 1) continue;
      
      // Check for exact or near-exact match
      if (Math.abs(debtors[d].amount - creditors[c].amount) < 1) {
        transactions.push({
          from: debtors[d].member,
          to: creditors[c].member,
          amount: debtors[d].amount,
        });
        creditors[c].amount = 0;
        debtors[d].amount = 0;
        break;
      }
    }
  }

  // Phase 2: Match remaining debtors to creditors
  // Strategy: Each debtor pays to the largest available creditor(s)
  for (const debtor of debtors) {
    if (debtor.amount < 1) continue;
    
    // Find a single creditor who can absorb this debtor's full amount
    const singleCreditor = creditors.find(c => c.amount >= debtor.amount - 0.01 && c.amount > 0);
    
    if (singleCreditor) {
      // Debtor pays full amount to single creditor
      transactions.push({
        from: debtor.member,
        to: singleCreditor.member,
        amount: debtor.amount,
      });
      singleCreditor.amount -= debtor.amount;
      debtor.amount = 0;
    } else {
      // Must split across multiple creditors - pay to largest first
      for (const creditor of creditors) {
        if (debtor.amount < 1) break;
        if (creditor.amount < 1) continue;
        
        const transferAmount = Math.min(creditor.amount, debtor.amount);
        
        transactions.push({
          from: debtor.member,
          to: creditor.member,
          amount: transferAmount,
        });
        
        creditor.amount -= transferAmount;
        debtor.amount -= transferAmount;
      }
    }
  }

  // Filter out zero-amount transactions
  return transactions.filter(t => t.amount > 0);
}

export function GroupDebtsCard({ members, expenses, groupId }: GroupDebtsCardProps) {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [settleDebt, setSettleDebt] = useState<SimplifiedDebt | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { data: groupSettlements = [] } = useGroupSettlements(groupId);
  
  // Get member IDs for querying regular settlements
  const memberIds = members.map(m => m.user_id);
  
  // Fetch regular settlements between group members
  const { data: regularSettlements = [] } = useQuery({
    queryKey: ['settlements-for-group', groupId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('settlements')
        .select('payer_id, receiver_id, amount')
        .or(
          memberIds.map(id => `payer_id.eq.${id}`).join(',') + ',' +
          memberIds.map(id => `receiver_id.eq.${id}`).join(',')
        );
      
      if (error) {
        console.error('Error fetching settlements:', error);
        return [];
      }
      
      // Filter to only settlements between group members
      return (data || []).filter(
        s => memberIds.includes(s.payer_id) && memberIds.includes(s.receiver_id)
      );
    },
    enabled: memberIds.length > 0,
  });

  const simplifiedDebts = calculateSimplifiedDebts(members, expenses, groupSettlements, regularSettlements);

  if (expenses.length === 0) {
    return null;
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
            // User can settle if they are the one who owes
            const canSettle = user?.id === debt.from.user_id;
            const isExpanded = expandedIndex === index;
            
            return (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                {/* Debt info - tap to expand names */}
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p 
                        className={`text-sm font-medium ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}
                      >
                        {debt.from.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">owes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      <p 
                        className={`text-sm font-medium ${isExpanded ? 'whitespace-normal break-words' : 'truncate'}`}
                      >
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

                {/* Amount and settle button row */}
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
        debt={settleDebt}
        groupId={groupId}
      />
    </>
  );
}
