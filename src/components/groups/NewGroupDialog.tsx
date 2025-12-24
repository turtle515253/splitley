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
import { toast } from 'sonner';
import { User } from '@/types';
import { users, currentUser } from '@/data/mockData';
import { UserPlus, X, Search, Check, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emojis = ['🏠', '✈️', '🎉', '🍕', '🎬', '⚽', '🎮', '🛒', '💼', '🎓'];

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewGroupDialog = ({ open, onOpenChange }: NewGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);

  const availableUsers = users.filter(
    user => user.id !== currentUser.id &&
    !selectedMembers.some(m => m.id === user.id) &&
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

  const handleInviteEmail = () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (pendingInvites.includes(inviteEmail)) {
      toast.error('This email is already invited');
      return;
    }
    setPendingInvites(prev => [...prev, inviteEmail]);
    setInviteEmail('');
    toast.success(`Invitation will be sent to ${inviteEmail}`);
  };

  const removeInvite = (email: string) => {
    setPendingInvites(prev => prev.filter(e => e !== email));
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    const totalMembers = selectedMembers.length + pendingInvites.length + 1;
    toast.success(`Group "${groupName}" created with ${totalMembers} member(s)!`);
    
    if (pendingInvites.length > 0) {
      toast.info(`${pendingInvites.length} invitation(s) will be sent`);
    }
    
    // Reset form
    setGroupName('');
    setSelectedEmoji('🏠');
    setSelectedMembers([]);
    setSearchQuery('');
    setInviteEmail('');
    setPendingInvites([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedEmoji('🏠');
    setSelectedMembers([]);
    setSearchQuery('');
    setInviteEmail('');
    setPendingInvites([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Emoji Selection */}
          <div>
            <Label htmlFor="emoji" className="text-sm font-medium">Choose an emoji</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedEmoji === emoji 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          {/* Group Name */}
          <div>
            <Label htmlFor="groupName" className="text-sm font-medium">Group name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Weekend Trip"
              className="mt-2"
            />
          </div>
          
          {/* Add Members */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Members
            </Label>
            
            <Tabs defaultValue="existing" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Users</TabsTrigger>
                <TabsTrigger value="invite">Invite New</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-3 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="max-h-[150px] overflow-y-auto space-y-2">
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => {
                      const isSelected = selectedMembers.some(m => m.id === user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleMember(user)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                            isSelected 
                              ? 'bg-primary/10 ring-2 ring-primary' 
                              : 'bg-accent hover:bg-accent/80'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No users found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="invite" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  Invite someone who hasn't joined yet. They'll be added once they register.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleInviteEmail()}
                  />
                  <Button size="sm" onClick={handleInviteEmail}>
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Selected Members & Pending Invites */}
          {(selectedMembers.length > 0 || pendingInvites.length > 0) && (
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
              {pendingInvites.map((email) => (
                <div 
                  key={email}
                  className="flex items-center gap-1 bg-accent text-muted-foreground px-2 py-1 rounded-full text-xs"
                >
                  <Mail className="h-3 w-3" />
                  <span>{email.split('@')[0]}</span>
                  <button onClick={() => removeInvite(email)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate}>
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
