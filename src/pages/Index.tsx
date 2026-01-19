import { AppLayout } from '@/components/layout/AppLayout';
import { BalanceCard } from '@/components/home/BalanceCard';
import { FriendBalanceList } from '@/components/home/FriendBalanceList';
import { RecentActivity } from '@/components/home/RecentActivity';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <AppLayout>
      <AppLayout.Header>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-negative rounded-full" />
          </Button>
        </div>
        <div className="mt-4 border-b border-border" />
      </AppLayout.Header>

      <AppLayout.Content className="px-5">
        <div className="space-y-5 pt-4">
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
      </AppLayout.Content>
    </AppLayout>
  );
};

export default Index;
