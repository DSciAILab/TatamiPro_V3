import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.sjjpcompetitionsv1',
  appName: 'SJJP Competitions V1',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.10:8080', // Substitua pelo seu IP local
    cleartext: true
  }
};

export default config;