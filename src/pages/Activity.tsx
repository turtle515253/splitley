import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useActivities, formatRelativeTime, Activity as ActivityType } from '@/hooks/useActivities';
import { useSettlements, useDeleteSettlement } from '@/hooks/useSettlements';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Plus, CreditCard, Users, Trash, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DeleteExpenseDialog } from '@/components/activity/DeleteExpenseDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const activityIcons = {
  expense_added: Plus,
  expense_deleted: Trash,
  payment_made: CreditCard,
  group_created: Users,
  member_added: Users,
};

const activityColors = {
  expense_added: 'bg-primary/10 text-primary',
  expense_deleted: 'bg-negative/10 text-negative',
  payment_made: 'bg-positive/10 text-positive',
  group_created: 'bg-accent text-accent-foreground',
  member_added: 'bg-accent text-accent-foreground',
};

const Activity = () => {
  const { formatCurrency } = useCurrency();
  const { data: activities = [], isLoading } = useActivities();
  const { data: settlements = [], isLoading: settlementsLoading } = useSettlements();
  const deleteSettlement = useDeleteSettlement();
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; description: string; groupId?: string } | null>(null);
  const [settlementToDelete, setSettlementToDelete] = useState<{ id: string; amount: number } | null>(null);
  
  // Group activities by relative date
  const groupedActivities = activities.reduce((acc, activity) => {
    const dateKey = formatRelativeTime(activity.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, ActivityType[]>);

  const handleDeleteSettlement = () => {
    if (settlementToDelete) {
      deleteSettlement.mutate(settlementToDelete.id, {
        onSuccess: () => setSettlementToDelete(null),
      });
    }
  };

  return (
    <AppLayout>
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track expenses and payments
          </p>
        </header>

        {/* Tabs for Activity and Settlements */}
        <div className="px-5 pb-8">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="activity">All Activity</TabsTrigger>
              <TabsTrigger value="settlements">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : Object.entries(groupedActivities).length > 0 ? (
                Object.entries(groupedActivities).map(([date, items], groupIndex) => (
                  <div key={date} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      {date}
                    </h2>
                    <Card>
                      <CardContent className="p-2">
                        {items.map((activity, index) => {
                          const Icon = activityIcons[activity.type];
                          return (
                            <div
                              key={activity.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50 cursor-pointer",
                                index !== items.length - 1 && "border-b border-border/50"
                              )}
                            >
                              <div className={cn(
                                "p-2 rounded-lg shrink-0",
                                activityColors[activity.type]
                              )}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{activity.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {activity.amount && (
                                <span className={cn(
                                  "text-sm font-semibold shrink-0",
                                  activity.type === 'payment_made' && "text-positive",
                                  activity.type === 'expense_added' && "text-foreground"
                                )}>
                                  {activity.type === 'payment_made' ? '+' : ''}{formatCurrency(activity.amount)}
                                </span>
                              )}
                              {activity.type === 'expense_added' && activity.expenseId && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setExpenseToDelete({
                                        id: activity.expenseId!,
                                        description: activity.description.replace(/^(You|Someone) added "/, '').replace(/"$/, ''),
                                        groupId: activity.groupId
                                      })}
                                    >
                                      <Trash className="h-4 w-4 mr-2" />
                                      Delete Expense
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                ))
              ) : (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">No activity yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settlements" className="space-y-4">
              {settlementsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : settlements.length > 0 ? (
                <Card>
                  <CardContent className="p-2">
                    {settlements.map((settlement, index) => (
                      <div
                        key={settlement.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50",
                          index !== settlements.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-positive/10 shrink-0">
                          <CreditCard className="h-4 w-4 text-positive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {settlement.payerName} paid {settlement.receiverName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(settlement.createdAt, 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-positive shrink-0">
                          {formatCurrency(settlement.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setSettlementToDelete({ id: settlement.id, amount: settlement.amount })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No payments recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payments will appear here when you settle up with friends
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <DeleteExpenseDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        expenseId={expenseToDelete?.id ?? null}
        expenseDescription={expenseToDelete?.description ?? ''}
        groupId={expenseToDelete?.groupId}
      />

      <AlertDialog open={!!settlementToDelete} onOpenChange={(open) => !open && setSettlementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will undo the payment of {settlementToDelete ? formatCurrency(settlementToDelete.amount) : ''} and restore the balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSettlement}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSettlement.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Activity;
