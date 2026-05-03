import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Dimensions,
  Easing,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { WeatherValues } from '../types/weather';
import { WeatherEffects } from '../components/WeatherEffects';
import { ProBadge } from '../components/ProBadge';
import { sh, sw, ms, getStatusBarPadding } from '../utils/responsive';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface NowScreenProps {
  weather: WeatherValues | null;
  locationName: string;
  highTemp?: number;
  lowTemp?: number;
  expressiveDescription?: string;
  seasonalColors?: { blobColor1: string; blobColor2: string; accentTint: string };
  onRefresh?: () => void;
  sunriseTime?: string;
  sunsetTime?: string;
  dataTimestamp?: number;
}

/** Format a duration in minutes to "Xh Ym" or "Ym" */
function formatCountdown(mins: number): string {
  if (mins < 1) return 'now';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Compute sun countdown text from sunrise/sunset ISO strings */
function getSunCountdown(sunriseISO?: string, sunsetISO?: string): string | null {
  if (!sunriseISO || !sunsetISO) return null;
  const now = Date.now();
  const sunrise = new Date(sunriseISO).getTime();
  const sunset = new Date(sunsetISO).getTime();
  if (isNaN(sunrise) || isNaN(sunset)) return null;

  if (now < sunrise) {
    const diff = (sunrise - now) / 60000;
    return `☀ Sunrise in ${formatCountdown(diff)}`;
  }
  if (now < sunset) {
    const diff = (sunset - now) / 60000;
    return `🌅 Sunset in ${formatCountdown(diff)}`;
  }
  return '🌙 Sun has set';
}

/** Format data freshness from timestamp */
function getFreshness(ts?: number): string | null {
  if (!ts) return null;
  const ago = Math.round((Date.now() - ts) / 60000);
  if (ago < 1) return 'Updated just now';
  if (ago === 1) return 'Updated 1 min ago';
  if (ago < 60) return `Updated ${ago} min ago`;
  const h = Math.floor(ago / 60);
  return `Updated ${h}h ago`;
}

export const NowScreen = React.memo(function NowScreen({ weather, locationName, highTemp, lowTemp, expressiveDescription, seasonalColors, onRefresh, sunriseTime, sunsetTime, dataTimestamp }: NowScreenProps) {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const tempAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Breathing ink wash blobs
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const blob1Drift = useRef(new Animated.Value(0)).current;
  const blob2Drift = useRef(new Animated.Value(0)).current;

  // Live strip stagger entrance
  const liveItem1 = useRef(new Animated.Value(0)).current;
  const liveItem2 = useRef(new Animated.Value(0)).current;
  const liveItem3 = useRef(new Animated.Value(0)).current;

  // Footer entrance
  const footerFade = useRef(new Animated.Value(0)).current;

  // Refresh animation state
  const [refreshing, setRefreshing] = useState(false);
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const refreshBtnSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      liveItem1.setValue(1);
      liveItem2.setValue(1);
      liveItem3.setValue(1);
      footerFade.setValue(1);
      return;
    }

    // Main content entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 15 }),
    ]).start();

    // Staggered live strip items
    Animated.stagger(200, [
      Animated.spring(liveItem1, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
      Animated.spring(liveItem2, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
      Animated.spring(liveItem3, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 100 }),
    ]).start();

    // Footer delay entrance
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(footerFade, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    // Blob breathing — slow, organic scale pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Anim, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Anim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Blob lazy drift
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Drift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Drift, { toValue: 1, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Drift, { toValue: 0, duration: 15000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [reduceMotion]);

  const handleRefresh = useCallback(() => {
    if (refreshing || !onRefresh) return;
    setRefreshing(true);

    // Reset
    rippleScale.setValue(0);
    rippleOpacity.setValue(1);
    contentFade.setValue(1);
    refreshBtnSpin.setValue(0);

    if (reduceMotion) {
      onRefresh();
      setRefreshing(false);
      return;
    }

    // Phase 1: Button spin + ripple expands from bottom-right
    Animated.parallel([
      Animated.timing(refreshBtnSpin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(contentFade, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Trigger the actual refresh
      onRefresh();

      // Phase 2: Ripple fades out, content fades back in
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentFade, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setRefreshing(false);
        rippleScale.setValue(0);
        rippleOpacity.setValue(1);
      });
    });
  }, [refreshing, onRefresh, reduceMotion]);

  // Ripple transform — expands from bottom-right corner of the live strip area
  const maxRadius = Math.sqrt(SCREEN_W * SCREEN_W + SCREEN_H * SCREEN_H);
  const rippleTransform = [{
    scale: rippleScale.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxRadius / 30], // 30 is half the initial ripple size (60/2)
    }),
  }];

  const spinRotation = refreshBtnSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const now = new Date();
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const conditionCode = weather?.weatherCode || 1000;
  const condition = WEATHER_CODES[conditionCode] || WEATHER_CODES[1000];
  const sunCountdown = getSunCountdown(sunriseTime, sunsetTime);
  const freshness = getFreshness(dataTimestamp);

  return (
    <View style={styles.container}>
      {/* Weather effects overlay */}
      {weather && (
        <WeatherEffects
          weatherCode={weather.weatherCode || 0}
          cloudCover={weather.cloudCover || 0}
        />
      )}

      {/* Ink wash blobs (seasonal, animated) */}
      <View style={styles.inkWash}>
        <Animated.View style={[styles.inkBlob, styles.blob1,
          seasonalColors && { backgroundColor: seasonalColors.blobColor1 },
          {
            opacity: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.16] }),
            transform: [
              { scale: blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
              { translateX: blob1Drift.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
              { translateY: blob1Drift.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
            ],
          },
        ]} />
        <Animated.View style={[styles.inkBlob, styles.blob2,
          seasonalColors && { backgroundColor: seasonalColors.blobColor2 },
          {
            opacity: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.16] }),
            transform: [
              { scale: blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
              { translateX: blob2Drift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
              { translateY: blob2Drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            ],
          },
        ]} />
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
        <Animated.View style={[styles.liveItem, { opacity: liveItem1, transform: [{ translateX: liveItem1.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]} accessible accessibilityLabel={`Humidity ${weather?.humidity ?? 'unknown'} percent. Moisture in air`}>
          <View style={styles.liveRow}>
            <Text style={styles.liveVal}>{weather?.humidity ?? '--'}%</Text>
            <Text style={styles.liveLabel}>Hum</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.liveHint}>Moisture in air</Text>
        </Animated.View>
        <Animated.View style={[styles.liveItem, { opacity: liveItem2, transform: [{ translateX: liveItem2.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]} accessible accessibilityLabel={`Wind ${Math.round((weather?.windSpeed || 0) * 3.6)} kilometers per hour`}>
          <View style={styles.liveRow}>
            <Text style={styles.liveVal}>{Math.round((weather?.windSpeed || 0) * 3.6)}km/h</Text>
            <Text style={styles.liveLabel}>Wind</Text>
          </View>
          <Text style={styles.liveHint}>Wind speed</Text>
        </Animated.View>
        <Animated.View style={[styles.liveItem, { opacity: liveItem3, transform: [{ translateX: liveItem3.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]} accessible accessibilityLabel={`UV index. Upgrade to Pro to unlock`}>
          <View style={styles.liveRow}>
            <Text style={[styles.liveVal, { opacity: 0.35 }]}>UV --</Text>
            <ProBadge dark={false} force />
          </View>
          <Text style={styles.liveHint}>Pro feature</Text>
        </Animated.View>

        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Refresh weather data"
          accessibilityState={{ busy: refreshing }}
        >
          <Animated.Text
            style={[
              styles.refreshIcon,
              { transform: [{ rotate: spinRotation }] },
            ]}
          >
            ↻
          </Animated.Text>
          <Text style={styles.refreshLabel}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Refresh ripple overlay */}
      <Animated.View
        style={[
          styles.rippleOverlay,
          {
            opacity: rippleOpacity,
            transform: rippleTransform,
          },
        ]}
        pointerEvents="none"
      />

      {/* Giant temp — wrapped in contentFade */}
      <Animated.View
        style={[
          styles.tempStage,
          { opacity: Animated.multiply(fadeAnim, contentFade), transform: [{ translateY: slideAnim }] },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Temperature ${Math.round(weather?.temperature || 0)} degrees celsius. Feels like ${Math.round(weather?.temperatureApparent || 0)} degrees.${highTemp != null ? ` High ${Math.round(highTemp)},` : ''}${lowTemp != null ? ` Low ${Math.round(lowTemp)}` : ''}`}
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
          <View style={styles.tempRangePill} accessibilityLabel={`High ${highTemp != null ? Math.round(highTemp) : 'unavailable'} degrees, Low ${lowTemp != null ? Math.round(lowTemp) : 'unavailable'} degrees`}>
            <Text style={styles.rangeHi}>↑ {highTemp != null ? `${Math.round(highTemp)}°` : '--'}</Text>
            <Text style={styles.rangeLo}>↓ {lowTemp != null ? `${Math.round(lowTemp)}°` : '--'}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.nowFooter, { opacity: footerFade }]}>
        <Text style={styles.conditionLong}>
          {expressiveDescription || `${weather?.description ? (weather.description.charAt(0).toUpperCase() + weather.description.slice(1)) : condition.label} with ${weather?.cloudCover ?? 0}% cloud cover. Visibility ${Math.round(weather?.visibility ?? 0)} km.`}
        </Text>
        {((weather?.rainVolume ?? 0) > 0 || (weather?.snowVolume ?? 0) > 0) && (
          <Text style={styles.precipNote}>
            {(weather?.rainVolume ?? 0) > 0 ? `🌧 ${weather!.rainVolume!.toFixed(1)} mm rain` : ''}
            {(weather?.rainVolume ?? 0) > 0 && (weather?.snowVolume ?? 0) > 0 ? '  ·  ' : ''}
            {(weather?.snowVolume ?? 0) > 0 ? `❄ ${weather!.snowVolume!.toFixed(1)} mm snow` : ''}
          </Text>
        )}
        {(sunCountdown || freshness) && (
          <View style={styles.metaRow}>
            {sunCountdown && <Text style={styles.metaText}>{sunCountdown}</Text>}
            {sunCountdown && freshness && <Text style={styles.metaDot}>·</Text>}
            {freshness && <Text style={styles.metaText}>{freshness}</Text>}
          </View>
        )}
        <View style={styles.pullHint}>
          <View style={styles.pullHintLine} />
          <Text style={styles.pullHintText}>Swipe to explore</Text>
        </View>
      </Animated.View>
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
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
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
    paddingHorizontal: sw(28),
    zIndex: 2,
    marginTop: sh(-20),
  },
  tempSuper: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(120, 0.4),
    lineHeight: ms(120, 0.4),
    color: theme.colors.ink,
  },
  tempUnitMark: {
    fontSize: ms(30, 0.4),
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
    paddingHorizontal: sw(28),
    paddingBottom: sh(28),
    zIndex: 2,
  },
  conditionLong: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: ms(15),
    lineHeight: ms(22),
    color: theme.colors.muted,
    maxWidth: sw(260),
  },
  precipNote: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  metaText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.3,
  },
  metaDot: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    opacity: 0.5,
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
  refreshBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.faint,
    gap: 3,
  },
  refreshIcon: {
    fontSize: 18,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  refreshLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  rippleOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.ink,
    right: 0,
    top: '55%',
    zIndex: 10,
  },
});
