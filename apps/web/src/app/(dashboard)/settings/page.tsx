"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  OFFICE_MANAGER: "Office Manager",
  RECEPTIONIST: "Receptionist",
  INSTALLER: "Installer",
  SERVICE_TECH: "Service Tech",
};

export default function SettingsPage() {
  const [showNewUser, setShowNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: me } = trpc.users.me.useQuery();
  const { data: users, refetch } = trpc.users.list.useQuery();

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      setShowNewUser(false);
      setSuccess("User created successfully!");
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e) => setError(e.message),
  });

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => refetch(),
  });

  const deactivate = trpc.users.deactivate.useMutation({
    onSuccess: () => refetch(),
  });

  const isOwner = me?.role === "OWNER";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account and team</p>
      </div>

      {/* My Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">My Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
            <p className="text-gray-900 font-medium mt-1">{me?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
            <p className="text-gray-900 font-medium mt-1">{me?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
            <p className="text-gray-900 font-medium mt-1">{ROLE_LABELS[me?.role ?? ""] ?? me?.role}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
            <p className="text-gray-900 font-medium mt-1">{me?.phone ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Team Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Team Members</h2>
          {isOwner && (
            <button
              onClick={() => setShowNewUser(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
            >
              + Add User
            </button>
          )}
        </div>

        {success && (
          <p className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">{success}</p>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
              {isOwner && (
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-gray-50">
                <td className="py-3 font-medium text-gray-900">{user.name}</td>
                <td className="py-3 text-gray-600">{user.email}</td>
                <td className="py-3">
                  {isOwner && user.id !== me?.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value as any })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-600">{ROLE_LABELS[user.role] ?? user.role}</span>
                  )}
                </td>
                <td className="py-3 text-gray-600">{user.phone ?? "—"}</td>
                {isOwner && (
                  <td className="py-3 text-right">
                    {user.id !== me?.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate ${user.name}?`)) {
                            deactivate.mutate({ id: user.id });
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New User Modal */}
      {showNewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
              <button onClick={() => setShowNewUser(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                createUser.mutate({
                  name: form.get("name") as string,
                  email: form.get("email") as string,
                  role: form.get("role") as any,
                  phone: (form.get("phone") as string) || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  name="name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="role"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewUser(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {createUser.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
