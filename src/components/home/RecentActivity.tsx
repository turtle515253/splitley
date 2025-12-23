import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { activities, formatRelativeTime } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ChevronRight, Plus, CreditCard, Users, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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

export function RecentActivity() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const recentActivities = activities.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <button 
          onClick={() => navigate('/activity')}
          className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
        >
          See all <ChevronRight className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type];
          return (
            <div
              key={activity.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50 cursor-pointer animate-slide-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "p-2 rounded-lg",
                activityColors[activity.type]
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
              {activity.amount && (
                <span className="text-sm font-semibold">
                  {formatCurrency(activity.amount)}
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
