import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { activities, formatCurrency, formatRelativeTime } from '@/data/mockData';
import { Plus, CreditCard, Users, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const dateKey = formatRelativeTime(activity.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <AppLayout>
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all your expense history
          </p>
        </header>

        {/* Activity List */}
        <div className="px-5 space-y-6 pb-8">
          {Object.entries(groupedActivities).map(([date, items], groupIndex) => (
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
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {activities.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <p className="text-muted-foreground">No activity yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Activity;
