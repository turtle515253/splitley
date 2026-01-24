import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityType = "expense_added" | "expense_deleted" | "payment_made" | "group_created" | "member_added";

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  expenseDescription?: string;
  payerName: string;
  addedByName?: string; // Who added/created the expense
  amount?: number;
  userShare?: number; // positive = you get back, negative = you owe
  category?: string;
  groupName?: string;
  createdAt: Date;
  expenseId?: string;
  groupId?: string;
}

export function useActivities() {
  const { user, isAuthResolved } = useAuth();

  return useQuery({
    queryKey: ["activities"],
    // Critical for offline persistence - never garbage collect this data
    gcTime: Infinity,
    // Use previous data as placeholder while fetching
    placeholderData: (previousData) => previousData,
    // Prevent persisting empty results before auth resolves
    retry: false,
    queryFn: async (): Promise<Activity[]> => {
      // Throw before auth resolves to prevent persisting empty data
      if (!isAuthResolved) {
        throw new Error('Auth not ready');
      }
      if (!user) return [];

      const activities: Activity[] = [];

      // Fetch expenses with related data using explicit foreign key hints
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          description,
          amount,
          category,
          created_at,
          paid_by,
          created_by,
          group_id,
          groups!fk_expenses_group_id (name),
          expense_splits!fk_expense_splits_expense_id (
            user_id,
            amount
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      console.log("[useActivities] Expenses fetched:", expenses?.length || 0, "Error:", expensesError);

      if (expenses && expenses.length > 0) {
        // Collect all payer and creator IDs to fetch their profiles
        const userIds = [...new Set(expenses.flatMap((e) => [e.paid_by, e.created_by]))];

        // Fetch profiles using profiles_display view (no email, less RLS restrictive)
        const { data: userProfiles } = await supabase
          .from("profiles_display")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(userProfiles?.map((p) => [p.id, p.display_name]) || []);

        for (const expense of expenses) {
          const expenseData = expense as any; // Type cast to access created_by
          const payerName = expenseData.paid_by === user.id ? "You" : profileMap.get(expenseData.paid_by) || "Someone";

          const createdById = expenseData.created_by || expenseData.paid_by;
          const addedByName = createdById === user.id ? "You" : profileMap.get(createdById) || "Someone";

          // Calculate user's share
          const splits = expense.expense_splits || [];
          const userSplit = splits.find((s: any) => s.user_id === user.id);
          const isUserPayer = expense.paid_by === user.id;

          let userShare = 0;
          if (isUserPayer) {
            // User paid - they get back the sum of other people's splits
            userShare = splits
              .filter((s: any) => s.user_id !== user.id)
              .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
          } else if (userSplit) {
            // User didn't pay but has a split - they owe this amount
            userShare = -Number(userSplit.amount);
          }

          activities.push({
            id: `expense-${expense.id}`,
            type: "expense_added",
            description: `${addedByName} added "${expense.description}"`,
            expenseDescription: expense.description,
            payerName,
            addedByName,
            amount: Number(expense.amount),
            userShare,
            category: expense.category || "general",
            groupName: (expense.groups as any)?.name,
            createdAt: new Date(expense.created_at),
            expenseId: expense.id,
            groupId: expense.group_id || undefined,
          });
        }
      }

      // Fetch settlements from the settlements table
      const { data: settlements } = await supabase
        .from("settlements")
        .select(
          `
          id,
          amount,
          created_at,
          payer_id,
          receiver_id
        `,
        )
        .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (settlements && settlements.length > 0) {
        // Collect all user IDs to fetch their profiles
        const userIds = [...new Set(settlements.flatMap((s) => [s.payer_id, s.receiver_id]))];

        const { data: userProfiles } = await supabase
          .from("profiles_display")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(userProfiles?.map((p) => [p.id, p.display_name]) || []);

        for (const settlement of settlements) {
          const payerName = settlement.payer_id === user.id ? "You" : profileMap.get(settlement.payer_id) || "Someone";
          const receiverName =
            settlement.receiver_id === user.id ? "you" : profileMap.get(settlement.receiver_id) || "someone";

          // If user is receiver, they received money (positive)
          // If user is payer, they paid (negative from their perspective for display)
          const userShare = settlement.receiver_id === user.id ? Number(settlement.amount) : -Number(settlement.amount);

          activities.push({
            id: `settlement-${settlement.id}`,
            type: "payment_made",
            description: `${payerName} paid ${receiverName}`,
            payerName,
            amount: Number(settlement.amount),
            userShare,
            createdAt: new Date(settlement.created_at),
          });
        }
      }

      // Fetch groups created by the user
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, created_at, created_by")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (groups) {
        for (const group of groups) {
          activities.push({
            id: `group-${group.id}`,
            type: "group_created",
            description: `You created "${group.name}"`,
            payerName: "You",
            groupName: group.name,
            createdAt: new Date(group.created_at),
          });
        }
      }

      // Sort all activities by date
      return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: true,
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
