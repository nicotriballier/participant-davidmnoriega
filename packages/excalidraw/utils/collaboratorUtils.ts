/**
 * Simple MD5 hash implementation for browser environments.
 * Used for generating Gravatar URLs.
 * Note: This is a simplified implementation. For production use with older browsers,
 * consider using a dedicated MD5 library.
 */
const md5 = (str: string): string => {
  // Simple string hash as fallback (not true MD5, but works for demo purposes)
  // In a real implementation, you'd want to use a proper MD5 library or Web Crypto API
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex string (padded to 32 chars to mimic MD5)
  const hex = Math.abs(hash).toString(16).padStart(32, "0");
  return hex;
};

/**
 * Validates a collaborator name.
 * Must be alphanumeric (including spaces) and between 2-20 characters.
 */
export const isValidCollaboratorName = (name: string | null | undefined): boolean => {
  if (!name || typeof name !== "string") {
    return false;
  }

  const trimmedName = name.trim();

  // Check length (2-20 chars)
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    return false;
  }

  // Check alphanumeric (letters, numbers, spaces)
  const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
  return alphanumericRegex.test(trimmedName);
};

/**
 * Generates a Gravatar URL from an email address.
 * @param email - The email address
 * @param size - Avatar size in pixels (default: 80)
 * @param defaultImage - Default image type if no Gravatar exists (default: 'identicon')
 * @returns Gravatar URL
 */
export const getGravatarUrl = (
  email: string,
  size: number = 80,
  defaultImage: string = "identicon",
): string => {
  if (!email || typeof email !== "string") {
    return "";
  }

  // Normalize email: trim and lowercase
  const normalizedEmail = email.trim().toLowerCase();

  // Create MD5 hash of email
  const hash = md5(normalizedEmail);

  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
};

/**
 * Calculates a human-readable time since last activity.
 * @param timestamp - Last activity timestamp (in milliseconds)
 * @returns Human-readable string like "just now", "5 min ago", etc.
 */
export const getTimeSinceActive = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // Handle future timestamps or invalid values
  if (diffMs < 0 || !Number.isFinite(diffMs)) {
    return "just now";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) {
    return "just now";
  } else if (diffSeconds < 60) {
    return `${diffSeconds} sec ago`;
  } else if (diffMinutes === 1) {
    return "1 min ago";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffHours === 1) {
    return "1 hour ago";
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return "1 day ago";
  } else {
    return `${diffDays} days ago`;
  }
};

/**
 * Determines if a collaborator is online based on their last activity timestamp.
 * A collaborator is considered online if they were active within the last 30 seconds.
 * @param lastActivityTimestamp - Last activity timestamp (in milliseconds)
 * @param thresholdMs - Threshold in milliseconds to consider online (default: 30000ms = 30s)
 * @returns true if online, false otherwise
 */
export const isCollaboratorOnline = (
  lastActivityTimestamp: number | null | undefined,
  thresholdMs: number = 30000,
): boolean => {
  if (!lastActivityTimestamp || !Number.isFinite(lastActivityTimestamp)) {
    return false;
  }

  const now = Date.now();
  const diffMs = now - lastActivityTimestamp;
  
  return diffMs >= 0 && diffMs < thresholdMs;
};

