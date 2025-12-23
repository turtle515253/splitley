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
import { toast } from 'sonner';

const emojis = ['🏠', '✈️', '🎉', '🍕', '🎬', '⚽', '🎮', '🛒', '💼', '🎓'];

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewGroupDialog = ({ open, onOpenChange }: NewGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    // For now, just show a toast - in a real app, this would save to a database
    toast.success(`Group "${groupName}" created!`);
    setGroupName('');
    setSelectedEmoji('🏠');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
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
          
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
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
