import React, { createContext, useContext, useState, useEffect } from 'react';
import './Base.css';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('sotix-theme') || 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
            root.setAttribute('data-theme', 'light');
        } else {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
            root.setAttribute('data-theme', 'dark');
        }
        localStorage.setItem('sotix-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
