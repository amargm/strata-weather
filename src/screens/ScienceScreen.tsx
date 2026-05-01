import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues, DailyInterval } from '../types/weather';
import { getStatusBarPadding, sw, ms, sh } from '../utils/responsive';

interface ScienceScreenProps {
  weather: WeatherValues | null;
  today: DailyInterval | null;
}

export const ScienceScreen = React.memo(function ScienceScreen({ weather, today }: ScienceScreenProps) {
  const uvIndex = weather?.uvIndex ?? 0;
  const uvLabel = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

  const formatTime = (iso: string | undefined) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const sunrise = formatTime(today?.values?.sunriseTime);
  const sunset = formatTime(today?.values?.sunsetTime);

  // Calculate daylight hours
  let daylightStr = '--';
  if (today?.values?.sunriseTime && today?.values?.sunsetTime) {
    const rise = new Date(today.values.sunriseTime).getTime();
    const set = new Date(today.values.sunsetTime).getTime();
    const diffMs = set - rise;
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    daylightStr = `${hours}h ${mins}m`;
  }

  // Staggered entrance animations
  const blockAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const sunAnim = useRef(new Animated.Value(0)).current;
  const uvBarAnim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!weather) return;
    if (reduceMotion) {
      blockAnims.forEach(a => a.setValue(1));
      sunAnim.setValue(1);
      uvBarAnim.setValue(1);
      return;
    }
    // Reset
    blockAnims.forEach(a => a.setValue(0));
    sunAnim.setValue(0);
    uvBarAnim.setValue(0);
    // Stagger blocks flowing in from below
    Animated.stagger(100,
      blockAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 80 })
      )
    ).start();
    // Sun strip flows in after blocks
    Animated.spring(sunAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 70,
      delay: 450,
    }).start();
    // UV bar animates smoothly
    Animated.timing(uvBarAnim, {
      toValue: Math.min(uvIndex / 11, 1),
      duration: 800,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [weather, reduceMotion]);

  const makeBlockStyle = (index: number) => ({
    opacity: blockAnims[index],
    transform: [{
      translateY: blockAnims[index].interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
      }),
    }],
  });

  const uvMarkerLeft = uvBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 04 · Deep Data</Text>
          <Text style={styles.title}>Science & Extremes</Text>
        </View>
      </View>

      {/* Science grid — 2x2, centered vertically */}
      <View style={styles.gridArea}>
        <View style={styles.gridRow}>
          {/* UV */}
          <Animated.View style={[styles.block, makeBlockStyle(0)]} accessible accessibilityRole="text" accessibilityLabel={`UV Index ${uvIndex}, ${uvLabel}. How strong the sun is right now. 6 plus means sunburn in under 20 minutes`}>
            <Text style={styles.label}>UV Index</Text>
            <Text style={[styles.val, { color: theme.colors.accent }]}>{uvIndex}</Text>
            <Text style={styles.unit}>{uvLabel}</Text>
            <View style={styles.uvBar} importantForAccessibility="no">
              <Animated.View style={[styles.uvMarker, { left: uvMarkerLeft, marginLeft: -5.5 }]} />
            </View>
            <Text style={styles.sub}>
              How strong the sun is right now.{'\n'}6+ means sunburn in under 20 min.
            </Text>
          </Animated.View>

          {/* Pressure */}
          <Animated.View style={[styles.block, makeBlockStyle(1)]} accessible accessibilityRole="text" accessibilityLabel={`Pressure ${Math.round(weather?.pressureSurfaceLevel ?? 0)} hectopascals. Weight of air above you. Below 1000 means storms likely, above 1020 means clear skies`}>
            <Text style={styles.label}>Pressure</Text>
            <Text style={styles.val}>{Math.round(weather?.pressureSurfaceLevel ?? 0)}</Text>
            <Text style={styles.unit}>hPa</Text>
            <Text style={styles.sub}>
              Weight of air above you.{'\n'}Below 1000 = storms likely.{'\n'}Above 1020 = clearing.
            </Text>
          </Animated.View>
        </View>

        <View style={styles.gridRow}>
          {/* Feels Like */}
          <Animated.View style={[styles.block, makeBlockStyle(2)]} accessible accessibilityRole="text" accessibilityLabel={`Feels like ${Math.round(weather?.temperatureApparent ?? 0)} degrees. Dew point ${Math.round(weather?.dewPoint ?? 0)} degrees. ${(weather?.dewPoint ?? 0) > 15 ? 'Muggy, sweat won\'t evaporate easily' : 'Comfortable moisture level'}`}>
            <Text style={styles.label}>Feels Like</Text>
            <Text style={styles.val}>{Math.round(weather?.temperatureApparent ?? 0)}°</Text>
            <Text style={styles.unit}>Dew point {Math.round(weather?.dewPoint ?? 0)}°C</Text>
            <Text style={styles.sub}>
              How temperature actually feels.{'\n'}
              {(weather?.dewPoint ?? 0) > 15 ? 'Muggy — sweat won\'t evaporate.' : 'Comfortable moisture level.'}
            </Text>
          </Animated.View>

          {/* Humidity */}
          <Animated.View style={[styles.block, makeBlockStyle(3)]} accessible accessibilityRole="text" accessibilityLabel={`Humidity ${weather?.humidity ?? 0} percent. Moisture in the air. Above 70 percent feels muggy, below 30 percent feels dry`}>
            <Text style={styles.label}>Humidity</Text>
            <Text style={[styles.val, { color: theme.colors.accent2 }]}>
              {weather?.humidity ?? 0}
            </Text>
            <Text style={styles.unit}>%</Text>
            <Text style={styles.sub}>
              Moisture in the air.{'\n'}Above 70% feels muggy.{'\n'}Below 30% feels dry.
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Sun strip */}
      <Animated.View
        style={[
          styles.sunStrip,
          {
            opacity: sunAnim,
            transform: [{
              translateY: sunAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Sunrise at ${sunrise}. Sunset at ${sunset}. Total daylight ${daylightStr}`}
      >
        <View style={styles.sunCol}>
          <Text style={styles.sunIcon}>☀</Text>
          <Text style={styles.sunLabel}>Sunrise</Text>
          <Text style={styles.sunVal}>{sunrise}</Text>
        </View>
        <View style={styles.sunDivider} />
        <View style={styles.sunCol}>
          <Text style={styles.sunIcon}>🌙</Text>
          <Text style={styles.sunLabel}>Sunset</Text>
          <Text style={styles.sunVal}>{sunset}</Text>
        </View>
        <View style={styles.sunDivider} />
        <View style={styles.sunCol}>
          <Text style={styles.sunIcon}>◐</Text>
          <Text style={styles.sunLabel}>Daylight</Text>
          <Text style={[styles.sunVal, { color: 'rgba(240,200,80,0.9)' }]}>
            {daylightStr}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  header: {
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
    paddingBottom: sh(12),
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 6,
  },
  title: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: ms(28),
    color: theme.colors.paper,
  },
  gridArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sw(20),
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: sh(8),
  },
  block: {
    flex: 1,
    margin: sw(6),
    padding: sw(18),
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,225,0.08)',
    backgroundColor: 'rgba(240,235,225,0.03)',
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 10,
  },
  val: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(30),
    color: theme.colors.paper,
    lineHeight: ms(32),
  },
  unit: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.55)',
    marginTop: 2,
  },
  sub: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.45)',
    marginTop: 8,
    lineHeight: 15,
  },
  uvBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: 'rgba(240,235,225,0.08)',
  },
  uvMarker: {
    position: 'absolute',
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: theme.colors.paper,
  },
  sunStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: sw(26),
    marginBottom: sh(40),
    paddingVertical: sh(16),
    paddingHorizontal: sw(16),
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,225,0.08)',
    backgroundColor: 'rgba(240,235,225,0.03)',
  },
  sunCol: {
    flex: 1,
    alignItems: 'center',
  },
  sunDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: 'rgba(240,235,225,0.12)',
  },
  sunIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  sunLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 4,
  },
  sunVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(16),
    color: theme.colors.paper,
  },
});
