import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { users } from '@/data/mockData';
import { User } from '@/types';
import { toast } from 'sonner';
import { UserPlus, Mail, Search, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMembers: User[];
  onAddMembers: (members: User[]) => void;
  onInvite: (email: string) => void;
}

export const AddMemberDialog = ({ 
  open, 
  onOpenChange, 
  currentMembers, 
  onAddMembers,
  onInvite 
}: AddMemberDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  // Filter out already added members and search
  const availableUsers = users.filter(
    user => !currentMembers.some(m => m.id === user.id) &&
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleMember = (user: User) => {
    setSelectedMembers(prev => 
      prev.some(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const handleAddMembers = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    onAddMembers(selectedMembers);
    setSelectedMembers([]);
    setSearchQuery('');
    onOpenChange(false);
    toast.success(`Added ${selectedMembers.length} member(s) to the group`);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    onInvite(inviteEmail);
    setInviteEmail('');
    onOpenChange(false);
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="existing" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Users</TabsTrigger>
            <TabsTrigger value="invite">Invite New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => {
                  const isSelected = selectedMembers.some(m => m.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleMember(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-primary/10 ring-2 ring-primary' 
                          : 'bg-accent hover:bg-accent/80'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No users found</p>
                  <p className="text-xs mt-1">Try inviting someone new</p>
                </div>
              )}
            </div>
            
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                  >
                    <span>{member.name.split(' ')[0]}</span>
                    <button onClick={() => toggleMember(member)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddMembers} disabled={selectedMembers.length === 0}>
                Add ({selectedMembers.length})
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Send an invite to someone who hasn't joined yet. They'll be added to this group once they register.
              </p>
            </div>
            
            <div>
              <Label htmlFor="inviteEmail" className="text-sm font-medium">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="mt-2"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleInvite}>
                <Mail className="h-4 w-4 mr-1" />
                Send Invite
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
