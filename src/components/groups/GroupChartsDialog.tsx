import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCategoryIcon } from '@/data/mockData';

interface GroupChartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: {
    id: string;
    amount: number;
    category: string | null;
    paid_by: string;
    paidByProfile?: { display_name: string | null } | null;
  }[];
  members: {
    user_id: string;
    display_name: string | null;
  }[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(280, 65%, 60%)',
  'hsl(45, 93%, 47%)',
  'hsl(200, 98%, 39%)',
  'hsl(340, 82%, 52%)',
  'hsl(25, 95%, 53%)',
  'hsl(173, 80%, 40%)',
];

export function GroupChartsDialog({ open, onOpenChange, expenses, members }: GroupChartsDialogProps) {
  const { formatCurrency } = useCurrency();

  // Calculate category distribution
  const categoryData = expenses.reduce((acc, expense) => {
    const category = expense.category || 'general';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ name: category, value: expense.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sort by value descending
  categoryData.sort((a, b) => b.value - a.value);

  // Calculate member contributions
  const memberData = members.map(member => {
    const totalPaid = expenses
      .filter(e => e.paid_by === member.user_id)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: member.display_name?.split(' ')[0] || 'Unknown',
      value: Math.round(totalPaid),
    };
  }).filter(m => m.value > 0).sort((a, b) => b.value - a.value);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium capitalize">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)} ({((data.value / totalExpenses) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Expense Charts</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="category" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="member">By Member</TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="mt-4">
            {categoryData.length > 0 ? (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="flex items-center gap-1.5">
                          <span>{getCategoryIcon(item.name)}</span>
                          <span className="capitalize">{item.name}</span>
                        </span>
                      </div>
                      <span className="font-medium">{formatCurrency(Math.round(item.value))}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No expenses to display
              </div>
            )}
          </TabsContent>

          <TabsContent value="member" className="mt-4">
            {memberData.length > 0 ? (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={memberData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {memberData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                  {memberData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No contributions to display
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="font-semibold">{formatCurrency(Math.round(totalExpenses))}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}