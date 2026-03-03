import bcrypt from 'bcryptjs';

export async function generateToken(bytes: number = 32): Promise<string> {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  // Return hex string for convenience
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hashes a password using bcrypt
 * @param password The plain text password to hash
 * @returns Promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a plain text password with a hashed password
 * @param password The plain text password
 * @param hash The hashed password to compare against
 * @returns Promise that resolves to true if the passwords match
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Export the sync version for middleware that needs it
export const compareSync = bcrypt.compareSync;
