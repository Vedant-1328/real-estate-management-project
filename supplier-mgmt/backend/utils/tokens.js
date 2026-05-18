import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export const signAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, jwtConfig.accessSecret);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.refreshSecret);
