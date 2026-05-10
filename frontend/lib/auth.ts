import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'pathlight_token';
const USER_KEY = 'pathlight_user';

export interface AuthUser {
  userId: string;
  email: string;
}

export async function saveAuth(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function loadAuth(): Promise<{ token: string; user: AuthUser } | null> {
  const [[, token], [, userStr]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
