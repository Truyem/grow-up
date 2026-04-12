import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.growup.webapp',
  appName: 'GrowUp',
  webDir: 'dist',
  server: {
    url: 'https://elaborate-concha-dfba0a.netlify.app/',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: false
    }
  }
};

export default config;
