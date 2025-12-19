export default {
  preset: 'react-native',
  setupFiles: ['./src/setupTests.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-webview)/)',
  ],
};
