/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize a string to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user input - removes dangerous characters but keeps text readable
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/\s/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize and validate a full name.
 * SC-011: allows Unicode letters (ä, ü, ö, Devanagari, Arabic, etc.) so users
 * from Germany, India, UAE etc. can use their real names.
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    // Allow Unicode letters, spaces, hyphens, apostrophes — strips everything else
    .replace(/[^\p{L}\s\-']/gu, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .substring(0, 100);
}

/**
 * Check for potentially malicious content
 */
export function containsMaliciousContent(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:\s*text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*['"]*\s*data:/gi,
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize message content - allows some formatting but removes dangerous content
 */
export function sanitizeMessage(message: string, maxLength: number = 5000): string {
  if (!message || typeof message !== 'string') return '';
  
  let sanitized = message
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Check for malicious content
  if (containsMaliciousContent(sanitized)) {
    // If malicious content detected, do full HTML sanitization
    sanitized = sanitizeHTML(sanitized);
  }
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize post content
 */
export function sanitizePostContent(content: string, maxLength: number = 10000): string {
  return sanitizeMessage(content, maxLength);
}

/**
 * Sanitize title
 */
export function sanitizeTitle(title: string, maxLength: number = 50): string {
  if (!title || typeof title !== 'string') return '';
  
  return title
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, maxLength);
}

