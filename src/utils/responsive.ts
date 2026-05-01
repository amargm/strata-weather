import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base design dimensions (iPhone 13/14 - 390×844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Scale a value horizontally relative to the base design width.
 * Use for horizontal dimensions: paddingHorizontal, marginLeft, width, fontSize.
 */
export function sw(size: number): number {
  return Math.round((size * width) / BASE_WIDTH);
}

/**
 * Scale a value vertically relative to the base design height.
 * Use for vertical dimensions: paddingTop, marginTop, height.
 */
export function sh(size: number): number {
  return Math.round((size * height) / BASE_HEIGHT);
}

/**
 * Moderate scale — scales less aggressively (splits the difference).
 * Use for font sizes and border radius where full scaling looks wrong.
 */
export function ms(size: number, factor: number = 0.5): number {
  return Math.round(size + (sw(size) - size) * factor);
}

/**
 * Get top padding that accounts for status bar.
 */
export function getStatusBarPadding(): number {
  if (Platform.OS === 'android') {
    return (StatusBar.currentHeight ?? 24) + 12;
  }
  return 48; // iOS default with notch
}

export const screen = { width, height };
