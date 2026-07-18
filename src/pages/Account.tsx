import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { CurrencySelector } from '@/components/settings/CurrencySelector';
import { AppearanceSelector } from '@/components/settings/AppearanceSelector';
import { NotificationsSelector } from '@/components/settings/NotificationsSelector';
import { EditProfileDialog } from '@/components/account/EditProfileDialog';
import { InviteFriendsDialog } from '@/components/account/InviteFriendsDialog';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { SecuritySheet } from '@/components/security/SecuritySheet';
import { PRIVACY_POLICY_URL } from '@/lib/appConfig';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
  ChevronRight,
  Settings,
  Bell,
  Shield,
  LogOut,
  User,
  Palette,
  Share,
  Coins,
  X,
  Loader2,
  Trash2,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const menuItems = [
  { icon: User, label: 'Edit Profile', subtitle: 'Update your personal info', action: 'profile' },
  { icon: Coins, label: 'Currency', subtitle: 'Change display currency', action: 'currency' },
  { icon: Bell, label: 'Notifications', subtitle: 'Customize alerts', action: 'notifications' },
  { icon: Palette, label: 'Appearance', subtitle: 'Theme and display', action: 'appearance' },
  { icon: Shield, label: 'Privacy', subtitle: 'Read our privacy policy', action: 'privacy' },
  { icon: Fingerprint, label: 'Security', subtitle: 'App lock and biometrics', action: 'security' },
  { icon: Share, label: 'Invite Friends', subtitle: 'Earn rewards', action: 'invite' },
];

const Account = () => {
  const { profile, logout, isLoading } = useAuth();
  const { currency } = useCurrency();
  const { theme } = useTheme();
  const { permission: notificationPermission } = useNotifications();
  const navigate = useNavigate();
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showAppearanceSelector, setShowAppearanceSelector] = useState(false);
  const [showNotificationsSelector, setShowNotificationsSelector] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showSecuritySheet, setShowSecuritySheet] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleMenuClick = (action: string) => {
    switch (action) {
      case 'currency':
        setShowCurrencySelector(true);
        break;
      case 'appearance':
        setShowAppearanceSelector(true);
        break;
      case 'profile':
        setShowEditProfile(true);
        break;
      case 'invite':
        setShowInviteFriends(true);
        break;
      case 'notifications':
        setShowNotificationsSelector(true);
        break;
      case 'privacy':
        if (Capacitor.isNativePlatform()) {
          void Browser.open({ url: PRIVACY_POLICY_URL });
        } else {
          window.open(PRIVACY_POLICY_URL, '_blank');
        }
        break;
      case 'security':
        setShowSecuritySheet(true);
        break;
    }
  };

  const getSubtitle = (item: typeof menuItems[0]) => {
    if (item.action === 'currency') {
      return `${currency.name} (${currency.symbol})`;
    }
    if (item.action === 'appearance') {
      return theme.charAt(0).toUpperCase() + theme.slice(1);
    }
    if (item.action === 'notifications') {
      return notificationPermission === 'granted' ? 'Enabled' : 'Disabled';
    }
    return item.subtitle;
  };

  const initials = profile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-background">
        {/* Header - stays pinned while content scrolls */}
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-5 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Account</h1>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="px-5 pb-8 pt-4">
          {/* Profile Card */}
          <Card className="animate-fade-in mb-5">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{profile?.display_name || 'User'}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowEditProfile(true)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
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
                      {getSubtitle(item)}
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
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Log Out
          </Button>

          {/* Delete Account Button */}
          <Button 
            variant="ghost" 
            className="w-full mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteAccount(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Splitley v1.0.0
          </p>
        </div>
      </div>

      {/* Dialogs */}
      <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
      <InviteFriendsDialog open={showInviteFriends} onOpenChange={setShowInviteFriends} />
      <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
      <SecuritySheet open={showSecuritySheet} onOpenChange={setShowSecuritySheet} />

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

      {/* Appearance Selector Modal */}
      {showAppearanceSelector && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-elegant animate-slide-up safe-bottom">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Appearance</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowAppearanceSelector(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto pb-6">
                <AppearanceSelector onClose={() => setShowAppearanceSelector(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Selector Modal */}
      {showNotificationsSelector && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-elegant animate-slide-up safe-bottom">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowNotificationsSelector(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto pb-6">
                <NotificationsSelector onClose={() => setShowNotificationsSelector(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Account;
