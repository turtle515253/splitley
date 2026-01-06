import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivities, formatRelativeTime } from '@/hooks/useActivities';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ChevronRight, Plus, CreditCard, Users, Trash, Loader2 } from 'lucide-react';
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
  const { data: activities = [], isLoading } = useActivities();
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
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentActivities.length > 0 ? (
          recentActivities.map((activity, index) => {
            const Icon = activityIcons[activity.type];
            const isClickable = (activity.type === 'expense_added' && activity.groupId) || activity.type === 'group_created';
            
            const handleActivityClick = () => {
              if (activity.type === 'expense_added' && activity.groupId) {
                navigate(`/group/${activity.groupId}`);
              } else if (activity.type === 'group_created') {
                const groupId = activity.id.replace('group-', '');
                navigate(`/group/${groupId}`);
              }
            };
            
            return (
              <div
                key={activity.id}
                onClick={isClickable ? handleActivityClick : undefined}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors animate-slide-up",
                  isClickable && "hover:bg-accent/50 cursor-pointer"
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
                {isClickable && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
        )}
      </CardContent>
    </Card>
  );
}
