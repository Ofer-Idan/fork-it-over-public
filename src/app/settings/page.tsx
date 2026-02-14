"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ForkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-8 h-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v1.5M12 9v1.5m0 4.5v6m-3-15v3a3 3 0 006 0V3m-9 18h12"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
    />
  </svg>
);

interface Settings {
  todoistApiToken: string;
  todoistProjectId: string;
  bringEmail: string;
  bringPassword: string;
  bringListUuid: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    todoistApiToken: "",
    todoistProjectId: "",
    bringEmail: "",
    bringPassword: "",
    bringListUuid: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setUserEmail(user.email);

        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
    setPasswordSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <span className="loading-spinner w-8 h-8" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="theme-toggle"
          aria-label="Back to home"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-accent">
            <ForkIcon />
          </span>
          <h1 className="text-2xl font-bold text-primary">Settings</h1>
        </div>
      </div>

      {/* Account Section */}
      <section className="bg-surface p-6 rounded-xl border border-default mb-8">
        <h2 className="text-lg font-semibold text-primary mb-1">Account</h2>
        <p className="text-sm text-secondary mb-4">
          Manage your account credentials.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              readOnly
              className="input-fun w-full opacity-60 cursor-not-allowed"
            />
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-primary mb-1"
              >
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-fun w-full"
                placeholder="New password"
                minLength={6}
                required
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-primary mb-1"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-fun w-full"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>

            {passwordError && (
              <div className="toast-error animate-fade-in text-center">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="toast-success animate-fade-in text-center">
                Password updated successfully
              </div>
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="btn-primary w-full"
            >
              {passwordSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner" />
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          <hr className="border-default" />

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 px-4 rounded-lg border border-default text-secondary hover:text-primary hover:border-red-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bring! Section */}
        <section className="bg-surface p-6 rounded-xl border border-default">
          <h2 className="text-lg font-semibold text-primary mb-1">Bring!</h2>
          <p className="text-sm text-secondary mb-4">
            Connect your Bring! account to send ingredients to your shopping
            list.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="bringEmail"
                className="block text-sm font-medium text-primary mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="bringEmail"
                value={settings.bringEmail}
                onChange={(e) => updateSetting("bringEmail", e.target.value)}
                className="input-fun w-full"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="bringPassword"
                className="block text-sm font-medium text-primary mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="bringPassword"
                value={settings.bringPassword}
                onChange={(e) => updateSetting("bringPassword", e.target.value)}
                className="input-fun w-full"
                placeholder="Your Bring! password"
              />
            </div>

            <div>
              <label
                htmlFor="bringListUuid"
                className="block text-sm font-medium text-primary mb-1"
              >
                List UUID{" "}
                <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="bringListUuid"
                value={settings.bringListUuid}
                onChange={(e) => updateSetting("bringListUuid", e.target.value)}
                className="input-fun w-full"
                placeholder="Leave blank for default list"
              />
              <p className="text-xs text-secondary mt-1">
                If you have multiple lists, enter the UUID of the one you want
                to use.
              </p>
            </div>
          </div>
        </section>

        {/* Todoist Section */}
        <section className="bg-surface p-6 rounded-xl border border-default">
          <h2 className="text-lg font-semibold text-primary mb-1">Todoist</h2>
          <p className="text-sm text-secondary mb-4">
            Connect your Todoist account to send ingredients as tasks.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="todoistApiToken"
                className="block text-sm font-medium text-primary mb-1"
              >
                API Token
              </label>
              <input
                type="password"
                id="todoistApiToken"
                value={settings.todoistApiToken}
                onChange={(e) =>
                  updateSetting("todoistApiToken", e.target.value)
                }
                className="input-fun w-full"
                placeholder="Your Todoist API token"
              />
              <p className="text-xs text-secondary mt-1">
                Find your API token in Todoist Settings &rarr; Integrations
                &rarr; Developer.
              </p>
            </div>

            <div>
              <label
                htmlFor="todoistProjectId"
                className="block text-sm font-medium text-primary mb-1"
              >
                Project ID{" "}
                <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="todoistProjectId"
                value={settings.todoistProjectId}
                onChange={(e) =>
                  updateSetting("todoistProjectId", e.target.value)
                }
                className="input-fun w-full"
                placeholder="Leave blank for Inbox"
              />
              <p className="text-xs text-secondary mt-1">
                Enter a project ID to add tasks to a specific project.
              </p>
            </div>
          </div>
        </section>

        {/* Error/Success Messages */}
        {error && (
          <div className="toast-error animate-fade-in text-center">{error}</div>
        )}

        {success && (
          <div className="toast-success animate-fade-in text-center">
            Settings saved successfully
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full text-lg"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="loading-spinner" />
              Saving...
            </span>
          ) : (
            "Save Settings"
          )}
        </button>
      </form>
    </main>
  );
}
