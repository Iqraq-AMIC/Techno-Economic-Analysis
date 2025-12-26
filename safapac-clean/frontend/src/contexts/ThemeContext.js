import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const colors = {
    light: {
      oxfordBlue: '#07193D',
      background: '#ffffff',
      cardBackground: '#ffffff',
      text: '#212529',
      textSecondary: '#5A6169',
      border: '#e1e5eb',
      navbarBackground: '#07193D',
      footerBackground: '#07193D',
      inputBackground: '#ffffff',
      tableBackground: '#ffffff',
      hoverBackground: '#f8f9fa'
    },
    dark: {
      oxfordBlue: '#3180da',
      background: '#1a1a1a',
      cardBackground: '#2a2a2a',
      text: '#f5f5f5',
      textSecondary: '#d0d0d0',
      border: '#505050',
      navbarBackground: '#0a1e3d',
      footerBackground: '#0a1e3d',
      inputBackground: '#333333',
      tableBackground: '#2a2a2a',
      hoverBackground: '#383838'
    }
  };

  const value = {
    theme,
    toggleTheme,
    colors: colors[theme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
