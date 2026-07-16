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
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAddGroupMember, useSearchProfiles } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Mail, Search, Check, X, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SelectedMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentMemberIds: string[];
}

export const AddMemberDialog = ({ 
  open, 
  onOpenChange, 
  groupId,
  currentMemberIds,
}: AddMemberDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addMember = useAddGroupMember();
  const searchProfiles = useSearchProfiles();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchResults, setSearchResults] = useState<SelectedMember[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Search for users when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      searchProfiles.mutate(searchQuery, {
        onSuccess: (results) => {
          // Filter out current user, already selected, and existing members
          const filtered = results.filter(
            (profile) =>
              profile.id !== user?.id &&
              !currentMemberIds.includes(profile.id) &&
              !selectedMembers.some((m) => m.id === profile.id)
          );
          setSearchResults(filtered);
        },
      });
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id, currentMemberIds, selectedMembers]);

  const toggleMember = (member: SelectedMember) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsAdding(true);
    try {
      for (const member of selectedMembers) {
        await addMember.mutateAsync({
          groupId,
          userId: member.id,
        });
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsAdding(false);
    }
  };

  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member', {
        body: {
          email: inviteEmail.trim(),
          groupId,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to send a request to the Edge Function');
      }

      if (data?.alreadyMember) {
        toast.info('This person is already in the group.');
        setInviteEmail('');
      } else if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        toast.success(
          data.emailSent
            ? `${inviteEmail} was added to the group and notified by email!`
            : `${inviteEmail} was added to the group.`
        );
        setInviteEmail('');
        onOpenChange(false);
      } else if (data?.error) {
        // Handle rate limit error specifically
        if (data.error.includes('Too many')) {
          toast.error('You have added too many members recently. Please try again later.');
        } else {
          toast.error(data.error);
        }
      }
    } catch (error: any) {
      console.error('Add member error:', error);
      // Provide more specific error messages
      const message = error.message || 'Failed to add member';
      if (message.includes('rate') || message.includes('Too many')) {
        toast.error('You have added too many members recently. Please try again later.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
    setInviteEmail('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
            <TabsTrigger value="invite">Add by Email</TabsTrigger>
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
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-primary/10 ring-2 ring-primary' 
                          : 'bg-accent hover:bg-accent/80'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(profile.display_name || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{profile.display_name || 'Unknown'}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })
              ) : searchQuery.length >= 2 && !searchProfiles.isPending ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No users found</p>
                  <p className="text-xs mt-1">Try inviting someone new</p>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Type at least 2 characters to search</p>
                </div>
              ) : null}
            </div>
            
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                  >
                    <span>{member.display_name?.split(' ')[0] || 'Unknown'}</span>
                    <button onClick={() => toggleMember(member)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAddMembers} 
                disabled={selectedMembers.length === 0 || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Add (${selectedMembers.length})`
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Add anyone by email. They'll join this group immediately and get an email letting them know.
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
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleInvite} disabled={isInviting}>
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add to Group
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
