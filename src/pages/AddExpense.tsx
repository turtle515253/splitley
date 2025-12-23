import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { users, groups, getCategoryIcon } from '@/data/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ExpenseCategory } from '@/types';
import { X, ChevronDown, Check, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categories: { id: ExpenseCategory; label: string }[] = [
  { id: 'food', label: 'Food & Dining' },
  { id: 'transport', label: 'Transport' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'rent', label: 'Rent' },
  { id: 'travel', label: 'Travel' },
  { id: 'other', label: 'Other' },
];

const AddExpense = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = () => {
    if (!description || !amount || selectedMembers.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    toast.success('Expense added successfully!');
    navigate('/');
  };

  const availableMembers = selectedGroup 
    ? groups.find(g => g.id === selectedGroup)?.members.filter(m => m.id !== '1') || []
    : users.filter(u => u.id !== '1');

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
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                  <span className="font-medium">
                    {categories.find(c => c.id === category)?.label}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showCategoryPicker && "rotate-180"
                )} />
              </button>
              
              {showCategoryPicker && (
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                  {categories.map((cat) => (
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
              )}
            </CardContent>
          </Card>

          {/* Group Selection */}
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Group (Optional)</Label>
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
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">Split with</Label>
              <div className="flex flex-wrap gap-2 mt-3">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                      selectedMembers.includes(member.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{member.name.split(' ')[0]}</span>
                    {selectedMembers.includes(member.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
              {selectedMembers.length > 0 && amount && (
                <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                  Split equally: <span className="font-semibold text-foreground">
                    {currency.symbol}{(parseFloat(amount) / (selectedMembers.length + 1)).toFixed(2)}
                  </span> each
                </p>
              )}
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
            disabled={!description || !amount || selectedMembers.length === 0}
          >
            Add Expense
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AddExpense;
