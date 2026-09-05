import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const action = isDark ? 'Turn night mode off' : 'Turn night mode on';

  return (
    <button
      className={`theme-toggle ${isDark ? 'is-dark' : ''} ${className}`.trim()}
      type="button"
      aria-label={action}
      aria-pressed={isDark}
      title={action}
      onClick={toggleTheme}
    >
      <Sun className="theme-toggle__sun" size={14} aria-hidden="true" />
      <Moon className="theme-toggle__moon" size={14} aria-hidden="true" />
      <span className="theme-toggle__knob" aria-hidden="true" />
    </button>
  );
}
