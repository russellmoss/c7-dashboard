"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Script to prevent flash of unstyled content
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.add(theme);
    } catch (e) {
      // Silent error handling for production
    }
  })();
`;

// Component to prevent flash
function NoFlash() {
  useEffect(() => {
    // Apply theme immediately on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(savedTheme);
  }, []);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Apply theme immediately to prevent flash
    const savedTheme = localStorage.getItem('theme') as Theme || 'light';
    setTheme(savedTheme);
    
    // Apply theme to document immediately
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(savedTheme);
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Update document class and localStorage when theme changes
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Prevent flash */}
      <NoFlash />
      {/* Inject theme script to prevent flash */}
      <script
        dangerouslySetInnerHTML={{
          __html: themeScript,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 