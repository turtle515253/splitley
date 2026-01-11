import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useActivities, formatRelativeTime, Activity as ActivityType } from '@/hooks/useActivities';
import { useSettlements, useDeleteSettlement } from '@/hooks/useSettlements';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Plus, CreditCard, Users, Trash, Loader2, MoreVertical, Trash2,
  Utensils, Coffee, Car, ShoppingCart, Home, Plane, Film, Gamepad2,
  Heart, Gift, Zap, Wifi, Briefcase, GraduationCap, Stethoscope
} from 'lucide-react';
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

// Category icons mapping
const categoryIcons: Record<string, any> = {
  food: Utensils,
  drinks: Coffee,
  transport: Car,
  shopping: ShoppingCart,
  groceries: ShoppingCart,
  home: Home,
  travel: Plane,
  entertainment: Film,
  games: Gamepad2,
  health: Stethoscope,
  gifts: Gift,
  utilities: Zap,
  internet: Wifi,
  work: Briefcase,
  education: GraduationCap,
  general: Plus,
};

const categoryColors: Record<string, string> = {
  food: 'bg-orange-500/20 text-orange-500',
  drinks: 'bg-amber-500/20 text-amber-500',
  transport: 'bg-blue-500/20 text-blue-500',
  shopping: 'bg-pink-500/20 text-pink-500',
  groceries: 'bg-green-500/20 text-green-500',
  home: 'bg-purple-500/20 text-purple-500',
  travel: 'bg-cyan-500/20 text-cyan-500',
  entertainment: 'bg-red-500/20 text-red-500',
  games: 'bg-indigo-500/20 text-indigo-500',
  health: 'bg-rose-500/20 text-rose-500',
  gifts: 'bg-fuchsia-500/20 text-fuchsia-500',
  utilities: 'bg-yellow-500/20 text-yellow-500',
  internet: 'bg-teal-500/20 text-teal-500',
  work: 'bg-slate-500/20 text-slate-500',
  education: 'bg-emerald-500/20 text-emerald-500',
  general: 'bg-primary/20 text-primary',
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

  // Calculate payment summary
  const paymentSummary = settlements.reduce(
    (acc, settlement) => {
      // Check if current user paid (payerName is "You")
      if (settlement.payerName === 'You') {
        acc.totalPaid += settlement.amount;
      } else {
        acc.totalReceived += settlement.amount;
      }
      return acc;
    },
    { totalPaid: 0, totalReceived: 0 }
  );
  
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
                          // Get category icon for expenses
                          const category = activity.category || 'general';
                          const CategoryIcon = activity.type === 'expense_added' 
                            ? (categoryIcons[category] || categoryIcons.general)
                            : activity.type === 'payment_made'
                            ? CreditCard
                            : Users;
                          const iconColor = activity.type === 'expense_added'
                            ? (categoryColors[category] || categoryColors.general)
                            : activityColors[activity.type];
                          
                          return (
                            <div
                              key={activity.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50 cursor-pointer",
                                index !== items.length - 1 && "border-b border-border/50"
                              )}
                            >
                              <div className={cn(
                                "p-2.5 rounded-lg shrink-0",
                                iconColor
                              )}>
                                <CategoryIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {activity.type === 'expense_added' && (
                                    <>
                                      <span className="font-semibold">{activity.addedByName}</span>
                                      {' added "'}
                                      <span className="font-semibold">{activity.expenseDescription}</span>
                                      {'"'}
                                      {activity.groupName && (
                                        <span className="text-muted-foreground"> in "{activity.groupName}"</span>
                                      )}
                                    </>
                                  )}
                                  {activity.type === 'payment_made' && (
                                    <>
                                      <span className="font-semibold">{activity.payerName}</span>
                                      <span className="text-muted-foreground"> recorded a payment</span>
                                    </>
                                  )}
                                  {activity.type === 'group_created' && (
                                    <>
                                      <span className="font-semibold">{activity.payerName}</span>
                                      <span className="text-muted-foreground"> created "{activity.groupName}"</span>
                                    </>
                                  )}
                                </p>
                                {activity.type === 'expense_added' && activity.payerName !== activity.addedByName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Paid by {activity.payerName}
                                  </p>
                                )}
                                {activity.userShare !== undefined && activity.userShare !== 0 && (
                                  <p className={cn(
                                    "text-sm font-semibold mt-0.5",
                                    activity.userShare > 0 ? "text-positive" : "text-negative"
                                  )}>
                                    {activity.userShare > 0 
                                      ? `You get back ${formatCurrency(activity.userShare)}`
                                      : `You owe ${formatCurrency(Math.abs(activity.userShare))}`
                                    }
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(activity.createdAt, 'd/MM/yyyy, h:mm a')}
                                </p>
                              </div>
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
                                        description: activity.expenseDescription || '',
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
              ) : (
                <>
                  {/* Payment Summary */}
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Payment Summary</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-positive/10">
                          <p className="text-xs text-muted-foreground mb-1">You Received</p>
                          <p className="text-lg font-bold text-positive">
                            +{formatCurrency(paymentSummary.totalReceived)}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-negative/10">
                          <p className="text-xs text-muted-foreground mb-1">You Paid</p>
                          <p className="text-lg font-bold text-negative">
                            -{formatCurrency(paymentSummary.totalPaid)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 text-center">
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className={cn(
                          "text-xl font-bold",
                          paymentSummary.totalReceived - paymentSummary.totalPaid >= 0 ? "text-positive" : "text-negative"
                        )}>
                          {paymentSummary.totalReceived - paymentSummary.totalPaid >= 0 ? '+' : ''}
                          {formatCurrency(paymentSummary.totalReceived - paymentSummary.totalPaid)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {settlements.length > 0 ? (
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
                </>
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
