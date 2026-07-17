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
import { toast } from 'sonner';
import { useDeleteExpense } from '@/hooks/useExpenses';
import { isOfflineId } from '@/lib/offlineMutations';

interface DeleteExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  expenseDescription: string;
  groupId?: string | null;
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expenseId,
  expenseDescription,
  groupId,
}: DeleteExpenseDialogProps) {
  const { mutate: deleteExpense, isPending } = useDeleteExpense();

  const handleDelete = () => {
    if (!expenseId) return;
    if (isOfflineId(expenseId)) {
      toast.error('This expense is still syncing — try again once you are back online.');
      return;
    }
    // Applied optimistically; syncs in the background (or when back online)
    deleteExpense({ expenseId, groupId });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{expenseDescription}"? This action cannot be undone and will remove all associated splits.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
