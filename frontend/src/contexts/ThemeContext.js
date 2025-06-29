// frontend/src/contexts/ThemeContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  theme: 'light', // 'light', 'dark', 'auto'
  primaryColor: 'blue', // 'blue', 'red', 'green', 'purple'
  animations: true,
  reducedMotion: false,
  fontSize: 'medium', // 'small', 'medium', 'large'
  sidebar: {
    collapsed: false,
    mobile: false
  }
};

// Actions
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_PRIMARY_COLOR: 'SET_PRIMARY_COLOR',
  TOGGLE_ANIMATIONS: 'TOGGLE_ANIMATIONS',
  SET_REDUCED_MOTION: 'SET_REDUCED_MOTION',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_MOBILE_SIDEBAR: 'SET_MOBILE_SIDEBAR',
  RESET_PREFERENCES: 'RESET_PREFERENCES'
};

// Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload
      };
      
    case THEME_ACTIONS.SET_PRIMARY_COLOR:
      return {
        ...state,
        primaryColor: action.payload
      };
      
    case THEME_ACTIONS.TOGGLE_ANIMATIONS:
      return {
        ...state,
        animations: !state.animations
      };
      
    case THEME_ACTIONS.SET_REDUCED_MOTION:
      return {
        ...state,
        reducedMotion: action.payload,
        animations: action.payload ? false : state.animations
      };
      
    case THEME_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        fontSize: action.payload
      };
      
    case THEME_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          collapsed: !state.sidebar.collapsed
        }
      };
      
    case THEME_ACTIONS.SET_MOBILE_SIDEBAR:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          mobile: action.payload
        }
      };
      
    case THEME_ACTIONS.RESET_PREFERENCES:
      return initialState;
      
    default:
      return state;
  }
};

// Create context
const ThemeContext = createContext();

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('theme_preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        Object.keys(preferences).forEach(key => {
          if (key === 'theme') {
            dispatch({ type: THEME_ACTIONS.SET_THEME, payload: preferences[key] });
          } else if (key === 'primaryColor') {
            dispatch({ type: THEME_ACTIONS.SET_PRIMARY_COLOR, payload: preferences[key] });
          } else if (key === 'fontSize') {
            dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: preferences[key] });
          } else if (key === 'animations') {
            if (!preferences[key]) {
              dispatch({ type: THEME_ACTIONS.TOGGLE_ANIMATIONS });
            }
          }
        });
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('theme_preferences', JSON.stringify(state));
  }, [state]);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      // Determine actual theme (resolve 'auto')
      let actualTheme = state.theme;
      if (state.theme === 'auto') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // Apply theme class
      root.classList.remove('light', 'dark');
      root.classList.add(actualTheme);
      
      // Apply primary color
      root.classList.remove('theme-blue', 'theme-red', 'theme-green', 'theme-purple');
      root.classList.add(`theme-${state.primaryColor}`);
      
      // Apply font size
      root.classList.remove('text-sm', 'text-base', 'text-lg');
      const fontSizeClasses = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
      };
      root.classList.add(fontSizeClasses[state.fontSize]);
      
      // Apply animation preferences
      if (state.reducedMotion) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
    };

    applyTheme();
  }, [state.theme, state.primaryColor, state.fontSize, state.reducedMotion]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (state.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Force re-render by updating a dummy state or re-applying theme
        const root = document.documentElement;
        const actualTheme = mediaQuery.matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(actualTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.theme]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches && !state.reducedMotion) {
      dispatch({ type: THEME_ACTIONS.SET_REDUCED_MOTION, payload: true });
    }

    const handleChange = (e) => {
      dispatch({ type: THEME_ACTIONS.SET_REDUCED_MOTION, payload: e.matches });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [state.reducedMotion]);

  // Theme functions
  const setTheme = (theme) => {
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: theme });
  };

  const setPrimaryColor = (color) => {
    dispatch({ type: THEME_ACTIONS.SET_PRIMARY_COLOR, payload: color });
  };

  const toggleAnimations = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_ANIMATIONS });
  };

  const setFontSize = (size) => {
    dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: size });
  };

  const toggleSidebar = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_SIDEBAR });
  };

  const setMobileSidebar = (isOpen) => {
    dispatch({ type: THEME_ACTIONS.SET_MOBILE_SIDEBAR, payload: isOpen });
  };

  const resetPreferences = () => {
    dispatch({ type: THEME_ACTIONS.RESET_PREFERENCES });
  };

  // Utility functions
  const isDarkMode = () => {
    if (state.theme === 'dark') return true;
    if (state.theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const getThemeClasses = (lightClass = '', darkClass = '') => {
    return isDarkMode() ? darkClass : lightClass;
  };

  const value = {
    ...state,
    setTheme,
    setPrimaryColor,
    toggleAnimations,
    setFontSize,
    toggleSidebar,
    setMobileSidebar,
    resetPreferences,
    isDarkMode,
    getThemeClasses
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};