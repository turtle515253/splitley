import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroup } from '@/hooks/useGroups';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowLeft, Plus, Settings, UserPlus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { AddMemberDialog } from '@/components/groups/AddMemberDialog';

const GroupDetail = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { groupId } = useParams();
  
  const { data: group, isLoading } = useGroup(groupId);
  
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="safe-top flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{group.emoji || '👥'}</span>
                <h1 className="text-xl font-bold">{group.name}</h1>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Group Stats */}
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
        </header>

        {/* Members */}
        <div className="px-5 mb-6">
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
            {group.members.map((member) => (
              <div key={member.id} className="flex flex-col items-center min-w-[60px]">
                <Avatar className="h-12 w-12 mb-1">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {(member.display_name || member.email || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-center truncate w-full">
                  {member.display_name?.split(' ')[0] || member.email?.split('@')[0] || 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="px-5 pb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Expenses</h3>
          <div className="space-y-3">
            {group.expenses.length > 0 ? (
              group.expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg">
                          {expense.category === 'food' ? '🍽️' : 
                           expense.category === 'transport' ? '🚗' : 
                           expense.category === 'entertainment' ? '🎬' : 
                           expense.category === 'shopping' ? '🛍️' : '📝'}
                        </div>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid by {expense.paidByProfile?.display_name || 'Unknown'} • {format(new Date(expense.created_at), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(Number(expense.amount))}</p>
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
      
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        groupId={groupId!}
        currentMemberIds={group.members.map(m => m.user_id)}
      />
    </AppLayout>
  );
};

export default GroupDetail;
