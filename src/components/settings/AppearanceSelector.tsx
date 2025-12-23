import { useTheme, accentColors, AccentColor } from '@/contexts/ThemeContext';
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

const colorPreviewClasses: Record<AccentColor, string> = {
  mint: 'bg-[hsl(162,63%,41%)]',
  blue: 'bg-[hsl(217,63%,41%)]',
  purple: 'bg-[hsl(270,63%,41%)]',
  orange: 'bg-[hsl(25,63%,41%)]',
  pink: 'bg-[hsl(340,63%,41%)]',
  teal: 'bg-[hsl(180,63%,41%)]',
};

export const AppearanceSelector = ({ onClose }: AppearanceSelectorProps) => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  const handleThemeSelect = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const handleColorSelect = (color: AccentColor) => {
    setAccentColor(color);
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Theme Mode</h3>
        <div className="space-y-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeSelect(t.id)}
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
      </div>

      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Accent Color</h3>
        <div className="grid grid-cols-3 gap-3">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => handleColorSelect(color.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                accentColor === color.id 
                  ? "bg-primary/10 ring-2 ring-primary" 
                  : "hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full relative",
                colorPreviewClasses[color.id]
              )}>
                {accentColor === color.id && (
                  <Check className="h-5 w-5 text-white absolute inset-0 m-auto" />
                )}
              </div>
              <span className="text-xs font-medium">{color.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
