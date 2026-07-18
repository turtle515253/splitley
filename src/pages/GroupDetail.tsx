import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroup, GroupMember } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowLeft, Plus, Settings, UserPlus, X, MoreVertical, Trash2, Pencil, BarChart3, Wallet, RefreshCw } from 'lucide-react';
import { isOfflineId } from '@/lib/offlineMutations';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { AddMemberDialog } from '@/components/groups/AddMemberDialog';
import { RemoveMemberDialog } from '@/components/groups/RemoveMemberDialog';
import { DeleteExpenseDialog } from '@/components/activity/DeleteExpenseDialog';
import { GroupBalanceSummary } from '@/components/groups/GroupBalanceSummary';
import { GroupDebtsCard } from '@/components/groups/GroupDebtsCard';
import { GroupSettlementHistory } from '@/components/groups/GroupSettlementHistory';
import { GroupChartsDialog } from '@/components/groups/GroupChartsDialog';
import { getCategoryIcon } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GroupDetail = () => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams();
  
  const { data: group, isLoading } = useGroup(groupId);
  
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; description: string } | null>(null);
  const [showBalanceSummary, setShowBalanceSummary] = useState(false);
  const [showChartsDialog, setShowChartsDialog] = useState(false);
  const isCreator = group?.created_by === user?.id;
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="safe-top">
          <header className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
              </CardContent>
            </Card>
          </header>
          <div className="px-5 mb-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center min-w-[60px]">
                  <Skeleton className="h-12 w-12 rounded-full mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 pb-8">
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!group) {
    return (
      <AppLayout>
        <div className="safe-top px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
          <div className="text-center mt-12">
            <h2 className="text-xl font-semibold">Group not found</h2>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="bg-background">
        {/* Top bar - stays pinned while content scrolls (Splitwise-style) */}
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-5 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{group.emoji || '👥'}</span>
                <h1 className="text-xl font-bold truncate">{group.name}</h1>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Group Stats */}
        <div className="px-5 pt-4 pb-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{formatCurrency(group.totalExpenses)}</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/add-expense?groupId=${groupId}`)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="px-5 pb-8">
          {/* Members */}
          <div className="mb-6 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Members ({group.members.length})
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowAddMemberDialog(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {group.members.map((member) => {
                const canRemove = isCreator && member.user_id !== user?.id;
                return (
                  <div key={member.id} className="flex flex-col items-center min-w-[60px] relative group">
                    {canRemove && (
                      <button
                        onClick={() => setMemberToRemove(member)}
                        className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <Avatar className="h-12 w-12 mb-1">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {(member.display_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center truncate w-full">
                      {member.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => setShowChartsDialog(true)}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Charts
              </Button>
              <Button
                variant={showBalanceSummary ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => setShowBalanceSummary(!showBalanceSummary)}
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                Balances
              </Button>
            </div>
          </div>

          {/* Balance Summary */}
          {showBalanceSummary && (
            <div className="mb-6 space-y-4">
              <GroupDebtsCard
                members={group.members}
                expenses={group.expenses.map((e) => ({
                  id: e.id,
                  amount: Number(e.amount),
                  paid_by: e.paid_by,
                  splits: e.splits,
                }))}
                groupId={groupId!}
              />
              <GroupBalanceSummary
                members={group.members}
                expenses={group.expenses.map((e) => ({
                  id: e.id,
                  amount: Number(e.amount),
                  paid_by: e.paid_by,
                  splits: e.splits,
                }))}
                groupId={groupId}
              />
              <GroupSettlementHistory groupId={groupId!} />
            </div>
          )}

          {/* Expenses */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Expenses</h3>
            <div className="space-y-3">
              {group.expenses.length > 0 ? (
                group.expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg">
                            {isOfflineId(expense.id) ? (
                              <RefreshCw className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              getCategoryIcon(expense.category || 'general')
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Paid by {expense.paidByProfile?.display_name || 'Unknown'} • {format(new Date(expense.created_at), 'MMM d')}
                            </p>
                            {isOfflineId(expense.id) && (
                              <p className="text-xs text-destructive mt-0.5">
                                Not yet synced with the server
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{formatCurrency(Number(expense.amount))}</p>
                          {(expense.paid_by === user?.id || isCreator) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => navigate('/add-expense', {
                                    state: {
                                      editExpense: {
                                        id: expense.id,
                                        description: expense.description,
                                        amount: Number(expense.amount),
                                        category: expense.category,
                                        paid_by: expense.paid_by,
                                        group_id: groupId!,
                                        splits: expense.splits,
                                      },
                                    },
                                  })}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setExpenseToDelete({ id: expense.id, description: expense.description })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="py-8">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">No expenses in this group yet</p>
                    <Button className="mt-3" onClick={() => navigate(`/add-expense?groupId=${groupId}`)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Expense
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        groupId={groupId!}
        currentMemberIds={group.members.map(m => m.user_id)}
      />
      
      <RemoveMemberDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        groupId={groupId!}
        member={memberToRemove}
      />
      
      <DeleteExpenseDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        expenseId={expenseToDelete?.id || null}
        expenseDescription={expenseToDelete?.description || ''}
        groupId={groupId}
      />
      
      <GroupChartsDialog
        open={showChartsDialog}
        onOpenChange={setShowChartsDialog}
        expenses={group.expenses.map(e => ({
          id: e.id,
          amount: Number(e.amount),
          category: e.category,
          paid_by: e.paid_by,
          paidByProfile: e.paidByProfile,
        }))}
        members={group.members}
      />
    </AppLayout>
  );
};

export default GroupDetail;
