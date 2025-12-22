import { AppLayout } from '@/components/layout/AppLayout';
import { BalanceCard } from '@/components/home/BalanceCard';
import { FriendBalanceList } from '@/components/home/FriendBalanceList';
import { RecentActivity } from '@/components/home/RecentActivity';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <AppLayout>
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="text-2xl font-bold">SplitEase</h1>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-negative rounded-full" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 space-y-5 pb-8">
          <div className="animate-fade-in">
            <BalanceCard />
          </div>
          
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <FriendBalanceList />
          </div>
          
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
