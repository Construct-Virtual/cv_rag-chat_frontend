'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { useThemeStore } from '@/stores/themeStore';

// Accept a flexible user type for compatibility with chat page's local User interface
interface HeaderUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface HeaderProps {
  user: HeaderUser | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  onNewChat?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Role badge color mapping
const roleBadgeColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  admin: { bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'bg-purple-900/50', darkText: 'text-purple-300' },
  manager: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'bg-blue-900/50', darkText: 'text-blue-300' },
  employee: { bg: 'bg-green-100', text: 'text-green-800', darkBg: 'bg-green-900/50', darkText: 'text-green-300' },
};

export function Header({
  user,
  isSidebarOpen,
  onToggleSidebar,
  onLogout,
  onNewChat,
  searchQuery = '',
  onSearchChange,
}: HeaderProps) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Sync local search with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange?.('');
  };

  const handleLogoClick = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const colors = roleBadgeColors[role] || roleBadgeColors.employee;
    return theme === 'dark'
      ? `${colors.darkBg} ${colors.darkText}`
      : `${colors.bg} ${colors.text}`;
  };

  return (
    // Header: Height 64px, theme-aware background with subtle border, fixed position
    <header className="h-16 min-h-16 border-b bg-theme-secondary shrink-0 sticky top-0 z-40" role="banner">
      <div className="h-full flex items-center justify-between px-4 md:px-6 gap-4">
        {/* Left section: Sidebar toggle + Logo */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Sidebar toggle */}
          <Button
            variant="icon"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
            className="shrink-0"
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </Button>

          {/* Logo/Brand - F48: Links to home/new chat */}
          <Link
            href="/chat"
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            title="New Chat"
            aria-label="SOP AI Agent - Start new chat"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center shrink-0" aria-hidden="true">
              <svg
                width="20"
                height="20"
                fill="white"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-theme-primary hidden sm:block">
              SOP AI Agent
            </h1>
          </Link>
        </div>

        {/* Center section: Global Search Bar - F49 */}
        <div className="flex-1 max-w-md hidden md:block" role="search">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-muted"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l4 4" />
            </svg>
            <input
              type="search"
              placeholder="Search conversations..."
              value={localSearchQuery}
              onChange={handleSearchChange}
              className={cn(
                'w-full bg-theme-tertiary border border-theme rounded-lg',
                'pl-10 pr-10 py-2 text-sm text-theme-primary placeholder:text-theme-muted',
                // F90: Enhanced focus states
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-accent-primary',
                'transition-colors duration-200 ease-in-out'
              )}
              aria-label="Search conversations"
            />
            {localSearchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                title="Clear search"
                aria-label="Clear search"
                type="button"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right section: Theme toggle + User info */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Theme Toggle - F50 */}
          <Button
            variant="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              // Sun icon for switching to light mode
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              // Moon icon for switching to dark mode
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </Button>

          {user && (
            <>
              {/* F52: User Role Badge */}
              <div
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full capitalize hidden sm:block',
                  getRoleBadgeStyle(user.role)
                )}
                title={`Role: ${user.role}`}
              >
                {user.role}
              </div>

              {/* F51: User Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg',
                    'hover:bg-theme-tertiary transition-colors duration-200',
                    // F90: Enhanced focus states
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isProfileDropdownOpen && 'bg-theme-tertiary'
                  )}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                  aria-label={`User menu for ${user.full_name}`}
                  type="button"
                >
                  {/* Avatar circle */}
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white font-medium text-sm" aria-hidden="true">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  {/* User name - hidden on mobile */}
                  <span className="text-sm text-theme-primary hidden lg:block max-w-30 truncate">
                    {user.full_name}
                  </span>
                  {/* Dropdown arrow */}
                  <svg
                    className={cn(
                      'w-4 h-4 text-theme-muted transition-transform duration-200',
                      isProfileDropdownOpen && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 bg-theme-secondary border border-theme rounded-lg shadow-theme-dropdown z-50 animate-fade-in overflow-hidden"
                    role="menu"
                    aria-label="User account menu"
                  >
                    {/* User info section */}
                    <div className="p-4 border-b border-theme">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-white font-medium" aria-hidden="true">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-theme-primary truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-theme-muted truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {/* Role badge in dropdown */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-theme-muted">Role:</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                            getRoleBadgeStyle(user.role)
                          )}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1" role="group">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          // Settings action - placeholder for now
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        role="menuitem"
                        type="button"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                        Settings
                      </button>

                      <button
                        onClick={() => {
                          toggleTheme();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        role="menuitem"
                        type="button"
                      >
                        {theme === 'dark' ? (
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                          </svg>
                        )}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </button>
                    </div>

                    {/* Logout section */}
                    <div className="border-t border-theme py-1" role="group">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-theme-tertiary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        role="menuitem"
                        type="button"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
