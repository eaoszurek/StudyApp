/**
 * Session Management Utilities
 * Handles anonymous session tracking via cookies (30-day expiration)
 * TODO: Replace with proper backend session management when backend is added
 */

const SESSION_COOKIE_NAME = "sat_session_id";
const SESSION_DURATION_DAYS = 30;

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets the current session ID from cookies (client-side)
 * Returns null if no session exists
 */
export function getSessionId(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Sets the session ID in cookies (client-side)
 * @param sessionId The session ID to set
 */
export function setSessionId(sessionId: string): void {
  if (typeof document === "undefined") return;
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + SESSION_DURATION_DAYS);
  
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Clears the session cookie (client-side)
 */
export function clearSession(): void {
  if (typeof document === "undefined") return;
  
  document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Gets or creates a session ID
 * If no session exists, creates a new one
 * @returns The session ID
 */
export function getOrCreateSessionId(): string {
  let sessionId = getSessionId();
  if (!sessionId) {
    sessionId = generateUUID();
    setSessionId(sessionId);
  }
  return sessionId;
}

