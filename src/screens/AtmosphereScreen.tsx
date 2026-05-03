import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues, AirQuality } from '../types/weather';
import { ProOverlay } from '../components/ProBadge';
import { getStatusBarPadding, sw, ms } from '../utils/responsive';

interface AtmosphereScreenProps {
  weather: WeatherValues | null;
  airQuality?: AirQuality;
  dataTimestamp?: number;
}

const AQI_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Good', color: '#4caf50' },
  2: { label: 'Fair', color: '#8bc34a' },
  3: { label: 'Moderate', color: '#ff9800' },
  4: { label: 'Poor', color: '#f44336' },
  5: { label: 'Very Poor', color: '#9c27b0' },
};

export const AtmosphereScreen = React.memo(function AtmosphereScreen({ weather, airQuality, dataTimestamp }: AtmosphereScreenProps) {
  const barAnims = useRef([
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
      Math.max(0, Math.min(weather.dewPoint / 40, 1)),
      Math.min((weather.visibility || 0) / 20, 1),
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
          label="Dew Point"
          value={`${Math.round(weather?.dewPoint ?? 0)}°`}
          unit="°C"
          hint="Air must cool to this temp to form dew. Above 15° feels sticky."
          barAnim={barAnims[2]}
          color="rgba(240,235,225,0.4)"
          isLeft
        />
        <MetricCell
          label="Visibility"
          value={`${Math.round(weather?.visibility ?? 0)}`}
          unit="km"
          hint="How far you can see clearly right now."
          barAnim={barAnims[3]}
          color="rgba(240,235,225,0.4)"
          isLeft={false}
        />
      </View>

      {/* Precipitation & wind data strip */}
      {((weather?.rainVolume ?? 0) > 0 || (weather?.snowVolume ?? 0) > 0 || (weather?.windSpeed ?? 0) > 0) && (
        <View style={styles.dataStrip}>
          {(weather?.rainVolume ?? 0) > 0 && (
            <View style={styles.dataChip}>
              <Text style={styles.dataChipIcon}>R</Text>
              <Text style={styles.dataChipVal}>{weather!.rainVolume!.toFixed(1)} mm</Text>
              <Text style={styles.dataChipLabel}>Rain (1h)</Text>
            </View>
          )}
          {(weather?.snowVolume ?? 0) > 0 && (
            <View style={styles.dataChip}>
              <Text style={styles.dataChipIcon}>S</Text>
              <Text style={styles.dataChipVal}>{weather!.snowVolume!.toFixed(1)} mm</Text>
              <Text style={styles.dataChipLabel}>Snow (1h)</Text>
            </View>
          )}
          {(weather?.windSpeed ?? 0) > 0 && (
            <View style={styles.dataChip}>
              <Text style={styles.dataChipIcon}>W</Text>
              <Text style={styles.dataChipVal}>{Math.round((weather?.windSpeed ?? 0) * 3.6)} km/h</Text>
              <Text style={styles.dataChipLabel}>{getWindDir(weather?.windDirection ?? 0)}</Text>
            </View>
          )}
          {weather?.description ? (
            <View style={styles.dataChip}>
              <Text style={styles.dataChipIcon}>C</Text>
              <Text style={styles.dataChipVal}>{weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}</Text>
              <Text style={styles.dataChipLabel}>Condition</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Wind compass */}
      {(weather?.windSpeed ?? 0) > 0 && (
        <View style={styles.compassSection}>
          <View style={styles.compassContainer}>
            <View style={styles.compassRing}>
              <Text style={styles.compassN}>N</Text>
              <View style={[styles.compassNeedle, { transform: [{ rotate: `${weather?.windDirection ?? 0}deg` }] }]}>
                <View style={styles.needleArrow} />
              </View>
            </View>
            <Text style={styles.compassLabel}>
              {getWindDir(weather?.windDirection ?? 0)} · {Math.round((weather?.windSpeed ?? 0) * 3.6)} km/h
            </Text>
          </View>
        </View>
      )}

      {/* Wind gust alert */}
      {(weather?.windGust || 0) > 15 && (
        <View style={styles.alertStrip} accessible accessibilityRole="alert" accessibilityLabel={`Wind Advisory. Gusts to ${Math.round((weather?.windGust || 0) * 3.6)} kilometers per hour expected`}>
          <Text style={styles.alertIcon} importantForAccessibility="no">!</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Wind Advisory</Text>
            <Text style={styles.alertBody}>
              Gusts to {Math.round((weather?.windGust || 0) * 3.6)} km/h expected. Secure loose objects.
            </Text>
          </View>
        </View>
      )}

      {/* Air Quality Index */}
      {airQuality && (
        <View style={styles.aqiSection}>
          <Text style={styles.aqiTitle}>Air Quality</Text>
          <View style={styles.aqiRow}>
            <View style={[styles.aqiBadge, { backgroundColor: AQI_LABELS[airQuality.aqi]?.color ?? '#888' }]}>
              <Text style={styles.aqiBadgeNum}>{airQuality.aqi}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aqiLabel}>{AQI_LABELS[airQuality.aqi]?.label ?? 'Unknown'}</Text>
              <Text style={styles.aqiDetail}>
                PM2.5 {airQuality.pm2_5.toFixed(1)} · PM10 {airQuality.pm10.toFixed(1)} · O₃ {airQuality.o3.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Data freshness */}
      {dataTimestamp && (
        <Text style={styles.freshnessText}>
          {(() => {
            const ago = Math.round((Date.now() - dataTimestamp) / 60000);
            if (ago < 1) return 'Data updated just now';
            if (ago === 1) return 'Data updated 1 min ago';
            if (ago < 60) return `Data updated ${ago} min ago`;
            return `Data updated ${Math.floor(ago / 60)}h ago`;
          })()}
        </Text>
      )}
    </ScrollView>
  );
});

function getWindDir(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8] + ' wind';
}

function MetricCell({
  label, value, unit, hint, barAnim, color, isLeft, valueColor, isPro,
}: {
  label: string; value: string; unit: string; hint: string;
  barAnim: Animated.Value; color: string; isLeft: boolean; valueColor?: string; isPro?: boolean;
}) {
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const content = (
    <>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellVal, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      <Text style={styles.cellUnit}>{unit}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} importantForAccessibility="no" />
      </View>
      <Text style={styles.cellHint}>{hint}</Text>
    </>
  );

  return (
    <View
      style={[styles.cell, isLeft ? styles.cellLeft : styles.cellRight]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={isPro ? `${label}. Upgrade to Pro to unlock.` : `${label} ${value} ${unit}. ${hint}`}
    >
      {isPro ? <ProOverlay dark force>{content}</ProOverlay> : content}
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
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
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
    paddingHorizontal: sw(20),
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
    fontSize: ms(30),
    color: theme.colors.paper,
    lineHeight: ms(32),
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
    marginHorizontal: sw(22),
    marginTop: 20,
    backgroundColor: 'rgba(196,65,28,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,65,28,0.35)',
    borderRadius: 4,
    padding: sw(14),
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

  /* ---- Data strip (rain/snow/wind/description) ---- */
  dataStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: sw(22),
    marginTop: 20,
    gap: 10,
  },
  dataChip: {
    backgroundColor: 'rgba(240,235,225,0.06)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: sw(70),
  },
  dataChipIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  dataChipVal: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 13,
    color: theme.colors.paper,
    letterSpacing: 0.3,
  },
  dataChipLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: 'rgba(240,235,225,0.45)',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  /* ---- Wind compass ---- */
  compassSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: sw(22),
    marginTop: 24,
    backgroundColor: 'rgba(240,235,225,0.06)',
    borderRadius: 12,
    padding: 16,
  },
  compassContainer: {
    alignItems: 'center',
  },
  compassRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(240,235,225,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassN: {
    position: 'absolute',
    top: 2,
    fontFamily: theme.fonts.monoBold,
    fontSize: 8,
    color: theme.colors.paper,
    opacity: 0.6,
  },
  compassNeedle: {
    width: 2,
    height: 28,
    alignItems: 'center',
  },
  needleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.accent,
  },
  compassLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.6)',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  /* ---- AQI section ---- */
  aqiSection: {
    marginHorizontal: sw(22),
    marginTop: 24,
    backgroundColor: 'rgba(240,235,225,0.06)',
    borderRadius: 12,
    padding: 16,
  },
  aqiTitle: {
    fontFamily: theme.fonts.serifBold,
    fontSize: 14,
    color: theme.colors.paper,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  aqiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aqiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aqiBadgeNum: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 18,
    color: '#fff',
  },
  aqiLabel: {
    fontFamily: theme.fonts.serifBold,
    fontSize: 15,
    color: theme.colors.paper,
  },
  aqiDetail: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.55)',
    letterSpacing: 0.3,
    marginTop: 3,
  },

  /* ---- Freshness ---- */
  freshnessText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.35)',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
