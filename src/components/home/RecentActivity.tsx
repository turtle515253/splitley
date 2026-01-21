import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivities, formatRelativeTime } from '@/hooks/useActivities';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  ChevronRight, Plus, CreditCard, Users, Trash,
  Utensils, Coffee, Car, ShoppingCart, Home, Plane, Film, Gamepad2,
  Gift, Zap, Wifi, Briefcase, GraduationCap, Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

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
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : recentActivities.length > 0 ? (
          recentActivities.map((activity, index) => {
            const category = activity.category || 'general';
            const CategoryIcon = activity.type === 'expense_added' 
              ? (categoryIcons[category] || categoryIcons.general)
              : activity.type === 'payment_made'
              ? CreditCard
              : Users;
            const iconColor = activity.type === 'expense_added'
              ? (categoryColors[category] || categoryColors.general)
              : activityColors[activity.type];
            
            const isClickable = (activity.type === 'expense_added' && activity.groupId) || activity.type === 'group_created';
            
            const handleActivityClick = () => {
              if (activity.type === 'expense_added' && activity.groupId) {
                navigate(`/groups/${activity.groupId}`);
              } else if (activity.type === 'group_created') {
                const groupId = activity.id.replace('group-', '');
                navigate(`/groups/${groupId}`);
              }
            };
            
            return (
              <div
                key={activity.id}
                onClick={isClickable ? handleActivityClick : undefined}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl transition-colors animate-slide-up",
                  isClickable && "hover:bg-accent/50 cursor-pointer"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  iconColor
                )}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {activity.type === 'expense_added' && activity.expenseDescription && (
                      <>
                        <span className="font-semibold">{activity.addedByName || activity.payerName}</span>
                        {' added "'}
                        <span className="font-semibold">{activity.expenseDescription}</span>
                        {'"'}
                      </>
                    )}
                    {activity.type === 'payment_made' && (
                      <span className="font-semibold">{activity.payerName}</span>
                    )}
                    {activity.type === 'group_created' && activity.groupName && (
                      <>
                        <span className="font-semibold">{activity.payerName}</span>
                        <span className="text-muted-foreground"> created "{activity.groupName}"</span>
                      </>
                    )}
                  </p>
                  {activity.userShare !== undefined && activity.userShare !== 0 && (
                    <p className={cn(
                      "text-xs font-semibold",
                      activity.userShare > 0 ? "text-positive" : "text-negative"
                    )}>
                      {activity.userShare > 0 
                        ? `You get back ${formatCurrency(activity.userShare)}`
                        : `You owe ${formatCurrency(Math.abs(activity.userShare))}`
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
                {isClickable && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet. Add an expense to get started!</p>
        )}
      </CardContent>
    </Card>
  );
}
