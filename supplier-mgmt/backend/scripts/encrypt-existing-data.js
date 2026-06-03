/**
 * Encrypts existing plaintext values for configured sensitive fields.
 * Run after patch-encryption-columns.js: node scripts/encrypt-existing-data.js
 */
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import models from '../models/index.js';
import { ENCRYPTED_MODEL_FIELDS } from '../config/encryptedFields.js';
import { encryptField, isEncrypted, assertEncryptionReady } from '../utils/fieldEncryption.js';

dotenv.config();

await connectDB();
assertEncryptionReady();

let updated = 0;

for (const [modelName, fields] of Object.entries(ENCRYPTED_MODEL_FIELDS)) {
  const Model = models[modelName];
  if (!Model) continue;

  const rows = await Model.unscoped().findAll({ paranoid: false });
  for (const row of rows) {
    let changed = false;
    for (const field of fields) {
      const value = row.getDataValue(field);
      if (value != null && value !== '' && !isEncrypted(value)) {
        row.setDataValue(field, encryptField(value));
        changed = true;
      }
    }
    if (changed) {
      await row.save({ hooks: false });
      updated += 1;
    }
  }
  console.log(`${modelName}: processed ${rows.length} row(s)`);
}

console.log(`Encrypted fields on ${updated} row(s).`);
process.exit(0);
