import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useGroups } from '@/hooks/useGroups';
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses';
import { isOfflineId } from '@/lib/offlineMutations';
import { getCategoryIcon } from '@/data/mockData';
import { ExpenseCategory } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { X, Check, Search, Loader2 } from 'lucide-react';

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

interface EditExpenseState {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paid_by: string;
  group_id: string;
  splits?: { user_id: string; amount: number }[];
}

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId');

  // When navigated with an expense in route state, the page works in edit mode
  const editingExpense = (location.state as { editExpense?: EditExpenseState } | null)?.editExpense;
  const isEditing = !!editingExpense;
  const editSplits = editingExpense?.splits ?? [];
  const editIsEqualSplit =
    editSplits.length === 0 ||
    editSplits.every((s) => Math.abs(s.amount - editSplits[0].amount) < 0.01);

  const { user } = useAuth();
  const { currency } = useCurrency();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory | null>(editingExpense?.category ?? null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    editingExpense?.group_id ?? preselectedGroupId
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    editingExpense ? editSplits.map((s) => s.user_id) : []
  );
  const [categorySearch, setCategorySearch] = useState('');
  const [paidBy, setPaidBy] = useState<string>(editingExpense?.paid_by || user?.id || '');
  const [splitType, setSplitType] = useState<'equally' | 'unequally' | 'percentage'>(
    isEditing && !editIsEqualSplit ? 'unequally' : 'equally'
  );
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() =>
    isEditing && !editIsEqualSplit
      ? Object.fromEntries(editSplits.map((s) => [s.user_id, String(s.amount)]))
      : {}
  );

  // Bottom sheets
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showSplitSheet, setShowSplitSheet] = useState(false);

  // Set paidBy to current user when user loads
  useEffect(() => {
    if (user?.id && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user?.id, paidBy]);

  const descriptionRef = useRef<HTMLInputElement>(null);

  const focusDescription = () => {
    // Delay so the drawer close / page mount animation finishes first
    setTimeout(() => descriptionRef.current?.focus(), 350);
  };

  // On open: no group yet -> ask for the group first; group known -> start typing
  useEffect(() => {
    if (isEditing || preselectedGroupId) {
      focusDescription();
    } else {
      setShowGroupPicker(true);
    }
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get the selected group's members
  const selectedGroupData = groups.find(g => g.id === selectedGroup);
  const allGroupMembers = selectedGroupData?.members || [];
  const allPossiblePayers = selectedGroupData?.members || [];

  // Auto-select all members when the group actually changes (not on refetches,
  // and not over the members loaded from an expense being edited)
  const lastAutoSelectedGroup = useRef<string | null>(isEditing ? editingExpense.group_id : null);
  useEffect(() => {
    if (!selectedGroup) {
      lastAutoSelectedGroup.current = null;
      setSelectedMembers([]);
      return;
    }
    if (!selectedGroupData || lastAutoSelectedGroup.current === selectedGroup) return;
    lastAutoSelectedGroup.current = selectedGroup;
    setSelectedMembers(selectedGroupData.members.map(m => m.user_id));
  }, [selectedGroup, selectedGroupData]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSplitTypeChange = (type: 'equally' | 'unequally' | 'percentage') => {
    setSplitType(type);
    setCustomSplits({});
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: value }));
  };

  const isPending = createExpense.isPending || updateExpense.isPending;
  const canSave = !!description && !!amount && !!selectedGroup && selectedMembers.length > 0 && !isPending;

  const handleSubmit = () => {
    if (!description || !amount || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedGroup) {
      toast.error('Please select a group');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to split with');
      return;
    }

    const totalAmount = parseFloat(amount);
    const splitCount = selectedMembers.length;

    // Calculate splits
    const splits: { userId: string; amount: number }[] = [];

    if (splitType === 'equally') {
      const splitAmount = totalAmount / splitCount;
      selectedMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: splitAmount });
      });
    } else if (splitType === 'unequally') {
      selectedMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: parseFloat(customSplits[memberId] || '0') });
      });
    } else {
      selectedMembers.forEach(memberId => {
        const percentage = parseFloat(customSplits[memberId] || '0');
        splits.push({ userId: memberId, amount: (totalAmount * percentage) / 100 });
      });
    }

    // Fire-and-forget: the change is applied to the cache optimistically and
    // syncs in the background (or when back online). Errors surface via toast.
    if (isEditing) {
      if (isOfflineId(editingExpense.id)) {
        toast.error('This expense is still syncing — try again once you are back online.');
        return;
      }
      updateExpense.mutate({
        expenseId: editingExpense.id,
        description,
        amount: totalAmount,
        category,
        paidBy,
        splits,
        groupId: editingExpense.group_id,
      });
    } else {
      createExpense.mutate({
        description,
        amount: totalAmount,
        category,
        groupId: selectedGroup,
        paidBy,
        splits,
      });
    }
    navigate(-1);
  };

  const paidByMember = allPossiblePayers.find(m => m.user_id === paidBy);
  const payerLabel = paidBy === user?.id ? 'you' : paidByMember?.display_name?.split(' ')[0] || 'someone';
  const splitLabel =
    splitType === 'equally'
      ? selectedMembers.length === allGroupMembers.length
        ? 'equally'
        : `equally (${selectedMembers.length})`
      : splitType === 'unequally'
        ? 'unequally'
        : 'by %';

  const chip =
    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card font-medium shadow-sm active:bg-accent';

  return (
    <AppLayout hideNav>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar - pinned */}
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-3 py-2 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <X className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{isEditing ? 'Edit Expense' : 'Add Expense'}</h1>
            <Button variant="ghost" size="icon" onClick={handleSubmit} disabled={!canSave}>
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-6 w-6" />
              )}
            </Button>
          </div>
        </header>

        {/* Group row - fixed in edit mode (an expense can't move between groups) */}
        <button
          onClick={() => !isEditing && setShowGroupPicker(true)}
          disabled={isEditing}
          className="px-5 py-3 border-b border-border flex items-center gap-2 text-sm text-left"
        >
          <span className="text-muted-foreground">
            With <span className="font-semibold text-foreground">you</span> and:
          </span>
          <span className={chip}>
            {selectedGroupData ? (
              <>
                <span>{selectedGroupData.emoji}</span>
                <span>All of {selectedGroupData.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {groupsLoading ? 'Loading…' : 'Choose group'}
              </span>
            )}
          </span>
        </button>

        {/* Compact form - fits without scrolling */}
        <div className="flex-1 px-8 pt-10">
          <div className="max-w-sm mx-auto space-y-5">
            {/* Description */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="w-12 h-12 rounded-lg border border-border bg-card flex items-center justify-center text-2xl shrink-0 active:bg-accent"
                aria-label="Choose category"
              >
                {category ? getCategoryIcon(category) : '🧾'}
              </button>
              <Input
                ref={descriptionRef}
                placeholder="Enter a description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-0 border-b border-border rounded-none shadow-none px-1 h-11 text-lg focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>

            {/* Amount */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-border bg-card flex items-center justify-center text-xl font-semibold shrink-0">
                {currency.symbol}
              </div>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-0 border-b border-border rounded-none shadow-none px-1 h-12 text-3xl font-semibold focus-visible:ring-0 focus-visible:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Category */}
            <div className="text-center pt-2 text-base">
              <span className="text-muted-foreground">Category </span>
              <button className={chip} onClick={() => setShowCategoryPicker(true)}>
                <span>{category ? getCategoryIcon(category) : '🧾'}</span>
                <span>
                  {category
                    ? allCategories.find((c) => c.id === category)?.label
                    : 'Choose'}
                </span>
              </button>
            </div>

            {/* Paid by / split sentence */}
            <div className="text-center pt-2 text-base leading-loose">
              <span className="text-muted-foreground">Paid by </span>
              <button className={chip} onClick={() => setShowPaidByPicker(true)} disabled={!selectedGroup}>
                {payerLabel}
              </button>
              <span className="text-muted-foreground"> and split </span>
              <button className={chip} onClick={() => setShowSplitSheet(true)} disabled={!selectedGroup}>
                {splitLabel}
              </button>
            </div>

            {/* Per-person hint */}
            {splitType === 'equally' && selectedMembers.length > 0 && amount && (
              <p className="text-center text-sm text-muted-foreground">
                {currency.symbol}
                {(parseFloat(amount) / selectedMembers.length).toFixed(2)} per person
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Group picker */}
      <Drawer open={showGroupPicker} onOpenChange={setShowGroupPicker}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Choose group</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group.id);
                  setSelectedMembers([]);
                  setShowGroupPicker(false);
                  focusDescription();
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                  selectedGroup === group.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent hover:bg-accent/80'
                )}
              >
                <span className="text-xl">{group.emoji}</span>
                <span className="font-medium">{group.name}</span>
                {selectedGroup === group.id && <Check className="h-4 w-4 ml-auto" />}
              </button>
            ))}
            {groups.length === 0 && !groupsLoading && (
              <p className="text-center text-muted-foreground py-4">No groups yet</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Category picker */}
      <Drawer open={showCategoryPicker} onOpenChange={(open) => { setShowCategoryPicker(open); if (!open) setCategorySearch(''); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Category</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-4">
              {categoryGroups
                .map((group) => {
                  const filteredItems = group.items.filter((cat) =>
                    cat.label.toLowerCase().includes(categorySearch.toLowerCase())
                  );
                  if (filteredItems.length === 0) return null;
                  return (
                    <div key={group.name}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{group.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {filteredItems.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setCategory(cat.id);
                              setShowCategoryPicker(false);
                              setCategorySearch('');
                            }}
                            className={cn(
                              'flex items-center gap-2 p-3 rounded-xl transition-all',
                              category === cat.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-accent hover:bg-accent/80'
                            )}
                          >
                            <span>{getCategoryIcon(cat.id)}</span>
                            <span className="text-sm font-medium">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
              {categoryGroups.every((group) =>
                group.items.every((cat) => !cat.label.toLowerCase().includes(categorySearch.toLowerCase()))
              ) && (
                <p className="text-center text-muted-foreground py-4">No categories found</p>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Paid by picker */}
      <Drawer open={showPaidByPicker} onOpenChange={setShowPaidByPicker}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Paid by</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {allPossiblePayers.map((member) => (
              <button
                key={member.user_id}
                onClick={() => {
                  setPaidBy(member.user_id);
                  setShowPaidByPicker(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                  paidBy === member.user_id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent hover:bg-accent/80'
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
        </DrawerContent>
      </Drawer>

      {/* Split options */}
      <Drawer open={showSplitSheet} onOpenChange={setShowSplitSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Split options</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Split type */}
            <div className="flex gap-2">
              {(['equally', 'unequally', 'percentage'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSplitTypeChange(type)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    splitType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent hover:bg-accent/80'
                  )}
                >
                  {type === 'percentage' ? 'By %' : type === 'unequally' ? 'Unequally' : 'Equally'}
                </button>
              ))}
            </div>

            {splitType === 'equally' ? (
              <div className="flex flex-wrap gap-2">
                {allGroupMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => toggleMember(member.user_id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full transition-all',
                      selectedMembers.includes(member.user_id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {member.user_id === user?.id ? 'You' : member.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                    {selectedMembers.includes(member.user_id) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {allGroupMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{member.display_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {member.user_id === user?.id ? 'You' : member.display_name?.split(' ')[0] || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {splitType === 'percentage' ? (
                        <>
                          <Input
                            type="number"
                            placeholder="0"
                            value={customSplits[member.user_id] || ''}
                            onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                            className="w-16 h-9 text-right"
                          />
                          <span className="text-sm text-muted-foreground w-6">%</span>
                          <span className="text-sm text-muted-foreground w-20 text-right">
                            {currency.symbol}
                            {amount ? ((parseFloat(amount) * parseFloat(customSplits[member.user_id] || '0')) / 100).toFixed(2) : '0.00'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">{currency.symbol}</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={customSplits[member.user_id] || ''}
                            onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                            className="w-24 h-9 text-right"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total validation */}
                {amount && (
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    {splitType === 'percentage' ? (
                      <span
                        className={cn(
                          'text-sm font-medium',
                          Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0) === 100
                            ? 'text-green-600'
                            : 'text-destructive'
                        )}
                      >
                        {Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0).toFixed(0)}% of 100%
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-sm font-medium',
                          Math.abs(Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0) - parseFloat(amount)) < 0.01
                            ? 'text-green-600'
                            : 'text-destructive'
                        )}
                      >
                        {currency.symbol}
                        {Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0).toFixed(2)} of {currency.symbol}
                        {parseFloat(amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AppLayout>
  );
};

export default AddExpense;
