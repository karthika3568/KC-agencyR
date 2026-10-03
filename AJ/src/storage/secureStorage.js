import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'aj_agency_token';
const USER_KEY = 'aj_agency_user';

export const secureStorage = {
  async saveSession(token, user) {
    await EncryptedStorage.setItem(TOKEN_KEY, token);
    await EncryptedStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async getToken() {
    return EncryptedStorage.getItem(TOKEN_KEY);
  },
  async getUser() {
    const raw = await EncryptedStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async clearSession() {
    await EncryptedStorage.removeItem(TOKEN_KEY);
    await EncryptedStorage.removeItem(USER_KEY);
  },
};
