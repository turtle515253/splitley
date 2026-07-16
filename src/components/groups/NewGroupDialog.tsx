import { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup, useSearchProfiles } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, X, Search, Check, Mail, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emojis = ['🏠', '✈️', '🎉', '🍕', '🎬', '⚽', '🎮', '🛒', '💼', '🎓'];

interface SelectedMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewGroupDialog = ({ open, onOpenChange }: NewGroupDialogProps) => {
  const { user } = useAuth();
  const createGroup = useCreateGroup();
  const searchProfiles = useSearchProfiles();
  
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SelectedMember[]>([]);

  // Search for users when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      searchProfiles.mutate(searchQuery, {
        onSuccess: (results) => {
          // Filter out current user and already selected members
          const filtered = results.filter(
            (profile) =>
              profile.id !== user?.id &&
              !selectedMembers.some((m) => m.id === profile.id)
          );
          setSearchResults(filtered);
        },
      });
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id, selectedMembers]);

  const toggleMember = (member: SelectedMember) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
    setSearchQuery('');
    setSearchResults([]);
  };

  const [isInviting, setIsInviting] = useState(false);

  const handleInviteEmail = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (pendingInvites.includes(email)) {
      toast.error('This email is already added');
      return;
    }
    // Members are added to the group (and emailed) once the group is created
    setPendingInvites((prev) => [...prev, email]);
    setInviteEmail('');
  };

  const removeInvite = (email: string) => {
    setPendingInvites((prev) => prev.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const group = await createGroup.mutateAsync({
        name: groupName.trim(),
        emoji: selectedEmoji,
        memberIds: selectedMembers.map((m) => m.id),
      });

      if (pendingInvites.length > 0) {
        setIsInviting(true);
        const results = await Promise.allSettled(
          pendingInvites.map((email) =>
            supabase.functions.invoke('add-member', {
              body: { email, groupId: group.id },
            }).then(({ data, error }) => {
              if (error) throw error;
              if (data?.error) throw new Error(data.error);
            })
          )
        );
        setIsInviting(false);

        const failed = results.filter((r) => r.status === 'rejected').length;
        const added = pendingInvites.length - failed;
        if (added > 0) {
          toast.success(`${added} member(s) added to the group and notified by email!`);
        }
        if (failed > 0) {
          toast.error(`Failed to add ${failed} member(s). You can add them from the group page.`);
        }
      }

      // Reset form
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const resetForm = () => {
    setGroupName('');
    setSelectedEmoji('🏠');
    setSelectedMembers([]);
    setSearchQuery('');
    setSearchResults([]);
    setInviteEmail('');
    setPendingInvites([]);
  };

  const handleClose = () => {
    resetForm();
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
            <Label htmlFor="emoji" className="text-sm font-medium">
              Choose an emoji
            </Label>
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
            <Label htmlFor="groupName" className="text-sm font-medium">
              Group name
            </Label>
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
                <TabsTrigger value="invite">Add by Email</TabsTrigger>
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
                  {searchProfiles.isPending && searchQuery.length >= 2 && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {!searchProfiles.isPending && searchResults.length > 0 ? (
                    searchResults.map((profile) => {
                      const isSelected = selectedMembers.some((m) => m.id === profile.id);
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => toggleMember(profile)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-primary/10 ring-2 ring-primary'
                              : 'bg-accent hover:bg-accent/80'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(profile.display_name || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">
                              {profile.display_name || 'Unknown'}
                            </p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })
                  ) : searchQuery.length >= 2 && !searchProfiles.isPending ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Type at least 2 characters to search</p>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="invite" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  Add anyone by email. They'll be in the group as soon as it's
                  created and get an email letting them know.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && !isInviting && handleInviteEmail()}
                    disabled={isInviting}
                  />
                  <Button size="sm" onClick={handleInviteEmail} disabled={isInviting}>
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
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
                  <span>
                    {member.display_name?.split(' ')[0] || 'Unknown'}
                  </span>
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
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={createGroup.isPending || isInviting}
            >
              {createGroup.isPending || isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
