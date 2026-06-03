import crypto from 'crypto';

const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not defined in process.env');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('[Encryption] Decryption failed: ENCRYPTION_KEY is not defined in process.env');
    return '';
  }

  try {
    const parts = text.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // GCM Auth Tag must be 16 bytes
    if (authTag.length !== 16) {
      throw new Error('Invalid authentication tag length');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err instanceof Error ? err.message : 'Unknown error');
    return ''; // Return empty string to indicate failure instead of crashing
  }
}

