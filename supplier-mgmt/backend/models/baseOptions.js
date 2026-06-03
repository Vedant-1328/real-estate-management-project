import { DataTypes } from 'sequelize';

export const modelOptions = {
  paranoid: true,
  timestamps: true,
  underscored: true,
};

/** DB columns that store AES ciphertext must use TEXT in Sequelize (not DATEONLY/DECIMAL/ENUM). */
export const encryptedValueType = DataTypes.TEXT;
