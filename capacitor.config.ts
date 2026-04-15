import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kineos.app',
  appName: 'Kineos App',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false
    }
  }
};

export default config;
