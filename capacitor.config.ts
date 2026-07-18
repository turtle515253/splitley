import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.splitley.app',
  appName: 'Splitley',
  webDir: 'dist',
  android: {
    // Android 15+ forces edge-to-edge; inset the WebView so content
    // doesn't render under the status/navigation bars
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default config;
