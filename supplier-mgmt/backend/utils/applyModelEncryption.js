import { ENCRYPTED_MODEL_FIELDS } from '../config/encryptedFields.js';
import {
  decryptField,
  encryptField,
  isEncrypted,
  isFieldEncryptionEnabled,
} from './fieldEncryption.js';

const isModelInstance = (instance) =>
  instance != null && typeof instance.getDataValue === 'function';

const attrTypeKey = (attr) => {
  if (!attr?.type) return 'STRING';
  return attr.type.key || attr.type.constructor?.name || 'STRING';
};

const prepareValueForEncrypt = (value, attr) => {
  if (value == null || value === '') return value;
  if (isEncrypted(value)) return value;
  if (value instanceof Date && Number.isNaN(value.getTime())) return null;
  if (value instanceof Date) return value.toISOString();
  const type = attrTypeKey(attr);
  if (type === 'DATE' || type === 'DATEONLY') {
    const s = String(value).trim();
    if (/^invalid/i.test(s)) return null;
    return s;
  }
  if (
    type === 'DECIMAL' ||
    type === 'FLOAT' ||
    type === 'DOUBLE' ||
    type === 'INTEGER' ||
    type === 'BIGINT' ||
    type === 'SMALLINT' ||
    type === 'TINYINT'
  ) {
    return String(value);
  }
  return value;
};

const restoreValueAfterDecrypt = (value, attr) => {
  if (value == null || value === '') return value;
  if (value instanceof Date && Number.isNaN(value.getTime())) return null;
  const s = typeof value === 'string' ? value.trim() : '';
  if (s && /^invalid/i.test(s)) return null;
  const type = attrTypeKey(attr);
  if (type === 'INTEGER' || type === 'BIGINT' || type === 'SMALLINT' || type === 'TINYINT') {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? value : n;
  }
  if (type === 'DECIMAL' || type === 'FLOAT' || type === 'DOUBLE') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? value : n;
  }
  if (type === 'DATEONLY') return String(value).slice(0, 10);
  if (type === 'DATE') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  }
  if (type === 'TEXT') {
    const str = String(value).trim();
    if (/^-?\d+$/.test(str)) {
      const n = parseInt(str, 10);
      if (!Number.isNaN(n)) return n;
    }
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      const n = parseFloat(str);
      if (!Number.isNaN(n)) return n;
    }
  }
  return value;
};

const encryptInstance = (instance, fields) => {
  if (!isModelInstance(instance)) return;
  const attrs = instance.constructor?.rawAttributes || {};
  for (const field of fields) {
    const value = instance.getDataValue(field);
    if (value != null && value !== '' && !isEncrypted(value)) {
      instance.setDataValue(
        field,
        encryptField(prepareValueForEncrypt(value, attrs[field]))
      );
    }
  }
};

const readFieldRaw = (instance, field) => {
  let value = instance.getDataValue(field);
  if (value instanceof Date && Number.isNaN(value.getTime())) {
    const raw = instance.dataValues?.[field];
    if (typeof raw === 'string' && isEncrypted(raw)) value = raw;
  }
  return value;
};

const decryptInstance = (instance, fields) => {
  if (!isModelInstance(instance)) return;
  const attrs = instance.constructor?.rawAttributes || {};
  for (const field of fields) {
    const value = readFieldRaw(instance, field);
    if (value != null && value !== '') {
      const decrypted =
        typeof value === 'string' && isEncrypted(value) ? decryptField(value) : value;
      instance.setDataValue(
        field,
        restoreValueAfterDecrypt(decrypted, attrs[field])
      );
    }
  }
};

const walkModelInstances = (result, visit) => {
  if (!result) return;
  if (Array.isArray(result)) {
    result.forEach((row) => walkModelInstances(row, visit));
    return;
  }
  if (!isModelInstance(result)) return;
  visit(result);
  for (const value of Object.values(result.dataValues ?? {})) {
    walkModelInstances(value, visit);
  }
};

export const applyModelEncryption = (models) => {
  if (!isFieldEncryptionEnabled()) return;

  const fieldsByModel = new Map(
    Object.entries(ENCRYPTED_MODEL_FIELDS).map(([name, fields]) => [name, fields])
  );

  const decryptTree = (result) => {
    walkModelInstances(result, (instance) => {
      const fields = fieldsByModel.get(instance.constructor?.name);
      if (fields) decryptInstance(instance, fields);
    });
  };

  for (const [modelName, fields] of Object.entries(ENCRYPTED_MODEL_FIELDS)) {
    const model = models[modelName];
    if (!model) continue;

    // Encrypt in beforeValidate so the resulting ciphertext (a string) passes
    // Sequelize's column-type validation (encrypted columns are TEXT but the
    // app-side value can be a Date, number, etc.). Keep beforeSave as a
    // safety net in case attributes are mutated after validation.
    model.addHook('beforeValidate', (instance) => encryptInstance(instance, fields));
    model.addHook('beforeSave', (instance) => encryptInstance(instance, fields));

    model.addHook('afterFind', decryptTree);
    model.addHook('afterCreate', (instance) => decryptTree(instance));
    model.addHook('afterUpdate', (instance) => decryptTree(instance));
  }
};
