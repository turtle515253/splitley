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
import { Card, CardContent } from '@/components/ui/card';
import { getCategoryIcon } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseCategory } from '@/types';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUpdateExpense } from '@/hooks/useExpenses';
import { isOfflineId } from '@/lib/offlineMutations';
import { GroupMember } from '@/hooks/useGroups';

interface CategoryGroup {
  name: string;
  items: { id: ExpenseCategory; label: string }[];
}

const categoryGroups: CategoryGroup[] = [
  {
    name: 'Entertainment',
    items: [
      { id: 'games', label: 'Games' },
      { id: 'movies', label: 'Movies' },
      { id: 'music', label: 'Music' },
      { id: 'entertainment_other', label: 'Other' },
      { id: 'sports', label: 'Sports' },
    ],
  },
  {
    name: 'Food and drink',
    items: [
      { id: 'dining_out', label: 'Dining out' },
      { id: 'groceries', label: 'Groceries' },
      { id: 'liquor', label: 'Liquor' },
      { id: 'tea_coffee', label: 'Tea & Coffee' },
      { id: 'soft_drinks', label: 'Soft Drinks' },
      { id: 'food_other', label: 'Other' },
    ],
  },
  {
    name: 'Home',
    items: [
      { id: 'electronics', label: 'Electronics' },
      { id: 'furniture', label: 'Furniture' },
      { id: 'household_supplies', label: 'Household supplies' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'mortgage', label: 'Mortgage' },
      { id: 'home_other', label: 'Other' },
      { id: 'pets', label: 'Pets' },
      { id: 'rent', label: 'Rent' },
      { id: 'services', label: 'Services' },
    ],
  },
  {
    name: 'Life',
    items: [
      { id: 'childcare', label: 'Childcare' },
      { id: 'clothing', label: 'Clothing' },
      { id: 'education', label: 'Education' },
      { id: 'gifts', label: 'Gifts' },
      { id: 'insurance', label: 'Insurance' },
      { id: 'medical', label: 'Medical expenses' },
      { id: 'life_other', label: 'Other' },
      { id: 'taxes', label: 'Taxes' },
    ],
  },
  {
    name: 'Transportation',
    items: [
      { id: 'bicycle', label: 'Bicycle' },
      { id: 'bus_train', label: 'Bus/train' },
      { id: 'car', label: 'Car' },
      { id: 'gas_fuel', label: 'Gas/fuel' },
      { id: 'hotel', label: 'Hotel' },
      { id: 'transport_other', label: 'Other' },
      { id: 'parking', label: 'Parking' },
      { id: 'plane', label: 'Plane' },
      { id: 'taxi', label: 'Taxi' },
    ],
  },
  {
    name: 'Utilities',
    items: [
      { id: 'cleaning', label: 'Cleaning' },
      { id: 'electricity', label: 'Electricity' },
      { id: 'heat_gas', label: 'Heat/gas' },
      { id: 'utilities_other', label: 'Other' },
      { id: 'trash', label: 'Trash' },
      { id: 'tv_phone_internet', label: 'TV/Phone/Internet' },
      { id: 'water', label: 'Water' },
    ],
  },
  {
    name: 'Uncategorized',
    items: [
      { id: 'general', label: 'General' },
    ],
  },
];

