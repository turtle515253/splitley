import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AddMemberDialog } from '@/components/groups/AddMemberDialog';
import { RemoveMemberDialog } from '@/components/groups/RemoveMemberDialog';
import { useGroup, useUpdateGroup, useDeleteGroup, useLeaveGroup, GroupMember } from '@/hooks/useGroups';
import { useGroupSettlements } from '@/hooks/useGroupSettlements';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowLeft, Pencil, UserPlus, LogOut, Trash2, Loader2, X } from 'lucide-react';

const emojis = ['🏠', '✈️', '🎉', '🍕', '🎬', '⚽', '🎮', '🛒', '💼', '🎓'];

const GroupSettings = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const { data: group, isLoading } = useGroup(groupId);
  const { data: settlements = [] } = useGroupSettlements(groupId);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🏠');

  const isCreator = group?.created_by === user?.id;

  // Net balance per member in this group: positive = gets back, negative = owes
  const netByMember = useMemo(() => {
    const nets = new Map<string, number>();
    if (!group) return nets;
    for (const member of group.members) nets.set(member.user_id, 0);
    for (const expense of group.expenses) {
      nets.set(expense.paid_by, (nets.get(expense.paid_by) ?? 0) + Number(expense.amount));
      for (const split of expense.splits) {
        nets.set(split.user_id, (nets.get(split.user_id) ?? 0) - Number(split.amount));
      }
    }
    for (const settlement of settlements) {
      nets.set(settlement.payer_id, (nets.get(settlement.payer_id) ?? 0) + Number(settlement.amount));
      nets.set(settlement.receiver_id, (nets.get(settlement.receiver_id) ?? 0) - Number(settlement.amount));
    }
    return nets;
  }, [group, settlements]);

  const myNet = netByMember.get(user?.id ?? '') ?? 0;
  const isSettledUp = Math.abs(myNet) < 0.01;

  const openEditDrawer = () => {
    if (!group) return;
    setEditName(group.name);
    setEditEmoji(group.emoji || '🏠');
    setShowEditDrawer(true);
  };

  const handleSaveEdit = () => {
    if (!groupId) return;
    if (!editName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    updateGroup.mutate(
      { groupId, name: editName.trim(), emoji: editEmoji },
      { onSuccess: () => setShowEditDrawer(false) }
    );
  };

  const handleDelete = () => {
    if (!groupId) return;
    deleteGroup.mutate(
      { groupId },
      { onSuccess: () => { setConfirmDelete(false); navigate('/groups'); } }
    );
  };

  const handleLeave = () => {
    if (!groupId) return;
    leaveGroup.mutate(
      { groupId },
      { onSuccess: () => { setConfirmLeave(false); navigate('/groups'); } }
    );
  };

  if (isLoading || !group) {
    return (
      <AppLayout hideNav>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-3 py-2 flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Group settings</h1>
            </div>
          </header>
          <div className="px-5 pt-6 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Pinned header */}
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-3 py-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Group settings</h1>
          </div>
        </header>

        <div className="px-5 pb-10">
          {/* Group identity */}
          <div className="flex items-center gap-4 py-5 border-b border-border">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center text-3xl">
              {group.emoji || '👥'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">{group.name}</p>
              <p className="text-sm text-muted-foreground">
                {group.members.length} member{group.members.length === 1 ? '' : 's'}
              </p>
            </div>
            {isCreator && (
              <Button variant="ghost" size="icon" onClick={openEditDrawer} aria-label="Edit group">
                <Pencil className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Members */}
          <p className="text-sm font-medium text-muted-foreground pt-5 pb-1">Group members</p>

          <button
            onClick={() => setShowAddMemberDialog(true)}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="font-medium">Add people to group</span>
          </button>

          {group.members.map((member) => {
            const net = netByMember.get(member.user_id) ?? 0;
            const settled = Math.abs(net) < 0.01;
            const isYou = member.user_id === user?.id;
            const canRemove = isCreator && !isYou;
            return (
              <div key={member.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {(member.display_name || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.display_name || 'Unknown'}
                    {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
                  </p>
                </div>
                <div className="text-right">
                  {settled ? (
                    <p className="text-sm text-muted-foreground">settled up</p>
                  ) : (
                    <>
                      <p className={cn('text-xs', net > 0 ? 'text-positive' : 'text-negative')}>
                        {net > 0 ? 'gets back' : 'owes'}
                      </p>
                      <p className={cn('text-sm font-semibold', net > 0 ? 'text-positive' : 'text-negative')}>
                        {formatCurrency(Math.abs(net))}
                      </p>
                    </>
                  )}
                </div>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${member.display_name || 'member'}`}
                    onClick={() => {
                      if (!settled) {
                        toast.error(
                          'This member has an outstanding balance. Settle up before removing them.'
                        );
                        return;
                      }
                      setMemberToRemove(member);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Advanced */}
          <p className="text-sm font-medium text-muted-foreground pt-6 pb-1">Advanced settings</p>

          <div className="py-3">
            <button
              onClick={() => isSettledUp && setConfirmLeave(true)}
              disabled={!isSettledUp}
              className="flex items-center gap-3 text-left w-full disabled:opacity-100"
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className={cn('font-medium', !isSettledUp && 'text-muted-foreground')}>
                Leave group
              </span>
            </button>
            {!isSettledUp && (
              <p className="text-sm text-muted-foreground mt-2 ml-[52px]">
                You can't leave this group because you have outstanding debts with other group
                members. Please make sure all of your debts have been settled up, and try again.
              </p>
            )}
          </div>

          {isCreator && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-3 py-3 text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <span className="font-medium text-destructive">Delete group</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit name / emoji */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit group</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-5">
            <div>
              <Label className="text-sm font-medium">Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEditEmoji(e)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                      editEmoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-accent hover:bg-accent/80'
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
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button className="w-full" onClick={handleSaveEdit} disabled={updateGroup.isPending}>
              {updateGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        groupId={groupId!}
        currentMemberIds={group.members.map((m) => m.user_id)}
      />

      <RemoveMemberDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        groupId={groupId!}
        member={memberToRemove}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? All its expenses, balances, and
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
              Are you sure you want to leave "{group.name}"? You'll lose access to its expenses and
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
    </AppLayout>
  );
};

export default GroupSettings;
