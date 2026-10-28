const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    useWatchman: false,
    // Native Android/iOS build output (thousands of intermediate .o/.cxx/
    // ninja files once you've done a few native builds) lives inside the
    // project root Metro watches, but none of it is JS Metro ever needs to
    // bundle or watch — crawling/watching it too is exactly what was
    // starving Metro's fallback file watcher on Windows ("Failed to start
    // watch mode", metro-file-map/Watcher.js timing out after 4 minutes).
    blockList: [
      /android[\\/](app[\\/])?(build|\.cxx|\.gradle)[\\/].*/,
      /android[\\/]\.gradle[\\/].*/,
      /ios[\\/]build[\\/].*/,
      /[\\/]\.git[\\/].*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