// Flat list for lookup
const allCategories = categoryGroups.flatMap(g => g.items);

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paid_by: string;
  group_id: string;
  splits?: { user_id: string; amount: number }[];
}

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseData | null;
  groupMembers: GroupMember[];
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  groupMembers,
}: EditExpenseDialogProps) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const updateExpense = useUpdateExpense();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [paidBy, setPaidBy] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [splitType, setSplitType] = useState<'equally' | 'unequally' | 'percentage'>('equally');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // Reset form when expense changes
  useEffect(() => {
    if (expense && open) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category as ExpenseCategory | null);
      setPaidBy(expense.paid_by);
      
      // Set selected members from splits (excluding the payer)
      if (expense.splits && expense.splits.length > 0) {
        const memberIds = expense.splits
          .filter(s => s.user_id !== expense.paid_by)
          .map(s => s.user_id);
        setSelectedMembers(memberIds);
      } else {
        // Fallback: select all members except payer
        const memberIds = groupMembers
          .filter(m => m.user_id !== expense.paid_by)
          .map(m => m.user_id);
        setSelectedMembers(memberIds);
      }
      
      setSplitType('equally');
      setCustomSplits({});
      setShowCategoryPicker(false);
      setShowPaidByPicker(false);
    }
  }, [expense, open, groupMembers]);

  // Exclude payer from selectable members in UI to prevent duplicate selection
  const selectableMembers = groupMembers.filter(m => m.user_id !== paidBy);
  const paidByMember = groupMembers.find(m => m.user_id === paidBy);

  const toggleMember = (userId: string) => {
    // Don't allow selecting the payer
    if (userId === paidBy) return;
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Auto-remove payer from selectedMembers when payer changes
  const handlePaidByChange = (newPaidBy: string) => {
    setPaidBy(newPaidBy);
    // Remove the new payer from selected members if they were selected
    setSelectedMembers(prev => prev.filter(id => id !== newPaidBy));
  };

  const handleSplitTypeChange = (type: 'equally' | 'unequally' | 'percentage') => {
    setSplitType(type);
    setCustomSplits({});
  };

  const getSplitAmount = (memberId: string) => {
    if (!amount || parseFloat(amount) === 0) return '0.00';
    const totalAmount = parseFloat(amount);
    const splitCount = selectedMembers.length + 1; // +1 for current user/payer

    if (splitType === 'equally') {
      return (totalAmount / splitCount).toFixed(2);
    } else if (splitType === 'unequally') {
      return customSplits[memberId] || '0.00';
    } else {
      const percentage = parseFloat(customSplits[memberId] || '0');
      return ((totalAmount * percentage) / 100).toFixed(2);
    }
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: value }));
  };

  const handleSubmit = async () => {
    if (!expense || !description || !amount || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to split with');
      return;
    }

    const totalAmount = parseFloat(amount);
    
    // Filter out the payer and deduplicate using Set to avoid duplicate splits
    const uniqueNonPayerMembers = [...new Set(selectedMembers.filter(id => id !== paidBy))];
    const splitCount = uniqueNonPayerMembers.length + 1; // +1 for payer

    // Calculate splits
    const splits: { userId: string; amount: number }[] = [];

    if (splitType === 'equally') {
      const splitAmount = totalAmount / splitCount;
      // Add payer's split
      splits.push({ userId: paidBy, amount: splitAmount });
      // Add selected members' splits (deduplicated, excluding payer)
      uniqueNonPayerMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: splitAmount });
      });
    } else if (splitType === 'unequally') {
      splits.push({ userId: paidBy, amount: parseFloat(customSplits[paidBy] || '0') });
      uniqueNonPayerMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: parseFloat(customSplits[memberId] || '0') });
      });
    } else {
      const payerPercentage = parseFloat(customSplits[paidBy] || '0');
      splits.push({ userId: paidBy, amount: (totalAmount * payerPercentage) / 100 });
      uniqueNonPayerMembers.forEach(memberId => {
        const percentage = parseFloat(customSplits[memberId] || '0');
        splits.push({ userId: memberId, amount: (totalAmount * percentage) / 100 });
      });
    }

    // Final validation: ensure no duplicate user_ids in splits
    const userIds = splits.map(s => s.userId);
    if (new Set(userIds).size !== userIds.length) {
      toast.error('Duplicate members detected. Please try again.');
      return;
    }

    if (isOfflineId(expense.id)) {
      toast.error('This expense is still syncing — try again once you are back online.');
      return;
    }

    // Applied optimistically; syncs in the background (or when back online)
    updateExpense.mutate({
      expenseId: expense.id,
      description,
      amount: totalAmount,
      category,
      paidBy,
      splits,
      groupId: expense.group_id,
    });
    onOpenChange(false);
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Input */}
          <div className="text-center py-4">
            <Label className="text-sm text-muted-foreground">Amount</Label>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-3xl font-bold text-muted-foreground">{currency.symbol}</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-4xl font-bold text-center border-none shadow-none p-0 h-auto w-36 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <button
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full flex items-center justify-between mt-2 p-3 rounded-lg border"
            >
              <div className="flex items-center gap-2">
                {category ? (
                  <>
                    <span className="text-xl">{getCategoryIcon(category)}</span>
                    <span className="font-medium">
                      {allCategories.find(c => c.id === category)?.label}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select a category</span>
                )}
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                showCategoryPicker && "rotate-180"
              )} />
            </button>

            {showCategoryPicker && (
              <div className="mt-3 max-h-48 overflow-y-auto space-y-4">
                {categoryGroups.map((group) => (
                  <div key={group.name}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{group.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setCategory(cat.id);
                            setShowCategoryPicker(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl transition-all",
                            category === cat.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent hover:bg-accent/80"
                          )}
                        >
                          <span>{getCategoryIcon(cat.id)}</span>
                          <span className="text-sm font-medium">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paid By */}
          <div>
            <Label className="text-xs text-muted-foreground">Paid by</Label>
            <button
              onClick={() => setShowPaidByPicker(!showPaidByPicker)}
              className="w-full flex items-center justify-between mt-2 p-3 rounded-lg border"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={paidByMember?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {paidByMember?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {paidBy === user?.id ? 'You' : paidByMember?.display_name?.split(' ')[0] || 'Unknown'}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                showPaidByPicker && "rotate-180"
              )} />
            </button>

            {showPaidByPicker && (
              <div className="space-y-2 mt-3">
                {groupMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => {
                      handlePaidByChange(member.user_id);
                      setShowPaidByPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                      paidBy === member.user_id
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{member.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {member.user_id === user?.id ? 'You' : member.display_name || 'Unknown'}
                    </span>
                    {paidBy === member.user_id && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Split Type */}
          <div>
            <Label className="text-xs text-muted-foreground">Split</Label>
            <div className="flex gap-2 mt-2">
              {(['equally', 'unequally', 'percentage'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSplitTypeChange(type)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    splitType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent hover:bg-accent/80"
                  )}
                >
                  {type === 'percentage' ? 'By %' : type === 'unequally' ? 'Unequally' : 'Equally'}
                </button>
              ))}
            </div>
          </div>

          {/* Split With Members */}
          <div>
            <Label className="text-xs text-muted-foreground">Split with</Label>

            {splitType === 'equally' ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Show payer as always included (non-clickable) */}
                {paidByMember && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/20 text-primary border border-primary/30">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={paidByMember.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {paidByMember.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {paidBy === user?.id ? 'You' : paidByMember.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                    <Check className="h-4 w-4" />
                  </div>
                )}
                {/* Show other members as selectable (excluding payer) */}
                {selectableMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => toggleMember(member.user_id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                      selectedMembers.includes(member.user_id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {member.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                    {selectedMembers.includes(member.user_id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {/* Payer's share */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={paidByMember?.avatar_url || undefined} />
                    <AvatarFallback>{paidByMember?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">
                    {paidBy === user?.id ? 'You' : paidByMember?.display_name?.split(' ')[0] || 'Unknown'}
                  </span>
                  <div className="flex items-center gap-2">
                    {splitType === 'percentage' && <span className="text-muted-foreground">%</span>}
                    <Input
                      type="number"
                      placeholder={splitType === 'percentage' ? '0' : '0.00'}
                      value={customSplits[paidBy] || ''}
                      onChange={(e) => handleCustomSplitChange(paidBy, e.target.value)}
                      className="w-20 text-right"
                    />
                    {splitType === 'unequally' && (
                      <span className="text-xs text-muted-foreground w-16">
                        {currency.symbol}{getSplitAmount(paidBy)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Show other members (excluding payer) */}
                {selectableMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{member.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">
                      {member.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-2">
                      {splitType === 'percentage' && <span className="text-muted-foreground">%</span>}
                      <Input
                        type="number"
                        placeholder={splitType === 'percentage' ? '0' : '0.00'}
                        value={customSplits[member.user_id] || ''}
                        onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                        className="w-20 text-right"
                      />
                      {splitType === 'unequally' && (
                        <span className="text-xs text-muted-foreground w-16">
                          {currency.symbol}{getSplitAmount(member.user_id)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Split Summary for equally */}
          {splitType === 'equally' && selectedMembers.length > 0 && parseFloat(amount) > 0 && (
            <div className="p-3 bg-accent/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Each person pays: <span className="font-semibold text-foreground">{currency.symbol}{getSplitAmount(user?.id || '')}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={updateExpense.isPending}
            >
              {updateExpense.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
