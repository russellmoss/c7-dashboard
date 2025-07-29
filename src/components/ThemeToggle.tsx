"use client";

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    console.log('Toggle clicked! Current theme:', theme);
    toggleTheme();
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (typeof window === 'undefined') {
    return (
      <button className="p-3 rounded-lg bg-white/20 border border-white/30 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="p-3 rounded-lg bg-white/30 hover:bg-white/50 active:bg-white/60 transition-colors duration-200 border-2 border-white/50 text-white font-bold min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
} 