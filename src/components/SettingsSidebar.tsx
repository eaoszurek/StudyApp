"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { downloadExport, handleFileImport } from "@/utils/dataExport";
import { getCurrentUser, signOut } from "@/utils/auth";
import { useRouter } from "next/navigation";
import PrimaryButton from "./ui/PrimaryButton";
import ConfirmationModal from "./ui/ConfirmationModal";

interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  subscriptionStatus?: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | null;
}

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsSidebar({ isOpen, onClose }: SettingsSidebarProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    subscriptionStatus: string | null;
    hasSubscription: boolean;
  } | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fetch user from API (new auth system) or fallback to localStorage (old system)
  useEffect(() => {
    const fetchUser = async () => {
      setLoadingUser(true);
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            setLoadingUser(false);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to fetch user from API:", error);
      }
      
      // Fallback to localStorage (old auth system)
      const localUser = getCurrentUser();
      if (localUser) {
        setUser({
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          emailVerified: true,
        });
      }
      setLoadingUser(false);
    };
    
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/stripe/subscription-status");
        if (response.ok) {
          const data = await response.json();
          setSubscriptionStatus({
            subscriptionStatus: data.subscriptionStatus,
            hasSubscription: data.hasSubscription,
          });
        }
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      }
    };
    
    if (isOpen) {
      fetchUser();
      fetchSubscription();
    }
  }, [isOpen]);

  useEffect(() => {
    // Check for saved preference or system preference
    const saved = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved ? saved === "true" : prefersDark;
    
    setDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Sync dark mode state when the class changes externally
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => observer.disconnect();
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    
    // Force immediate class update to ensure styles apply
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Force a style recalculation to ensure CSS changes apply immediately
    void document.documentElement.offsetHeight;

  };

  const handleExport = () => {
    try {
      downloadExport();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportError("Please select a valid JSON file");
      return;
    }

    try {
      setImportError(null);
      await handleFileImport(file, { merge: false });
      // File import will reload the page, so we don't need to do anything else
    } catch (error: any) {
      setImportError(error.message || "Failed to import data");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-[120]"
            />
            
            {/* Sidebar */}
            <motion.div
              key="settings-sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-56 shadow-2xl z-[120] overflow-y-auto settings-sidebar"
              style={{ maxWidth: "280px" }}
            >
            <div className="p-6 settings-sidebar-content min-h-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold settings-title">Settings</h2>
                <button
                  onClick={onClose}
                  className="hover:bg-slate-200 dark:hover:bg-slate-600 transition-all p-2 rounded-full shadow-lg border border-slate-300 dark:border-slate-500 flex items-center justify-center cursor-pointer group relative z-[100]"
                  style={{ 
                    backgroundColor: darkMode ? '#334155' : '#f1f5f9',
                    color: darkMode ? '#ffffff' : '#0f172a'
                  }}
                  aria-label="Close settings"
                >
                  <span className="text-2xl leading-none font-black group-hover:scale-110 transition-transform">×</span>
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border settings-toggle-card">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold settings-label">
                      Dark Mode
                    </span>
                    <span className="text-xs settings-description mt-1">
                      Switch to dark theme
                    </span>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none overflow-hidden ${
                      darkMode ? "bg-sky-600" : "bg-slate-300"
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    <motion.div
                      animate={{ left: darkMode ? "calc(100% - 18px)" : "2px" }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 30,
                        mass: 0.8
                      }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>

                {/* Data Export/Import */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold settings-label mb-2">Data Management</p>
                  <div className="space-y-2">
                    <PrimaryButton
                      onClick={handleExport}
                      className="w-full text-sm"
                      variant="secondary"
                    >
                      Export Progress
                    </PrimaryButton>
                    <PrimaryButton
                      onClick={handleImportClick}
                      className="w-full text-sm"
                      variant="secondary"
                    >
                      Import Progress
                    </PrimaryButton>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {importError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {importError}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Backup your progress or restore from a previous backup
                    </p>
                  </div>
                </div>

                {/* User Account */}
                {user && (
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold settings-label mb-2">Account</p>
                    <div className="settings-card p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name || "User"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{user.email}</p>
                    </div>
                    <PrimaryButton
                      onClick={async () => {
                        try {
                          // Try new auth system logout
                          await fetch("/api/auth/logout", { method: "POST" });
                        } catch (error) {
                          console.error("Failed to logout via API:", error);
                        }
                        
                        // Fallback to localStorage logout
                        signOut();
                        router.push("/login");
                        onClose();
                      }}
                      className="w-full text-sm"
                      variant="secondary"
                    >
                      Sign Out
                    </PrimaryButton>
                  </div>
                )}

                {/* Subscription Management */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold settings-label mb-2">Subscription</p>
                  {loadingSubscription ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Loading...</p>
                    </div>
                  ) : subscriptionStatus?.hasSubscription ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                          ✓ Premium Active
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                          {subscriptionStatus.subscriptionStatus === "ACTIVE"
                            ? "Your subscription is active"
                            : subscriptionStatus.subscriptionStatus === "TRIALING"
                            ? "You're on a free trial"
                            : subscriptionStatus.subscriptionStatus === "PAST_DUE"
                            ? "Payment required - subscription paused"
                            : "Subscription status: " + subscriptionStatus.subscriptionStatus}
                        </p>
                      </div>
                      <PrimaryButton
                        onClick={async () => {
                          setLoadingSubscription(true);
                          try {
                            const response = await fetch("/api/stripe/create-portal", {
                              method: "POST",
                            });
                            const data = await response.json();
                            if (data.url) {
                              window.location.href = data.url;
                            } else {
                              alert(data.error || "Failed to open subscription management");
                            }
                          } catch (error) {
                            console.error("Error opening portal:", error);
                            alert("Failed to open subscription management");
                          } finally {
                            setLoadingSubscription(false);
                          }
                        }}
                        className="w-full text-sm"
                        variant="secondary"
                        disabled={loadingSubscription}
                      >
                        Manage Subscription
                      </PrimaryButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Free Plan
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                          Upgrade to unlock unlimited features
                        </p>
                      </div>
                      <PrimaryButton
                        onClick={async () => {
                          setLoadingSubscription(true);
                          try {
                            const response = await fetch("/api/stripe/create-checkout", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ priceType: "monthly" }),
                            });
                            const data = await response.json();
                            if (data.url) {
                              window.location.href = data.url;
                            } else {
                              alert(data.error || "Failed to start checkout");
                            }
                          } catch (error) {
                            console.error("Error creating checkout:", error);
                            alert("Failed to start checkout");
                          } finally {
                            setLoadingSubscription(false);
                          }
                        }}
                        className="w-full text-sm"
                        variant="primary"
                        disabled={loadingSubscription}
                      >
                        Upgrade to Premium
                      </PrimaryButton>
                    </div>
                  )}
                </div>

                {/* Delete Account */}
                {user && (
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                      Permanently delete your account and all data
                    </p>
                    <PrimaryButton
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600"
                      variant="secondary"
                    >
                      Delete Account
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            const response = await fetch("/api/auth/delete", {
              method: "DELETE",
            });
            
            if (!response.ok) {
              const data = await response.json();
              alert(data.error || "Failed to delete account. Please try again.");
              setIsDeleting(false);
              return;
            }
            
            // Account deleted successfully
            setShowDeleteModal(false);
            alert("Your account has been deleted. You will be redirected to the home page.");
            router.push("/");
            onClose();
          } catch (error) {
            console.error("Error deleting account:", error);
            alert("Failed to delete account. Please try again.");
            setIsDeleting(false);
          }
        }}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone. All your data including flashcards, practice tests, study plans, and lessons will be permanently deleted."
        confirmText="Delete Account"
        cancelText="Cancel"
        danger={true}
        loading={isDeleting}
      />
    </>
  );
}

