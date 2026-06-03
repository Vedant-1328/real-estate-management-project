import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

let cachedKey = null;

const resolveKey = () => {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      cachedKey = Buffer.from(raw, 'hex');
      return cachedKey;
    }
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) {
      cachedKey = b64;
      return cachedKey;
    }
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44-char base64)');
  }

  const fallback = process.env.JWT_ACCESS_SECRET?.trim();
  if (!fallback) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  cachedKey = crypto.scryptSync(fallback, 'supplier-mgmt-field-encryption', 32);
  return cachedKey;
};

const legacyKey = () => {
  const fallback = process.env.JWT_ACCESS_SECRET?.trim();
  if (!fallback) return null;
  return crypto.scryptSync(fallback, 'supplier-mgmt-field-encryption', 32);
};

const decryptWithKey = (value, key) => {
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted field format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};

export const isFieldEncryptionEnabled = () =>
  process.env.FIELD_ENCRYPTION_ENABLED !== 'false';

export const isEncrypted = (value) =>
  typeof value === 'string' && value.startsWith(PREFIX);

export const encryptField = (plaintext) => {
  if (!isFieldEncryptionEnabled()) return plaintext;
  if (plaintext == null || plaintext === '') return plaintext;
  if (isEncrypted(plaintext)) return plaintext;

  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptField = (value) => {
  if (!isFieldEncryptionEnabled()) return value;
  if (value == null || value === '') return value;
  if (!isEncrypted(value)) return value;

  const primaryKey = resolveKey();
  try {
    return decryptWithKey(value, primaryKey);
  } catch {
    const legacy = legacyKey();
    if (legacy && !legacy.equals(primaryKey)) {
      return decryptWithKey(value, legacy);
    }
    throw new Error('Unable to decrypt field value');
  }
};

export const assertEncryptionReady = () => {
  if (!isFieldEncryptionEnabled()) return;
  resolveKey();
};
