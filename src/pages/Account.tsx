import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { currentUser } from '@/data/mockData';
import { 
  ChevronRight, 
  Settings, 
  CreditCard, 
  Bell, 
  HelpCircle, 
  Shield, 
  LogOut,
  User,
  Palette,
  Share
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: User, label: 'Edit Profile', subtitle: 'Update your personal info' },
  { icon: CreditCard, label: 'Payment Methods', subtitle: 'Manage cards and accounts' },
  { icon: Bell, label: 'Notifications', subtitle: 'Customize alerts' },
  { icon: Palette, label: 'Appearance', subtitle: 'Theme and display' },
  { icon: Shield, label: 'Privacy & Security', subtitle: 'Protect your account' },
  { icon: Share, label: 'Invite Friends', subtitle: 'Earn rewards' },
  { icon: HelpCircle, label: 'Help & Support', subtitle: 'Get assistance' },
];

const Account = () => {
  return (
    <AppLayout>
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Account</h1>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Profile Card */}
        <div className="px-5 mb-5">
          <Card className="animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="text-xl">
                    {currentUser.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{currentUser.name}</h2>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        <div className="px-5 pb-8">
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50 text-left",
                    index !== menuItems.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div className="p-2 rounded-lg bg-accent">
                    <item.icon className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Logout Button */}
          <Button 
            variant="outline" 
            className="w-full mt-5 text-negative border-negative/20 hover:bg-negative/5 hover:text-negative"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6">
            SplitEase v1.0.0
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Account;
