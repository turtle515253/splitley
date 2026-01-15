/**
 * Splitwise-style debt simplification algorithm
 * Goal: Minimize the number of transactions by redistributing debts
 */

export interface DebtMember {
  id: string;
  name?: string;
  avatar?: string;
}

export interface SimplifiedDebt {
  from: DebtMember;
  to: DebtMember;
  amount: number;
}

interface BalanceEntry {
  member: DebtMember;
  amount: number;
}

/**
 * Takes a map of balances (positive = owed money, negative = owes money)
 * and returns a list of simplified transactions to settle all debts
 */
export function simplifyDebts(
  balances: Map<string, { balance: number; member: DebtMember }>
): SimplifiedDebt[] {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors: BalanceEntry[] = [];
  const debtors: BalanceEntry[] = [];

  balances.forEach(({ balance, member }) => {
    const roundedBalance = Math.round(balance);
    if (roundedBalance > 0) {
      creditors.push({ member, amount: roundedBalance });
    } else if (roundedBalance < 0) {
      debtors.push({ member, amount: Math.abs(roundedBalance) });
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
