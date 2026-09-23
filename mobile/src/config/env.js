/**
 * Same backend the web app talks to — no separate mobile API.
 * 10.0.2.2 is the Android emulator's alias for the host machine's
 * localhost; a physical device needs the host's real LAN IP instead.
 */
export const API_BASE_URL = 'http://192.168.1.106/pos-system/backend/public/api';
