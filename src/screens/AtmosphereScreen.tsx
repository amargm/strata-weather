import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
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
      (weather.pressureSurfaceLevel - 950) / 100, // normalize ~950-1050
      weather.cloudCover / 100,
    ];
    if (reduceMotion) {
      barAnims.forEach((anim, i) => anim.setValue(targets[i]));
      return;
    }
    Animated.stagger(100, barAnims.map((anim, i) =>
      Animated.spring(anim, { toValue: targets[i], useNativeDriver: false, damping: 15 })
    )).start();
  }, [weather, reduceMotion]);

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
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

      {/* Metrics Grid */}
      <View style={styles.metricsGrid} accessibilityRole="summary">
        <MetricCell
          label="Humidity"
          value={`${weather?.humidity || '--'}`}
          unit="%"
          hint="Moisture in air · >70% feels muggy"
          barAnim={barAnims[0]}
          color={theme.colors.accent2}
        />
        <MetricCell
          label="Pressure"
          value={`${Math.round(weather?.pressureSurfaceLevel || 0)}`}
          unit="hPa · Steady"
          hint="Air weight · Low = storms likely"
          barAnim={barAnims[1]}
          color={theme.colors.accent}
        />
        <MetricCell
          label="Cloud Cover"
          value={`${weather?.cloudCover || '--'}`}
          unit="%"
          hint="Sky coverage · 100% = overcast"
          barAnim={barAnims[2]}
          color={theme.colors.accent2}
        />
      </View>

      {/* Extra row */}
      <View style={styles.extraRow}>
        <View style={styles.extraCell} accessible accessibilityLabel={`Dew Point ${Math.round(weather?.dewPoint || 0)} degrees celsius. Wet-bulb ${Math.round((weather?.dewPoint || 0) + 2)} degrees. Temperature where fog forms, sticky above 15 degrees`} accessibilityRole="text">
          <Text style={styles.cellLabel}>Dew Point</Text>
          <Text style={styles.extraVal}>{Math.round(weather?.dewPoint || 0)}°C</Text>
          <Text style={styles.cellUnit}>
            Wet-bulb {Math.round((weather?.dewPoint || 0) + 2)}°C
          </Text>
          <Text style={styles.cellHint}>Temp where fog forms · sticky above 15°</Text>
        </View>
        <View style={[styles.extraCell, { borderRightWidth: 0 }]} accessible accessibilityLabel={`Visibility ${weather?.visibility || 'unknown'} kilometers. How far you can see clearly`} accessibilityRole="text">
          <Text style={styles.cellLabel}>Visibility</Text>
          <Text style={styles.extraVal}>{weather?.visibility || '--'} km</Text>
          <Text style={styles.cellUnit}>Current conditions</Text>
          <Text style={styles.cellHint}>How far you can see clearly</Text>
        </View>
      </View>

      {/* UV Index block */}
      <View style={styles.uvBlock} accessible accessibilityLabel={`UV Index ${weather?.uvIndex || 0}, ${(weather?.uvIndex || 0) <= 2 ? 'Low' : (weather?.uvIndex || 0) <= 5 ? 'Moderate' : 'High'}. Sun burn risk, 6 plus wear sunscreen`} accessibilityRole="text">
        <Text style={styles.cellLabel}>UV Index</Text>
        <Text style={styles.uvVal}>{weather?.uvIndex || 0}</Text>
        <Text style={styles.cellUnit}>
          {(weather?.uvIndex || 0) <= 2 ? 'Low' : (weather?.uvIndex || 0) <= 5 ? 'Moderate' : 'High'}
        </Text>
        <View style={styles.uvBar}>
          <View
            style={[
              styles.uvMarker,
              { left: `${Math.min(((weather?.uvIndex || 0) / 11) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.cellHint}>Sun burn risk · 6+ wear sunscreen</Text>
      </View>

      {/* Wind gust alert */}
      {(weather?.windGust || 0) > 30 && (
        <View style={styles.alertStrip} accessible accessibilityRole="alert" accessibilityLabel={`Wind Advisory. Gusts to ${Math.round(weather?.windGust || 0)} miles per hour expected`}>
          <Text style={styles.alertIcon} importantForAccessibility="no">!</Text>
          <View>
            <Text style={styles.alertTitle}>Wind Advisory</Text>
            <Text style={styles.alertBody}>
              Gusts to {Math.round(weather?.windGust || 0)} mph expected
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

function MetricCell({
  label, value, unit, hint, barAnim, color,
}: {
  label: string; value: string; unit: string; hint: string;
  barAnim: Animated.Value; color: string;
}) {
  const width = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.cell} accessible accessibilityRole="text" accessibilityLabel={`${label} ${value} ${unit}. ${hint}`}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellVal}>{value}</Text>
      <Text style={styles.cellUnit}>{unit}</Text>
      <Animated.View style={[styles.cellBar, { width, backgroundColor: color }]} importantForAccessibility="no" />
      <Text style={styles.cellHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 52,
    paddingHorizontal: 28,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(240,235,225,0.1)',
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 28,
    color: theme.colors.paper,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  updatedLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(240,235,225,0.55)',
  },
  updatedTime: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: 'rgba(240,235,225,0.6)',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.1)',
    marginTop: 28,
  },
  cell: {
    flex: 1,
    padding: 16,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(240,235,225,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  cellLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 8,
  },
  cellVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 26,
    color: theme.colors.paper,
    lineHeight: 26,
  },
  cellUnit: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: 'rgba(240,235,225,0.4)',
    marginTop: 3,
  },
  cellHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.55)',
    marginTop: 6,
    lineHeight: 14,
  },
  cellBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
  extraRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.1)',
  },
  extraCell: {
    flex: 1,
    padding: 14,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(240,235,225,0.1)',
  },
  extraVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 22,
    color: theme.colors.paper,
  },
  uvBlock: {
    padding: 18,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.1)',
  },
  uvVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 32,
    color: theme.colors.accent,
  },
  uvBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    backgroundColor: 'transparent',
    overflow: 'visible',
    // Gradient approximated with a background
    // In production use react-native-linear-gradient
    borderWidth: 0,
  },
  uvMarker: {
    position: 'absolute',
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: theme.colors.paper,
  },
  alertStrip: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(196,65,28,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,65,28,0.4)',
    borderRadius: 2,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertIcon: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 20,
    color: theme.colors.accent,
  },
  alertTitle: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.paper,
    letterSpacing: 0.2,
  },
  alertBody: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.7)',
    marginTop: 2,
  },
});
