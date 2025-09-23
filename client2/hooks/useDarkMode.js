import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const shouldUseDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDarkMode);
    setIsDarkMode(shouldUseDarkMode);

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', shouldUseDarkMode ? 'dark' : 'light');
  }, []);

  const toggleDarkMode = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    // Save to localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');

    // Apply to document
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  return { isDarkMode, toggleDarkMode };
};