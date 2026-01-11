import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface RemindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: Friend;
  balanceAmount: number;
}

export function RemindDialog({ open, onOpenChange, friend, balanceAmount }: RemindDialogProps) {
  const { formatCurrency } = useCurrency();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Update message when friend or balance changes
  useEffect(() => {
    if (open) {
      setMessage(
        `Hey ${friend.name.split(' ')[0]}! Just a friendly reminder that you owe me ${formatCurrency(balanceAmount)}. Let me know when you can settle up!`
      );
    }
  }, [open, friend.name, balanceAmount, formatCurrency]);

  const handleSend = async () => {
    setIsSending(true);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success(`Reminder sent to ${friend.name}!`);
    onOpenChange(false);
    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Reminder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar} />
              <AvatarFallback>
                {friend.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{friend.name}</p>
              <p className="text-sm text-positive font-semibold">
                Owes you {formatCurrency(balanceAmount)}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/10 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">In-app notification</span>
          </div>

          <div className="space-y-3">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Write your reminder message..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? 'Sending...' : 'Send Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
