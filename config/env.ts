import 'dotenv/config';

export const BASE_URL = process.env.BASE_URL ?? 'https://www.getsledge.com';
export const API_URL = process.env.API_URL ?? 'https://api.getsledge.com/api/v1';
export const STORAGE_STATE = '.auth/user.json';
export const CAN_CREATE_DATA = process.env.ALLOW_DATA_CREATION === 'true';

export function credentials() {
  const email = process.env.SLEDGE_EMAIL;
  const password = process.env.SLEDGE_PASSWORD;
  if (!email || !password) {
    throw new Error('SLEDGE_EMAIL and SLEDGE_PASSWORD are not set (see .env.example)');
  }
  return { email, password };
}
