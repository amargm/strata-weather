import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { WeatherValues } from '../types/weather';
import { WeatherEffects } from '../components/WeatherEffects';

interface NowScreenProps {
  weather: WeatherValues | null;
  locationName: string;
  highTemp?: number;
  lowTemp?: number;
  expressiveDescription?: string;
  seasonalColors?: { blobColor1: string; blobColor2: string; accentTint: string };
}

export const NowScreen = React.memo(function NowScreen({ weather, locationName, highTemp, lowTemp, expressiveDescription, seasonalColors }: NowScreenProps) {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const tempAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 15 }),
    ]).start();
  }, [reduceMotion]);

  const now = new Date();
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const conditionCode = weather?.weatherCode || 1000;
  const condition = WEATHER_CODES[conditionCode] || WEATHER_CODES[1000];

  return (
    <View style={styles.container}>
      {/* Weather effects overlay */}
      {weather && (
        <WeatherEffects
          weatherCode={weather.weatherCode || 0}
          cloudCover={weather.cloudCover || 0}
        />
      )}

      {/* Ink wash blobs (seasonal) */}
      <View style={styles.inkWash}>
        <View style={[styles.inkBlob, styles.blob1,
          seasonalColors && { backgroundColor: seasonalColors.blobColor1 }]} />
        <View style={[styles.inkBlob, styles.blob2,
          seasonalColors && { backgroundColor: seasonalColors.blobColor2 }]} />
      </View>

      {/* Top bar */}
      <View style={styles.topBar} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 00 · Now</Text>
          <Text style={styles.locationLine}>📍 Current location</Text>
          <Text style={styles.locationName} accessibilityRole="text">{locationName || 'Loading...'}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.dateStamp} accessibilityLabel={`Date: ${dateStr}`}>{dateStr}</Text>
          <Text style={styles.conditionWord} accessibilityLabel={`Condition: ${condition.label}`}>{condition.label}</Text>
        </View>
      </View>

      {/* Live strip */}
      <View style={styles.liveStrip} accessibilityRole="summary">
        <View style={styles.liveItem} accessible accessibilityLabel={`Humidity ${weather?.humidity ?? 'unknown'} percent. Moisture in air`}>
          <View style={styles.liveRow}>
            <Text style={styles.liveVal}>{weather?.humidity ?? '--'}%</Text>
            <Text style={styles.liveLabel}>Hum</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.liveHint}>Moisture in air</Text>
        </View>
        <View style={styles.liveItem} accessible accessibilityLabel={`Wind ${Math.round((weather?.windSpeed || 0) * 3.6)} kilometers per hour`}>
          <View style={styles.liveRow}>
            <Text style={styles.liveVal}>{Math.round((weather?.windSpeed || 0) * 3.6)}km/h</Text>
            <Text style={styles.liveLabel}>Wind</Text>
          </View>
          <Text style={styles.liveHint}>Wind speed</Text>
        </View>
        <View style={styles.liveItem} accessible accessibilityLabel={`UV index ${weather?.uvIndex ?? 'unknown'}. Sun exposure strength`}>
          <View style={styles.liveRow}>
            <Text style={styles.liveVal}>UV {weather?.uvIndex ?? '--'}</Text>
            <Text style={styles.liveLabel}>Index</Text>
          </View>
          <Text style={styles.liveHint}>Sun exposure</Text>
        </View>
      </View>

      {/* Giant temp */}
      <Animated.View
        style={[
          styles.tempStage,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Temperature ${Math.round(weather?.temperature || 0)} degrees celsius. Feels like ${Math.round(weather?.temperatureApparent || 0)} degrees. High ${Math.round(highTemp || 0)}, Low ${Math.round(lowTemp || 0)}`}
        accessibilityLiveRegion="polite"
      >
        <TouchableOpacity activeOpacity={0.9}>
          <Text style={styles.tempSuper}>
            {Math.round(weather?.temperature || 0)}
            <Text style={styles.tempUnitMark}>°C</Text>
          </Text>
        </TouchableOpacity>
        <View style={styles.tempSubRow}>
          <Text style={styles.tempFeels}>
            Feels like {Math.round(weather?.temperatureApparent || 0)}°
          </Text>
          <View style={styles.tempRangePill} accessibilityLabel={`High ${Math.round(highTemp || 0)} degrees, Low ${Math.round(lowTemp || 0)} degrees`}>
            <Text style={styles.rangeHi}>↑ {Math.round(highTemp || 0)}°</Text>
            <Text style={styles.rangeLo}>↓ {Math.round(lowTemp || 0)}°</Text>
          </View>
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.nowFooter}>
        <Text style={styles.conditionLong}>
          {expressiveDescription || `${condition.label} with ${weather?.cloudCover ?? 0}% cloud cover. Visibility ${weather?.visibility ?? '--'} km.`}
        </Text>
        <View style={styles.pullHint}>
          <View style={styles.pullHintLine} />
          <Text style={styles.pullHintText}>Swipe to explore</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  inkWash: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  inkBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  blob1: {
    width: 340,
    height: 340,
    backgroundColor: '#4a8fcf',
    top: -80,
    left: -60,
  },
  blob2: {
    width: 260,
    height: 200,
    backgroundColor: '#1c5dc4',
    bottom: -40,
    right: -40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 52,
    paddingHorizontal: 28,
    zIndex: 2,
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 6,
  },
  locationLine: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  locationName: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 19,
    color: theme.colors.ink,
    marginTop: 3,
  },
  topRight: {
    alignItems: 'flex-end',
  },
  dateStamp: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 3,
  },
  conditionWord: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 15,
    color: theme.colors.accent,
  },
  liveStrip: {
    position: 'absolute',
    right: 0,
    top: '40%',
    zIndex: 3,
    alignItems: 'flex-end',
  },
  liveItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.faint,
    alignItems: 'flex-end',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveVal: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.ink,
  },
  liveLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  liveHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: 'rgba(15,14,12,0.45)',
    marginTop: 2,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  tempStage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 2,
    marginTop: -40,
  },
  tempSuper: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 140,
    lineHeight: 140,
    color: theme.colors.ink,
  },
  tempUnitMark: {
    fontSize: 36,
    fontFamily: theme.fonts.mono,
    color: theme.colors.muted,
  },
  tempSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
  },
  tempFeels: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.6,
  },
  tempRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.faint,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rangeHi: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.accent,
  },
  rangeLo: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.accent2,
  },
  nowFooter: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    zIndex: 2,
  },
  conditionLong: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.muted,
    maxWidth: 260,
  },
  pullHint: {
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
  },
  pullHintLine: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.ink,
    opacity: 0.3,
  },
  pullHintText: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
});
