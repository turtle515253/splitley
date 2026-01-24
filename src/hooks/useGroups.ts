import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GroupMember {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Group {
  id: string;
  name: string;
  emoji: string | null;
  created_at: string;
  created_by: string | null;
  members: GroupMember[];
  totalExpenses: number;
}

export interface GroupWithDetails extends Group {
  expenses: {
    id: string;
    description: string;
    amount: number;
    category: string | null;
    created_at: string;
    paid_by: string;
    paidByProfile: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    splits: { user_id: string; amount: number; is_settled?: boolean | null }[];
  }[];
}

export function useGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["groups"],
    // Critical for offline persistence - never garbage collect this data
    gcTime: Infinity,
    // Use previous data as placeholder while fetching
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!user) return [];

      // Get groups the user is a member of
      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;
      if (!memberGroups || memberGroups.length === 0) return [];

      const groupIds = memberGroups.map((m) => m.group_id);

      // Fetch groups with their members
      const { data: groups, error: groupsError } = await supabase.from("groups").select("*").in("id", groupIds);

      if (groupsError) throw groupsError;
      if (!groups) return [];

      // For each group, get members and total expenses
      const groupsWithDetails = await Promise.all(
        groups.map(async (group) => {
          // Get members
          const { data: members } = await supabase.from("group_members").select("id, user_id").eq("group_id", group.id);

          // Get member profiles
          const memberProfiles: GroupMember[] = [];
          if (members) {
            for (const member of members) {
              const { data: profile } = await supabase
                .from("profiles_display")
                .select("display_name, avatar_url")
                .eq("id", member.user_id)
                .maybeSingle();

              memberProfiles.push({
                id: member.id,
                user_id: member.user_id,
                display_name: profile?.display_name ?? null,
                avatar_url: profile?.avatar_url ?? null,
              });
            }
          }

          // Get total expenses
          const { data: expenses } = await supabase.from("expenses").select("amount").eq("group_id", group.id);

          const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

          return {
            ...group,
            members: memberProfiles,
            totalExpenses,
          } as Group;
        }),
      );

      return groupsWithDetails;
    },
    enabled: true,
  });
}

export function useGroup(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["group", groupId],
    // Use previous data as placeholder while fetching
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<GroupWithDetails | null> => {
      if (!groupId || !user) return null;

      // Fetch the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();

      if (groupError) throw groupError;
      if (!group) return null;

      // Get members
      const { data: members } = await supabase.from("group_members").select("id, user_id").eq("group_id", group.id);

      // Get member profiles
      const memberProfiles: GroupMember[] = [];
      if (members) {
        for (const member of members) {
          const { data: profile } = await supabase
            .from("profiles_display")
            .select("display_name, avatar_url")
            .eq("id", member.user_id)
            .maybeSingle();

          memberProfiles.push({
            id: member.id,
            user_id: member.user_id,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          });
        }
      }

      // Get expenses with payer info
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, description, amount, category, created_at, paid_by")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      const expensesWithPayer = await Promise.all(
        (expenses ?? []).map(async (expense) => {
          const { data: profile } = await supabase
            .from("profiles_display")
            .select("display_name, avatar_url")
            .eq("id", expense.paid_by)
            .maybeSingle();

          // Fetch splits for this expense (including is_settled for debt calculations)
          const { data: splits } = await supabase
            .from("expense_splits")
            .select("user_id, amount, is_settled")
            .eq("expense_id", expense.id);

          return {
            ...expense,
            paidByProfile: profile,
            splits:
              splits?.map((s) => ({ user_id: s.user_id, amount: Number(s.amount), is_settled: s.is_settled })) ?? [],
          };
        }),
      );

      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

      return {
        ...group,
        members: memberProfiles,
        totalExpenses,
        expenses: expensesWithPayer,
      };
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, emoji, memberIds }: { name: string; emoji: string; memberIds: string[] }) => {
      if (!user) throw new Error("Must be logged in");

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          emoji,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add the creator as a member
      const { error: creatorMemberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
      });

      if (creatorMemberError) throw creatorMemberError;

      // Add other members
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map((userId) => ({
          group_id: group.id,
          user_id: userId,
        }));

        const { error: membersError } = await supabase.from("group_members").insert(memberInserts);

        if (membersError) throw membersError;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created successfully!");
    },
    onError: (error) => {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    },
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group", variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Member added successfully!");
    },
    onError: (error) => {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    },
  });
}

export function useSearchProfiles() {
  return useMutation({
    mutationFn: async (searchQuery: string) => {
      // Use the security definer function for profile discovery
      // This bypasses RLS safely and only returns non-sensitive fields
      const { data, error } = await supabase.rpc("search_profiles_for_discovery", {
        _search_query: searchQuery,
        _limit: 10,
      });

      if (error) throw error;
      return (data ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[];
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group", variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Member removed successfully!");
    },
    onError: (error) => {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    },
  });
}
