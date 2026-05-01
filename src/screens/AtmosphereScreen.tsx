import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues } from '../types/weather';

interface AtmosphereScreenProps {
  weather: WeatherValues | null;
}

export const AtmosphereScreen = React.memo(function AtmosphereScreen({ weather }: AtmosphereScreenProps) {
  const barAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!weather) return;
    const targets = [
      weather.humidity / 100,
      weather.cloudCover / 100,
      (weather.pressureSurfaceLevel - 950) / 100,
      Math.min(weather.dewPoint / 40, 1),
      Math.min((weather.visibility || 0) / 20, 1),
      Math.min((weather.uvIndex || 0) / 11, 1),
    ];
    if (reduceMotion) {
      barAnims.forEach((anim, i) => anim.setValue(targets[i]));
      return;
    }
    Animated.stagger(80, barAnims.map((anim, i) =>
      Animated.spring(anim, { toValue: targets[i], useNativeDriver: false, damping: 18 })
    )).start();
  }, [weather, reduceMotion]);

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const uvIndex = weather?.uvIndex ?? 0;
  const uvLabel = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 01 · Atmosphere</Text>
          <Text style={styles.title}>Conditions</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.updatedLabel}>Updated</Text>
          <Text style={styles.updatedTime} accessibilityLabel={`Updated at ${timeStr}`}>{timeStr}</Text>
        </View>
      </View>

      {/* 2-column metric grid */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <MetricCell
          label="Humidity"
          value={`${weather?.humidity ?? '--'}`}
          unit="%"
          hint="Moisture in the air. Above 70% feels muggy, below 30% feels dry."
          barAnim={barAnims[0]}
          color={theme.colors.accent2}
          isLeft
        />
        <MetricCell
          label="Cloud Cover"
          value={`${weather?.cloudCover ?? '--'}`}
          unit="%"
          hint="How much sky is hidden. 100% is full overcast."
          barAnim={barAnims[1]}
          color={theme.colors.accent2}
          isLeft={false}
        />

        {/* Row 2 */}
        <MetricCell
          label="Pressure"
          value={`${Math.round(weather?.pressureSurfaceLevel ?? 0)}`}
          unit="hPa"
          hint="Weight of air above you. Below 1000 hPa often means storms."
          barAnim={barAnims[2]}
          color={theme.colors.accent}
          isLeft
        />
        <MetricCell
          label="Dew Point"
          value={`${Math.round(weather?.dewPoint ?? 0)}°`}
          unit="°C"
          hint="Air must cool to this temp to form dew. Above 15° feels sticky."
          barAnim={barAnims[3]}
          color="rgba(240,235,225,0.4)"
          isLeft={false}
        />

        {/* Row 3 */}
        <MetricCell
          label="Visibility"
          value={`${weather?.visibility ?? '--'}`}
          unit="km"
          hint="How far you can see clearly right now."
          barAnim={barAnims[4]}
          color="rgba(240,235,225,0.4)"
          isLeft
        />
        <MetricCell
          label="UV Index"
          value={`${uvIndex}`}
          unit={uvLabel}
          hint={uvIndex >= 6 ? 'Wear sunscreen — burns in under 20 min.' : 'Sun exposure is manageable right now.'}
          barAnim={barAnims[5]}
          color={theme.colors.accent}
          isLeft={false}
          valueColor={uvIndex >= 6 ? theme.colors.accent : undefined}
        />
      </View>

      {/* Wind gust alert */}
      {(weather?.windGust || 0) > 30 && (
        <View style={styles.alertStrip} accessible accessibilityRole="alert" accessibilityLabel={`Wind Advisory. Gusts to ${Math.round(weather?.windGust || 0)} miles per hour expected`}>
          <Text style={styles.alertIcon} importantForAccessibility="no">⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Wind Advisory</Text>
            <Text style={styles.alertBody}>
              Gusts to {Math.round(weather?.windGust || 0)} mph expected. Secure loose objects.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
});

function MetricCell({
  label, value, unit, hint, barAnim, color, isLeft, valueColor,
}: {
  label: string; value: string; unit: string; hint: string;
  barAnim: Animated.Value; color: string; isLeft: boolean; valueColor?: string;
}) {
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[styles.cell, isLeft ? styles.cellLeft : styles.cellRight]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label} ${value} ${unit}. ${hint}`}
    >
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellVal, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      <Text style={styles.cellUnit}>{unit}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} importantForAccessibility="no" />
      </View>
      <Text style={styles.cellHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 52,
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.5)',
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 28,
    color: theme.colors.paper,
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  updatedLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(240,235,225,0.5)',
  },
  updatedTime: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    color: 'rgba(240,235,225,0.7)',
    marginTop: 2,
  },

  /* ---- 2-column grid ---- */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.08)',
  },
  cell: {
    width: '50%',
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(240,235,225,0.08)',
  },
  cellLeft: {
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(240,235,225,0.08)',
  },
  cellRight: {},
  cellLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.5)',
    marginBottom: 10,
  },
  cellVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 34,
    color: theme.colors.paper,
    lineHeight: 36,
  },
  cellUnit: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: 'rgba(240,235,225,0.55)',
    marginTop: 4,
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(240,235,225,0.06)',
    marginTop: 14,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  cellHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: 'rgba(240,235,225,0.45)',
    marginTop: 10,
    lineHeight: 16,
  },

  /* ---- Wind alert ---- */
  alertStrip: {
    marginHorizontal: 22,
    marginTop: 20,
    backgroundColor: 'rgba(196,65,28,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,65,28,0.35)',
    borderRadius: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIcon: {
    fontSize: 22,
  },
  alertTitle: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.paper,
    letterSpacing: 0.3,
  },
  alertBody: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: 'rgba(240,235,225,0.65)',
    marginTop: 3,
    lineHeight: 16,
  },
});
