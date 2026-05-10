import { getToken } from './auth';

export async function getAccessToken(): Promise<string | null> {
  return getToken();
}
