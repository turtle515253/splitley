import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Gift, Share2, Users } from 'lucide-react';

interface InviteFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFriendsDialog({ open, onOpenChange }: InviteFriendsDialogProps) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const referralCode = 'SPLIT2024';
  const referralLink = `https://splitley.app/invite/${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const handleSendInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success(`Invitation sent to ${email}!`);
    setEmail('');
    setIsSending(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Splitley',
          text: 'Split expenses easily with friends! Use my referral code to get started.',
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or share failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reward Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Earn Rewards</p>
                <p className="text-xs text-muted-foreground">
                  Get ₹50 for each friend who joins!
                </p>
              </div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="space-y-2">
            <Label>Your Referral Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted/50 border font-mono text-lg tracking-wider text-center">
                {referralCode}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Send Invite via Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Invite via Email</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
              />
              <Button onClick={handleSendInvite} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 rounded-xl bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Friends Invited</span>
            </div>
            <span className="font-semibold">0</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Close
          </Button>
          <Button onClick={handleShare} className="sm:flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
