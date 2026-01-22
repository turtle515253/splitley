import { Home, Users, Activity, User, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Groups', path: '/groups' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: User, label: 'Account', path: '/account' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline } = useOnlineStatus();

  const handleAddExpense = () => {
    if (isOnline) {
      navigate('/add-expense');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-lg mx-auto relative">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* FAB Button - disabled when offline */}
        {isOnline ? (
          <Button
            variant="fab"
            size="fab"
            onClick={handleAddExpense}
            className="absolute left-1/2 -translate-x-1/2 -top-5 shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute left-1/2 -translate-x-1/2 -top-5">
                <Button
                  variant="fab"
                  size="fab"
                  disabled
                  className="shadow-lg opacity-50 cursor-not-allowed"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>You're offline</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="w-14" /> {/* Spacer for FAB */}

        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
