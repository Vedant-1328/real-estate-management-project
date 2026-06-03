/**
 * Re-encrypts fields from legacy JWT-derived key to ENCRYPTION_KEY in .env.
 * Run once after setting ENCRYPTION_KEY: node scripts/rekey-field-encryption.js
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import models from '../models/index.js';
import { ENCRYPTED_MODEL_FIELDS } from '../config/encryptedFields.js';
import {
  assertEncryptionReady,
  encryptField,
  isEncrypted,
} from '../utils/fieldEncryption.js';

dotenv.config();

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';

const legacyKey = () =>
  crypto.scryptSync(
    process.env.JWT_ACCESS_SECRET.trim(),
    'supplier-mgmt-field-encryption',
    32
  );

const decryptWithKey = (value, key) => {
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

const decryptValue = (value) => {
  if (!isEncrypted(value)) return value;
  try {
    return decryptWithKey(value, legacyKey());
  } catch {
    return decryptWithKey(value, Buffer.from(process.env.ENCRYPTION_KEY.trim(), 'hex'));
  }
};

await connectDB();
assertEncryptionReady();

let rekeyed = 0;

for (const [modelName, fields] of Object.entries(ENCRYPTED_MODEL_FIELDS)) {
  const Model = models[modelName];
  if (!Model) continue;

  const rows = await Model.unscoped().findAll({ paranoid: false, hooks: false });
  for (const row of rows) {
    let changed = false;
    for (const field of fields) {
      const value = row.getDataValue(field);
      if (value == null || value === '') continue;
      if (!isEncrypted(value)) continue;

      const plain = decryptValue(value);
      const next = encryptField(plain);
      if (next !== value) {
        row.setDataValue(field, next);
        changed = true;
      }
    }
    if (changed) {
      await row.save({ hooks: false });
      rekeyed += 1;
    }
  }
}

console.log(`Re-keyed encrypted fields on ${rekeyed} row(s).`);
process.exit(0);
