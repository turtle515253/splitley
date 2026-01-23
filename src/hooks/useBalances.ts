import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupDebts } from "./useGroupDebts";

export interface FriendBalance {
  oderId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  amount: number; // positive = they owe you, negative = you owe them
}

export function useBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["balances", user?.id],
    // Critical for offline persistence - never garbage collect this data
    gcTime: Infinity,
    // Use previous data as placeholder while fetching
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<FriendBalance[]> => {
      if (!user) return [];

      // Get all groups the user is a member of
      const { data: userGroups } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);

      const groupIds = userGroups?.map((g) => g.group_id) || [];

      if (groupIds.length === 0) {
        return [];
      }

      // Aggregate debts from all groups
      const userDebts = new Map<string, FriendBalance>();

      for (const groupId of groupIds) {
        // Fetch group debts using the same logic as useGroupDebts
        const { data: membersData } = await supabase
          .from("group_members")
          .select(
            `
            user_id,
            profiles:profiles_display!fk_group_members_user_id (
              display_name,
              avatar_url
            )
          `,
          )
          .eq("group_id", groupId);

        const members = (membersData || []).map((m: any) => ({
          user_id: m.user_id,
          display_name: m.profiles?.display_name || null,
          avatar_url: m.profiles?.avatar_url || null,
        }));

        const memberIds = members.map((m) => m.user_id);

        const { data: expensesData } = await supabase
          .from("expenses")
          .select(
            `
            id,
            amount,
            paid_by,
            expense_splits!fk_expense_splits_expense_id (
              user_id,
              amount,
              is_settled
            )
          `,
          )
          .eq("group_id", groupId);

        const expenses = (expensesData || []).map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          paid_by: e.paid_by,
          splits: (e.expense_splits || []).map((s: any) => ({
            user_id: s.user_id,
            amount: Number(s.amount),
            is_settled: s.is_settled,
          })),
        }));

        const { data: groupSettlementsData } = await supabase
          .from("group_settlements")
          .select("payer_id, receiver_id, amount")
          .eq("group_id", groupId);

        const groupSettlements = (groupSettlementsData || []).map((s: any) => ({
          payer_id: s.payer_id,
          receiver_id: s.receiver_id,
          amount: Number(s.amount),
        }));

        const { data: regularSettlementsData } = await supabase
          .from("settlements")
          .select("payer_id, receiver_id, amount");

        const regularSettlements = (regularSettlementsData || [])
          .filter((s: any) => memberIds.includes(s.payer_id) && memberIds.includes(s.receiver_id))
          .map((s: any) => ({
            payer_id: s.payer_id,
            receiver_id: s.receiver_id,
            amount: Number(s.amount),
          }));

        // Import the shared calculation function
        const { calculateDebtsFromData } = await import("./useGroupDebts");
        const debts = calculateDebtsFromData(members, expenses, groupSettlements, regularSettlements);

        // Aggregate only debts involving current user
        for (const debt of debts) {
          if (debt.from.user_id === user.id) {
            // User owes someone
            const existing = userDebts.get(debt.to.user_id);
            if (existing) {
              existing.amount -= debt.amount;
            } else {
              userDebts.set(debt.to.user_id, {
                oderId: debt.to.user_id,
                user: {
                  id: debt.to.user_id,
                  name: debt.to.display_name || "Unknown",
                  avatar: debt.to.avatar_url || undefined,
                },
                amount: -debt.amount,
              });
            }
          } else if (debt.to.user_id === user.id) {
            // Someone owes the user
            const existing = userDebts.get(debt.from.user_id);
            if (existing) {
              existing.amount += debt.amount;
            } else {
              userDebts.set(debt.from.user_id, {
                oderId: debt.from.user_id,
                user: {
                  id: debt.from.user_id,
                  name: debt.from.display_name || "Unknown",
                  avatar: debt.from.avatar_url || undefined,
                },
                amount: debt.amount,
              });
            }
          }
        }
      }

      return Array.from(userDebts.values()).filter((b) => Math.abs(b.amount) >= 1);
    },
    enabled: true,
  });
}
