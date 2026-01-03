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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRemoveGroupMember, GroupMember } from '@/hooks/useGroups';

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  member: GroupMember | null;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  groupId,
  member,
}: RemoveMemberDialogProps) {
  const { mutate: removeMember, isPending } = useRemoveGroupMember();

  const handleRemove = () => {
    if (!member) return;
    removeMember(
      { groupId, memberId: member.id },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!member) return null;

  const displayName = member.display_name || 'Unknown';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
              <Avatar>
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{displayName}</p>
              </div>
            </div>
            <p>
              Are you sure you want to remove this member from the group? They will no longer have access to group expenses.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
