import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { DailyInterval } from '../types/weather';
import { getStatusBarPadding, sw, ms, sh } from '../utils/responsive';

interface ForecastScreenProps {
  daily: DailyInterval[];
}

export const ForecastScreen = React.memo(function ForecastScreen({ daily }: ForecastScreenProps) {
  // Find temp range for bar normalization
  const { minTemp, maxTemp, range } = React.useMemo(() => {
    const allTemps = daily.flatMap(d => [d.values.temperatureMax, d.values.temperatureMin]);
    const min = Math.min(...allTemps);
    const max = Math.max(...allTemps);
    return { minTemp: min, maxTemp: max, range: max - min || 1 };
  }, [daily]);

  // Staggered entrance animations
  const rowAnims = useRef(daily.map(() => new Animated.Value(0))).current;
  const barAnims = useRef(daily.map(() => new Animated.Value(0))).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!daily.length) return;
    if (reduceMotion) {
      rowAnims.forEach(a => a.setValue(1));
      barAnims.forEach(a => a.setValue(1));
      return;
    }
    // Reset
    rowAnims.forEach(a => a.setValue(0));
    barAnims.forEach(a => a.setValue(0));
    // Stagger rows flowing in
    Animated.stagger(70,
      rowAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 90 })
      )
    ).start();
    // Bars animate after rows settle
    setTimeout(() => {
      Animated.stagger(60,
        barAnims.map(anim =>
          Animated.spring(anim, { toValue: 1, useNativeDriver: false, damping: 16, stiffness: 80 })
        )
      ).start();
    }, 200);
  }, [daily, reduceMotion]);

  const formatDay = (iso: string, index: number) => {
    if (index === 0) return 'Today';
    const d = new Date(iso);
    return DAYS[d.getDay()];
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 03 · {daily.length}-Day</Text>
          <Text style={styles.title}>{daily.length} Days</Text>
        </View>
        <View style={styles.legend} accessible accessibilityLabel="Legend: red dot is high temperature, blue dot is low temperature">
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.legendText}>Hi</Text>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent2 }]} />
          <Text style={styles.legendText}>Lo</Text>
        </View>
      </View>

      {/* Forecast rows — spread vertically */}
      <View style={styles.table} accessibilityRole="list">
        {daily.map((day, index) => {
          const condition = WEATHER_CODES[day.values.weatherCode] || WEATHER_CODES[1000];
          const barLeft = ((day.values.temperatureMin - minTemp) / range) * 100;
          const barWidth = ((day.values.temperatureMax - day.values.temperatureMin) / range) * 100;

          const rowOpacity = rowAnims[index] || new Animated.Value(1);
          const rowTranslateY = rowOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [40, 0],
          });
          const barAnimWidth = (barAnims[index] || new Animated.Value(1)).interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${barWidth}%`],
          });

          return (
            <Animated.View
              key={day.startTime}
              style={[
                styles.row,
                {
                  opacity: rowOpacity,
                  transform: [{ translateY: rowTranslateY }],
                },
              ]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${formatDay(day.startTime, index)}, ${formatDate(day.startTime)}. ${condition.label}. High ${Math.round(day.values.temperatureMax)} degrees, Low ${Math.round(day.values.temperatureMin)} degrees. ${day.values.precipitationProbability} percent precipitation`}
            >
              {/* Left: Day + icon */}
              <View style={styles.daySection}>
                <Text style={styles.fcDay}>{formatDay(day.startTime, index)}</Text>
                <Text style={styles.fcDaySm}>{formatDate(day.startTime)}</Text>
              </View>

              <Text style={styles.fcIcon} importantForAccessibility="no">{condition.icon}</Text>

              {/* Center: Temp bar */}
              <View style={styles.barSection} importantForAccessibility="no">
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        left: `${barLeft}%`,
                        width: barAnimWidth as any,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Right: Temps + precip */}
              <View style={styles.rightSection}>
                <View style={styles.tempsRow}>
                  <Text style={styles.fcHi}>{Math.round(day.values.temperatureMax)}°</Text>
                  <Text style={styles.fcLo}>{Math.round(day.values.temperatureMin)}°</Text>
                </View>
                {day.values.precipitationProbability > 0 && (
                  <Text style={styles.fcPrecip}>
                    💧 {day.values.precipitationProbability}%
                  </Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paperMid,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
    paddingBottom: sh(16),
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(28),
    color: theme.colors.ink,
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  table: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sw(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(12),
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
  },
  daySection: {
    width: sw(72),
  },
  fcDay: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(15),
    color: theme.colors.ink,
  },
  fcDaySm: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
    marginTop: 2,
  },
  fcIcon: {
    fontSize: 22,
    width: sw(32),
    textAlign: 'center',
  },
  barSection: {
    flex: 1,
    paddingHorizontal: sw(10),
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.faint,
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: sw(60),
  },
  tempsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  fcHi: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(17),
    color: theme.colors.accent,
  },
  fcLo: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.accent2,
  },
  fcPrecip: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.accent2,
    marginTop: 2,
  },
});
