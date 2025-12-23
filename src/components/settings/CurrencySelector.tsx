import { Check } from 'lucide-react';
import { currencies, useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
  onClose: () => void;
}

export function CurrencySelector({ onClose }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  const handleSelect = (selectedCurrency: typeof currencies[0]) => {
    setCurrency(selectedCurrency);
    onClose();
  };

  return (
    <div className="space-y-1">
      {currencies.map((c) => (
        <button
          key={c.code}
          onClick={() => handleSelect(c)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-accent/50 text-left",
            currency.code === c.code && "bg-primary/10"
          )}
        >
          <span className="text-lg font-semibold w-8">{c.symbol}</span>
          <div className="flex-1">
            <p className="font-medium text-sm">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.code}</p>
          </div>
          {currency.code === c.code && (
            <Check className="h-5 w-5 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
