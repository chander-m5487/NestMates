import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Derive a 32-byte key from the provided key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64 encoded string: iv:authTag:encryptedData
 */
export function encrypt(plainText: string): string {
  if (!plainText) return plainText;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string that was encrypted with encrypt()
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Check if the text is encrypted (has the expected format)
  if (!encryptedText.includes(':')) {
    // Return as-is if not encrypted (legacy data)
    return encryptedText;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      // Not properly encrypted, return as-is
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original if decryption fails (might be unencrypted legacy data)
    return encryptedText;
  }
}

/**
 * SC-014: hashPassword / verifyPassword (PBKDF2) removed.
 * All password hashing uses bcryptjs in the auth routes — having two
 * implementations risks future developers using the wrong one.
 *
 * Remaining exports: encrypt/decrypt (AES-256-GCM), generateSecureToken,
 * generateOTP (kept for backward compat; prefer generateOtp in lib/auth/otp.ts).
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

