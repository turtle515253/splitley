import { Home, Users, Activity, User, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Groups', path: '/groups' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: User, label: 'Account', path: '/account' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 glass border-t border-border"
      style={{ paddingBottom: 'var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-lg mx-auto relative">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "animate-bounce-subtle")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* FAB Button */}
        <Button
          variant="fab"
          size="fab"
          onClick={() => navigate('/add-expense')}
          className="absolute left-1/2 -translate-x-1/2 -top-5 shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <div className="w-14" /> {/* Spacer for FAB */}

        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "animate-bounce-subtle")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
