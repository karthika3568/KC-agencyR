import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { API_BASE_URL } from '../config/env';
import { secureStorage } from '../storage/secureStorage';

/**
 * Downloads a backend-generated binary file (the real .xlsx bytes the
 * server streams for ?export=1, same as web's blob download) straight to
 * the device's cache dir with auth headers attached, then opens the share
 * sheet so the user can save/send it — never a fake "exported" message.
 *
 * IMPORTANT: must land under ReactNativeBlobUtil.fs.dirs.CacheDir, i.e.
 * Android's Context.getCacheDir(). `{ fileCache: true }` alone lets
 * blob-util pick its OWN default temp path instead, which is
 * getFilesDir()+"/ReactNativeBlobUtilTmp_<id>" — react-native-share's
 * bundled FileProvider (share_download_paths.xml) only declares a
 * <cache-path> (and the public Download folder), no <files-path> at all,
 * so FileProvider.getUriForFile() throws for a files/-dir path,
 * compatUriFromFile() swallows that and returns a null Uri, and Share.open
 * crashes native-side calling .getScheme() on it. Passing an explicit
 * `path` under CacheDir sidesteps the mismatch entirely — verified against
 * both libraries' actual Android source, not a guess.
 */
export async function downloadAndShareFile(path, filename, params = {}) {
  const token = await secureStorage.getToken();
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ''}`;
  const destPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

  const res = await ReactNativeBlobUtil.config({ path: destPath })
    .fetch('GET', url, token ? { Authorization: `Bearer ${token}` } : {});

  if (res.info().status >= 400) {
    throw new Error(`Export failed (HTTP ${res.info().status})`);
  }

  const filePath = res.path();
  if (!filePath || !(await ReactNativeBlobUtil.fs.exists(filePath))) {
    throw new Error('The file could not be generated on this device. Please try again.');
  }

  await Share.open({ url: `file://${filePath}`, filename, failOnCancel: false });
  return filePath;
}

/** Writes a base64-encoded file (client-built .xlsx/.pdf) to disk, then shares it. Same CacheDir requirement as above. */
export async function saveAndShareBase64(base64Data, filename, mimeType) {
  const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, base64Data, 'base64');

  if (!(await ReactNativeBlobUtil.fs.exists(filePath))) {
    throw new Error('The file could not be generated on this device. Please try again.');
  }

  await Share.open({ url: `file://${filePath}`, filename, type: mimeType, failOnCancel: false });
  return filePath;
}
