/**
 * Authentication Utilities
 * Simple client-side authentication for MVP
 * TODO: Replace with proper backend authentication when backend is added
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

const AUTH_STORAGE_KEY = "sat_user_session";

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" };
  }
  return { valid: true };
}

/**
 * Get current user session
 */
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch (error) {
    console.error("Failed to read user session:", error);
  }
  return null;
}

/**
 * Create user session (sign up)
 */
export function signUp(email: string, password: string, name: string): { success: boolean; error?: string; user?: User } {
  // Validate inputs
  if (!validateEmail(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.message };
  }

  if (!name || name.trim().length < 2) {
    return { success: false, error: "Please enter your full name" };
  }

  // Check if user already exists (in a real app, this would check the database)
  const existingUsers = localStorage.getItem("sat_users");
  if (existingUsers) {
    try {
      const users = JSON.parse(existingUsers) as User[];
      if (users.some((u) => u.email === email)) {
        return { success: false, error: "An account with this email already exists" };
      }
    } catch (error) {
      // If parsing fails, continue with signup
    }
  }

  // Create new user
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  // Save user to "database" (localStorage)
  try {
    const existingUsers = localStorage.getItem("sat_users");
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    users.push(user);
    localStorage.setItem("sat_users", JSON.stringify(users));

    // Create session
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    return { success: true, user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create account. Please try again." };
  }
}

/**
 * Sign in user
 */
export function signIn(email: string, password: string): { success: boolean; error?: string; user?: User } {
  // Validate email
  if (!validateEmail(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  if (!password || password.length === 0) {
    return { success: false, error: "Please enter your password" };
  }

  // Find user (in a real app, this would check the database)
  try {
    const existingUsers = localStorage.getItem("sat_users");
    if (!existingUsers) {
      return { success: false, error: "No account found with this email" };
    }

    const users = JSON.parse(existingUsers) as User[];
    const user = users.find((u) => u.email === email.trim().toLowerCase());

    if (!user) {
      return { success: false, error: "No account found with this email" };
    }

    // In MVP, we don't verify password (would need backend)
    // For now, just check that password is provided
    // TODO: Add proper password verification when backend is added

    // Create session
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    return { success: true, user };
  } catch (error) {
    console.error("Failed to sign in:", error);
    return { success: false, error: "Failed to sign in. Please try again." };
  }
}

/**
 * Sign out user
 */
export function signOut(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

