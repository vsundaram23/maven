import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.triedandtrusted',
  appName: 'Tried & Trusted',
  webDir: 'build',
  server: {
    url: 'http://127.0.0.1:3001', // This should be correct now
    cleartext: true,
  },
};

export default config;
