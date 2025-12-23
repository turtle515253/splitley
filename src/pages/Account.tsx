import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencySelector } from '@/components/settings/CurrencySelector';
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
  Share,
  Coins,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const menuItems = [
  { icon: User, label: 'Edit Profile', subtitle: 'Update your personal info', action: 'profile' },
  { icon: CreditCard, label: 'Payment Methods', subtitle: 'Manage cards and accounts', action: 'payment' },
  { icon: Coins, label: 'Currency', subtitle: 'Change display currency', action: 'currency' },
  { icon: Bell, label: 'Notifications', subtitle: 'Customize alerts', action: 'notifications' },
  { icon: Palette, label: 'Appearance', subtitle: 'Theme and display', action: 'appearance' },
  { icon: Shield, label: 'Privacy & Security', subtitle: 'Protect your account', action: 'privacy' },
  { icon: Share, label: 'Invite Friends', subtitle: 'Earn rewards', action: 'invite' },
  { icon: HelpCircle, label: 'Help & Support', subtitle: 'Get assistance', action: 'help' },
];

const Account = () => {
  const { user, logout } = useAuth();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleMenuClick = (action: string) => {
    if (action === 'currency') {
      setShowCurrencySelector(true);
    }
  };

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
                  <AvatarFallback className="text-xl">
                    {user?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{user?.name || 'User'}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Currency Selector Modal */}
        {showCurrencySelector && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-elegant animate-slide-up safe-bottom">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Select Currency</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowCurrencySelector(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <CurrencySelector onClose={() => setShowCurrencySelector(false)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="px-5 pb-8">
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => handleMenuClick(item.action)}
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
                    <p className="text-xs text-muted-foreground">
                      {item.action === 'currency' ? `${currency.name} (${currency.symbol})` : item.subtitle}
                    </p>
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
            onClick={handleLogout}
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
