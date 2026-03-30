import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, Search, Shield } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { FormInput, Button, Card, ErrorAlert } from '../common/FormComponents';

const AdminUsersPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await adminAPI.listUsers();
        const list = response?.data?.users || [];
        if (active) setUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        if (active) setError(err?.message || 'Failed to load users');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.first_name, user.last_name, user.email, user.contact_number, user.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [users, query]);

  const openResetModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setSuccess('');
  };

  const closeResetModal = () => {
    if (saving) return;
    setSelectedUser(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await adminAPI.resetUserPassword(selectedUser.id, newPassword);
      setSuccess(`Password reset for ${selectedUser.email}`);
      closeResetModal();
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
            <p className="mt-1 text-sm text-slate-600">
              View registered users and reset their passwords as needed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:w-[320px]"
              />
            </div>
          </div>
        </div>
      </Card>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <Card>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No users found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{user.contact_number || 'Not set'}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <Shield className="h-3.5 w-3.5" />
                          {user.role || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : 'Not set'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openResetModal(user)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reset Password</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Set a new password for {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeResetModal}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                disabled={saving}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleReset} className="mt-5 space-y-4">
              <FormInput
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="Enter new password"
                icon={RefreshCw}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
              />

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                icon={RefreshCw}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <Button type="submit" loading={saving}>
                  Save Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
