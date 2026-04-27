import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

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
 * Hash a password using bcrypt-like approach with PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltBase64, hashBase64] = storedHash.split(':');
    const salt = Buffer.from(saltBase64, 'base64');
    const hash = Buffer.from(hashBase64, 'base64');
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return crypto.timingSafeEqual(hash, verifyHash);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token
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

