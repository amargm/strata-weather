import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Strata: Layered Weather',
  slug: 'strata-weather',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#f0ebe1',
    resizeMode: 'contain',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f0ebe1',
    },
    package: 'com.fieldweather',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: ['expo-location', 'expo-font'],
  extra: {
    eas: {
      projectId: '', // Set after EAS init
    },
  },
});
