import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCategoryIcon } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseCategory } from '@/types';
import { X, ChevronDown, Check, Camera, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGroups, GroupMember } from '@/hooks/useGroups';
import { useCreateExpense } from '@/hooks/useExpenses';

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

const AddExpense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId');
  
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const createExpense = useCreateExpense();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(preselectedGroupId);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [paidBy, setPaidBy] = useState<string>(user?.id || '');
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [splitType, setSplitType] = useState<'equally' | 'unequally' | 'percentage'>('equally');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  // Set paidBy to current user when user loads
  useEffect(() => {
    if (user?.id && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user?.id, paidBy]);

  // Get the selected group's members
  const selectedGroupData = groups.find(g => g.id === selectedGroup);
  const allGroupMembers = selectedGroupData?.members || [];
  const allPossiblePayers = selectedGroupData?.members || [];

  // Auto-select all members (including current user) when group changes
  useEffect(() => {
    if (selectedGroup && selectedGroupData) {
      const memberIds = selectedGroupData.members.map(m => m.user_id);
      setSelectedMembers(memberIds);
    } else {
      setSelectedMembers([]);
    }
  }, [selectedGroup, selectedGroupData, user?.id]);

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

  const handleSubmit = async () => {
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
      // Add selected members' splits (including current user)
      selectedMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: splitAmount });
      });
    } else if (splitType === 'unequally') {
      // Add all selected members' splits
      selectedMembers.forEach(memberId => {
        splits.push({ userId: memberId, amount: parseFloat(customSplits[memberId] || '0') });
      });
    } else {
      // Percentage - add all selected members' splits
      selectedMembers.forEach(memberId => {
        const percentage = parseFloat(customSplits[memberId] || '0');
        splits.push({ userId: memberId, amount: (totalAmount * percentage) / 100 });
      });
    }

    try {
      const payerName = paidByMember?.display_name || 'You';
      await createExpense.mutateAsync({
        description,
        amount: totalAmount,
        category,
        groupId: selectedGroup,
        paidBy,
        paidByName: payerName,
        splits,
      });
      navigate(-1);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const currentUserProfile = selectedGroupData?.members.find(m => m.user_id === user?.id);
  const paidByMember = allPossiblePayers.find(m => m.user_id === paidBy);

  const getSplitAmount = (memberId: string) => {
    if (!amount || parseFloat(amount) === 0) return '0.00';
    const totalAmount = parseFloat(amount);
    const splitCount = selectedMembers.length;
    
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

  return (
    <AppLayout hideNav>
      <div className="min-h-screen bg-background safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Add Expense</h1>
          <Button variant="ghost" size="icon" className="invisible">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="px-5 space-y-5 pb-8">
          {/* Amount Input */}
          <div className="text-center py-6 animate-fade-in">
            <Label className="text-sm text-muted-foreground">Amount</Label>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-4xl font-bold text-muted-foreground">{currency.symbol}</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-5xl font-bold text-center border-none shadow-none p-0 h-auto w-48 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Description */}
          <Card className="animate-slide-up">
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 border-0 shadow-none p-0 h-auto text-base focus-visible:ring-0"
              />
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <button
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className="w-full flex items-center justify-between mt-2"
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
                <div className="mt-4 pt-4 border-t">
                  {/* Category Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-4">
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
              )}
            </CardContent>
          </Card>

          {/* Group Selection */}
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Group</Label>
              <button
                onClick={() => setShowGroupPicker(!showGroupPicker)}
                className="w-full flex items-center justify-between mt-2"
              >
                <div className="flex items-center gap-2">
                  {selectedGroup ? (
                    <>
                      <span className="text-xl">
                        {groups.find(g => g.id === selectedGroup)?.emoji}
                      </span>
                      <span className="font-medium">
                        {groups.find(g => g.id === selectedGroup)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No group selected</span>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showGroupPicker && "rotate-180"
                )} />
              </button>

              {showGroupPicker && (
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedMembers([]);
                      setShowGroupPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                      !selectedGroup ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                    )}
                  >
                    <span className="text-xl">👤</span>
                    <span className="font-medium">Individual</span>
                  </button>
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group.id);
                        setSelectedMembers([]);
                        setShowGroupPicker(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        selectedGroup === group.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-accent hover:bg-accent/80"
                      )}
                    >
                      <span className="text-xl">{group.emoji}</span>
                      <span className="font-medium">{group.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Split With */}
          <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-4 space-y-4">
              {/* Paid By Section */}
              <div>
                <Label className="text-xs text-muted-foreground">Paid by</Label>
                <button
                  onClick={() => setShowPaidByPicker(!showPaidByPicker)}
                  className="w-full flex items-center justify-between mt-2"
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
                  <div className="space-y-2 mt-4 pt-4 border-t">
                    {allPossiblePayers.map((member) => (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          setPaidBy(member.user_id);
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

              {/* Split Type Selection */}
              <div className="pt-4 border-t">
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
              <div className="pt-4 border-t">
                <Label className="text-xs text-muted-foreground">Split with</Label>
                
                {splitType === 'equally' ? (
                  /* For equally split - show toggle chips */
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allGroupMembers.map((member) => (
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
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.display_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {member.user_id === user?.id ? 'You' : member.display_name?.split(' ')[0] || 'Unknown'}
                        </span>
                        {selectedMembers.includes(member.user_id) && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* For unequally/percentage - show list with inputs */
                  <div className="space-y-3 mt-3">
                    {/* All group members */}
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
                                {currency.symbol}{amount ? ((parseFloat(amount) * parseFloat(customSplits[member.user_id] || '0')) / 100).toFixed(2) : '0.00'}
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
                          <span className={cn(
                            "text-sm font-medium",
                            Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0) === 100 
                              ? "text-green-600" 
                              : "text-destructive"
                          )}>
                            {Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0).toFixed(0)}% of 100%
                          </span>
                        ) : (
                          <span className={cn(
                            "text-sm font-medium",
                            Math.abs(Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0) - parseFloat(amount)) < 0.01
                              ? "text-green-600" 
                              : "text-destructive"
                          )}>
                            {currency.symbol}{Object.values(customSplits).reduce((sum, val) => sum + parseFloat(val || '0'), 0).toFixed(2)} of {currency.symbol}{parseFloat(amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Split Summary for equally */}
                {splitType === 'equally' && selectedMembers.length > 0 && amount && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Split equally: <span className="font-semibold text-foreground">
                      {currency.symbol}{(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                    </span> each
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Receipt */}
          <Button variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Add Receipt Photo
          </Button>

          {/* Submit Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={!description || !amount || selectedMembers.length === 0 || !selectedGroup || createExpense.isPending}
          >
            {createExpense.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Expense'
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AddExpense;
