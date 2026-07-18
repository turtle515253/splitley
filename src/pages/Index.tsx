import { AppLayout } from '@/components/layout/AppLayout';
import { BalanceCard } from '@/components/home/BalanceCard';
import { FriendBalanceList } from '@/components/home/FriendBalanceList';
import { RecentActivity } from '@/components/home/RecentActivity';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <AppLayout>
      <div className="bg-background">
        {/* Header - stays pinned while content scrolls */}
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-5 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-negative rounded-full" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 space-y-5 pb-8 pt-4">
          <BalanceCard />
          <FriendBalanceList />
          <RecentActivity />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
