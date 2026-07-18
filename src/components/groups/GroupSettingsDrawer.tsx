import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateGroup, useDeleteGroup, useLeaveGroup } from '@/hooks/useGroups';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, LogOut, Trash2 } from 'lucide-react';

const emojis = ['🏠', '✈️', '🎉', '🍕', '🎬', '⚽', '🎮', '🛒', '💼', '🎓'];

interface GroupSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  isCreator: boolean;
}

export function GroupSettingsDrawer({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupEmoji,
  isCreator,
}: GroupSettingsDrawerProps) {
  const navigate = useNavigate();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  const [name, setName] = useState(groupName);
  const [emoji, setEmoji] = useState(groupEmoji);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (open) {
      setName(groupName);
      setEmoji(groupEmoji);
    }
  }, [open, groupName, groupEmoji]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    updateGroup.mutate(
      { groupId, name: name.trim(), emoji },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDelete = () => {
    deleteGroup.mutate(
      { groupId },
      {
        onSuccess: () => {
          setConfirmDelete(false);
          onOpenChange(false);
          navigate('/groups');
        },
      }
    );
  };

  const handleLeave = () => {
    leaveGroup.mutate(
      { groupId },
      {
        onSuccess: () => {
          setConfirmLeave(false);
          onOpenChange(false);
          navigate('/groups');
        },
      }
    );
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Group settings</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-5">
            {isCreator ? (
              <>
                <div>
                  <Label className="text-sm font-medium">Emoji</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={cn(
                          'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                          emoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-accent hover:bg-accent/80'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="groupSettingsName" className="text-sm font-medium">
                    Group name
                  </Label>
                  <Input
                    id="groupSettingsName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Button className="w-full" onClick={handleSave} disabled={updateGroup.isPending}>
                  {updateGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete group
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Only the group creator can rename or delete this group.
                </p>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setConfirmLeave(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave group
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groupName}"? All its expenses, balances, and
              settlement history will be permanently removed for every member. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{groupName}"? You'll lose access to its expenses and
              balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveGroup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaveGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveGroup.isPending ? 'Leaving...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
