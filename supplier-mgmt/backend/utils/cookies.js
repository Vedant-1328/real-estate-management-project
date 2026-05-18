const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: SEVEN_DAYS_MS,
  path: '/api/auth',
};

export const clearRefreshCookieOptions = {
  ...refreshCookieOptions,
  maxAge: 0,
};
