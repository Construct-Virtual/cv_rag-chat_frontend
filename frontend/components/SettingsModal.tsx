'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useThemeStore } from '@/stores/themeStore';
import { useSettingsStore, MessageDensity, SyntaxTheme } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdate?: (data: { full_name?: string; email?: string }) => Promise<void>;
  onPasswordChange?: (data: { current_password: string; new_password: string }) => Promise<void>;
}

type Section = 'profile' | 'appearance' | 'notifications' | 'sessions' | 'shortcuts' | 'users';

export function SettingsModal({
  isOpen,
  onClose,
  user,
  onProfileUpdate,
  onPasswordChange,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { theme, toggleTheme } = useThemeStore();
  const { messageDensity, syntaxTheme, showLineNumbers, setMessageDensity, setSyntaxTheme, toggleLineNumbers } =
    useSettingsStore();

  // Reset form when user changes
  useEffect(() => {
    setFullName(user.full_name || '');
    setEmail(user.email || '');
  }, [user]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSaveProfile = async () => {
    if (!onProfileUpdate) return;

    setLoading(true);
    setMessage(null);

    try {
      await onProfileUpdate({ full_name: fullName, email });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!onPasswordChange) return;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await onPasswordChange({ current_password: currentPassword, new_password: newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const menuItems: Array<{
    id: Section;
    label: string;
    icon: React.JSX.Element;
    adminOnly?: boolean;
    comingSoon?: boolean;
  }> = [
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1010 10H12V2z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
      comingSoon: true,
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      comingSoon: true,
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
      ),
      comingSoon: true,
    },
    {
      id: 'users',
      label: 'User Management',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      adminOnly: true,
    },
  ];

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-theme-primary mb-4">Profile Settings</h2>
        <p className="text-sm text-theme-muted">Update your personal information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent-primary flex items-center justify-center text-white text-2xl font-medium">
          {user.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <p className="text-sm font-medium text-theme-primary">{user.username}</p>
          <p className="text-xs text-theme-muted capitalize mt-1">
            <span className="px-2 py-0.5 rounded-full bg-theme-tertiary">
              {user.role}
            </span>
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-theme-primary mb-2">
            Display Name
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your display name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-theme-primary mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your.email@example.com"
          />
        </div>

        <Button onClick={handleSaveProfile} disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Password Change */}
      <div className="pt-6 border-t border-theme">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-theme-primary mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-theme-primary mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password (min 8 characters)"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-theme-primary mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handleChangePassword} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-theme-primary mb-4">Appearance Settings</h2>
        <p className="text-sm text-theme-muted">Customize how the app looks and feels</p>
      </div>

      {/* Theme Selector */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-3">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={theme === 'dark' ? () => {} : toggleTheme}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
              theme === 'dark'
                ? 'border-blue-500 bg-theme-tertiary'
                : 'border-theme hover:border-gray-600'
            )}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <span className="text-sm font-medium text-theme-primary">Dark</span>
          </button>

          <button
            onClick={theme === 'light' ? () => {} : toggleTheme}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
              theme === 'light'
                ? 'border-blue-500 bg-theme-tertiary'
                : 'border-theme hover:border-gray-600'
            )}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span className="text-sm font-medium text-theme-primary">Light</span>
          </button>

          <button
            disabled
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-theme opacity-50 cursor-not-allowed"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2" />
            </svg>
            <span className="text-sm font-medium text-theme-muted">System</span>
          </button>
        </div>
      </div>

      {/* Message Density */}
      <div>
        <label className="block text-sm font-medium text-theme-primary mb-3">Message Density</label>
        <div className="space-y-2">
          {(['comfortable', 'default', 'compact'] as MessageDensity[]).map((density) => (
            <label
              key={density}
              className="flex items-center gap-3 p-3 rounded-lg border border-theme hover:bg-theme-tertiary cursor-pointer"
            >
              <input
                type="radio"
                name="density"
                checked={messageDensity === density}
                onChange={() => setMessageDensity(density)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-theme-primary capitalize">{density}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Code Blocks */}
      <div className="pt-6 border-t border-theme">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">Code Blocks</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="syntaxTheme" className="block text-sm font-medium text-theme-primary mb-2">
              Syntax Theme
            </label>
            <select
              id="syntaxTheme"
              value={syntaxTheme}
              onChange={(e) => setSyntaxTheme(e.target.value as SyntaxTheme)}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="github-dark">GitHub Dark</option>
              <option value="monokai">Monokai</option>
              <option value="solarized-dark">Solarized Dark</option>
              <option value="dracula">Dracula</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={toggleLineNumbers}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-theme-primary">Show line numbers</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderComingSoonSection = (title: string) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-theme-tertiary flex items-center justify-center mb-4">
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-theme-primary mb-2">{title}</h2>
      <p className="text-sm text-theme-muted">This feature is coming soon</p>
    </div>
  );

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // User form state
  const [userFormData, setUserFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'employee' as string,
    password: '',
  });
  const [newPasswordForReset, setNewPasswordForReset] = useState('');

  const usersPerPage = 20;

  // Load users when section changes to users
  useEffect(() => {
    if (activeSection === 'users' && user.role === 'admin') {
      loadUsers();
    }
  }, [activeSection, currentPage, searchQuery]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?search=${searchQuery}&limit=${usersPerPage}&offset=${currentPage * usersPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!userFormData.username || !userFormData.password) {
      setMessage({ type: 'error', text: 'Username and password are required' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(userFormData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create user');
      }

      setMessage({ type: 'success', text: 'User created successfully' });
      setShowAddUserModal(false);
      setUserFormData({ username: '', full_name: '', email: '', role: 'employee', password: '' });
      loadUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          full_name: userFormData.full_name,
          email: userFormData.email,
          role: userFormData.role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setMessage({ type: 'success', text: 'User updated successfully' });
      setShowEditUserModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      setMessage({ type: 'success', text: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully` });
      loadUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPasswordForReset) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    if (newPasswordForReset.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ new_password: newPasswordForReset }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      setMessage({ type: 'success', text: 'Password reset successfully' });
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPasswordForReset('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setMessage({ type: 'success', text: 'User deleted successfully' });
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setUserFormData({
      username: userToEdit.username,
      full_name: userToEdit.full_name || '',
      email: userToEdit.email || '',
      role: userToEdit.role,
      password: '',
    });
    setShowEditUserModal(true);
    setActiveDropdown(null);
  };

  const openResetPasswordModal = (userToReset: User) => {
    setSelectedUser(userToReset);
    setNewPasswordForReset('');
    setShowResetPasswordModal(true);
    setActiveDropdown(null);
  };

  const openDeleteConfirm = (userToDelete: User) => {
    setSelectedUser(userToDelete);
    setShowDeleteConfirm(true);
    setActiveDropdown(null);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-900/30 text-red-400 border-red-900/50',
      manager: 'bg-purple-900/30 text-purple-400 border-purple-900/50',
      employee: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
      hr: 'bg-green-900/30 text-green-400 border-green-900/50',
      finance: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
      sales: 'bg-pink-900/30 text-pink-400 border-pink-900/50',
      developer: 'bg-indigo-900/30 text-indigo-400 border-indigo-900/50',
      va: 'bg-teal-900/30 text-teal-400 border-teal-900/50',
      executive: 'bg-orange-900/30 text-orange-400 border-orange-900/50',
    };
    return colors[role] || 'bg-gray-900/30 text-gray-400 border-gray-900/50';
  };

  const renderUserManagementSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-theme-primary mb-2">User Management</h2>
          <p className="text-sm text-theme-muted">Manage user accounts and permissions</p>
        </div>
        <Button
          onClick={() => {
            setUserFormData({ username: '', full_name: '', email: '', role: 'employee', password: '' });
            setShowAddUserModal(true);
          }}
          className="flex items-center gap-2"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(0);
          }}
          className="w-full bg-theme-tertiary border border-theme rounded-lg pl-10 pr-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Users Table */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
          <p>No users found</p>
        </div>
      ) : (
        <>
          <div className="border border-theme rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-theme-secondary border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-primary">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-primary">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-primary">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-primary">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-theme last:border-b-0 hover:bg-theme-tertiary">
                    <td className="px-4 py-3 text-sm text-theme-primary">{u.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getRoleBadgeColor(u.role))}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          (u as any).is_active !== false
                            ? 'bg-green-900/30 text-green-400 border-green-900/50'
                            : 'bg-gray-900/30 text-gray-400 border-gray-900/50'
                        )}
                      >
                        {(u as any).is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === u.id ? null : u.id)}
                          className="p-1 hover:bg-theme-secondary rounded"
                        >
                          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {activeDropdown === u.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-theme-secondary border border-theme rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => openEditModal(u)}
                              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-tertiary flex items-center gap-2"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(u)}
                              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-tertiary flex items-center gap-2"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, (u as any).is_active !== false)}
                              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-tertiary flex items-center gap-2"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M15 9l-6 6M9 9l6 6" />
                              </svg>
                              {(u as any).is_active !== false ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(u)}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-theme-tertiary flex items-center gap-2"
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalUsers > usersPerPage && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-theme-muted">
                Showing {currentPage * usersPerPage + 1} to {Math.min((currentPage + 1) * usersPerPage, totalUsers)} of {totalUsers} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={(currentPage + 1) * usersPerPage >= totalUsers}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setUserFormData({ username: '', full_name: '', email: '', role: 'employee', password: '' });
        }}
        title="Add New User"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="new-username" className="block text-sm font-medium text-theme-primary mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="new-username"
              value={userFormData.username}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
            />
          </div>

          <div>
            <label htmlFor="new-full-name" className="block text-sm font-medium text-theme-primary mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="new-full-name"
              value={userFormData.full_name}
              onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="new-email" className="block text-sm font-medium text-theme-primary mb-2">
              Email
            </label>
            <input
              type="email"
              id="new-email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="new-role" className="block text-sm font-medium text-theme-primary mb-2">
              Role
            </label>
            <select
              id="new-role"
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="sales">Sales</option>
              <option value="developer">Developer</option>
              <option value="va">VA</option>
              <option value="executive">Executive</option>
            </select>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-theme-primary mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="new-password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-2">Username</label>
            <p className="text-theme-primary">{userFormData.username}</p>
          </div>

          <div>
            <label htmlFor="edit-full-name" className="block text-sm font-medium text-theme-primary mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="edit-full-name"
              value={userFormData.full_name}
              onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-theme-primary mb-2">
              Email
            </label>
            <input
              type="email"
              id="edit-email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-role" className="block text-sm font-medium text-theme-primary mb-2">
              Role
            </label>
            <select
              id="edit-role"
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="sales">Sales</option>
              <option value="developer">Developer</option>
              <option value="va">VA</option>
              <option value="executive">Executive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
          setNewPasswordForReset('');
        }}
        title="Reset Password"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-theme-secondary">
            Reset password for user: <span className="font-medium text-theme-primary">{selectedUser?.username}</span>
          </p>

          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-theme-primary mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="reset-password"
              value={newPasswordForReset}
              onChange={(e) => setNewPasswordForReset(e.target.value)}
              className="w-full bg-theme-tertiary border border-theme rounded-lg px-4 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowResetPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-theme-primary">
            Are you sure you want to delete user <span className="font-medium">{selectedUser?.username}</span>?
          </p>
          <p className="text-sm text-red-400">
            This action cannot be undone. All conversations and messages for this user will be permanently deleted.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'notifications':
        return renderComingSoonSection('Notifications');
      case 'sessions':
        return renderComingSoonSection('Session Management');
      case 'shortcuts':
        return renderComingSoonSection('Keyboard Shortcuts');
      case 'users':
        return renderUserManagementSection();
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Settings">
      <div className="flex flex-col md:flex-row min-h-[500px] -m-6">
        {/* Sidebar */}
        <div className="md:w-48 bg-theme-secondary border-b md:border-b-0 md:border-r border-theme p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              // Skip admin-only items for non-admin users
              if (item.adminOnly && user.role !== 'admin') return null;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeSection === item.id
                        ? 'bg-accent-primary text-white'
                        : 'text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary'
                    )}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                  {item.comingSoon && (
                    <span className="ml-9 text-xs text-theme-muted">Coming Soon</span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[600px]">
          {message && (
            <div
              className={cn(
                'mb-4 p-3 rounded-lg text-sm',
                message.type === 'success'
                  ? 'bg-green-900/20 border border-green-900/50 text-green-400'
                  : 'bg-red-900/20 border border-red-900/50 text-red-400'
              )}
            >
              {message.text}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </Modal>
  );
}
