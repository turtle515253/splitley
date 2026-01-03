import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { Mail, MessageSquare, Send } from 'lucide-react';

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
  const [method, setMethod] = useState<'email' | 'sms' | 'app'>('app');
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
    
    const methodLabels = {
      email: 'Email',
      sms: 'SMS',
      app: 'In-app notification'
    };
    
    toast.success(`Reminder sent to ${friend.name} via ${methodLabels[method]}!`);
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

          <div className="space-y-3">
            <Label>Send via</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="app" id="app" />
                <Label htmlFor="app" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  In-app notification
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  SMS
                </Label>
              </div>
            </RadioGroup>
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
