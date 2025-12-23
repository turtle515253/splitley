import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppearanceSelectorProps {
  onClose: () => void;
}

const themes = [
  { id: 'light' as const, label: 'Light', icon: Sun, description: 'Always use light mode' },
  { id: 'dark' as const, label: 'Dark', icon: Moon, description: 'Always use dark mode' },
  { id: 'system' as const, label: 'System', icon: Monitor, description: 'Match device settings' },
];

export const AppearanceSelector = ({ onClose }: AppearanceSelectorProps) => {
  const { theme, setTheme } = useTheme();

  const handleSelect = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    onClose();
  };

  return (
    <div className="space-y-2">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left",
            theme === t.id 
              ? "bg-primary/10 ring-2 ring-primary" 
              : "hover:bg-accent/50"
          )}
        >
          <div className={cn(
            "p-2 rounded-lg",
            theme === t.id ? "bg-primary text-primary-foreground" : "bg-accent"
          )}>
            <t.icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{t.label}</p>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </div>
          {theme === t.id && (
            <Check className="h-5 w-5 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
};
