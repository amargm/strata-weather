import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { TimelineInterval, WeatherValues, DailyInterval } from '../types/weather';
import { getStatusBarPadding, sw, ms, sh } from '../utils/responsive';

const { height: SCREEN_H } = Dimensions.get('window');
const ITEM_WIDTH = sw(62);

interface HourlyScreenProps {
  hourly: TimelineInterval[];
  currentWind: WeatherValues | null;
  daily: DailyInterval[];
}

export const HourlyScreen = React.memo(function HourlyScreen({ hourly, currentWind, daily }: HourlyScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Forecast bar range
  const { minTemp, range } = React.useMemo(() => {
    const allTemps = daily.flatMap(d => [d.values.temperatureMax, d.values.temperatureMin]);
    const min = Math.min(...allTemps);
    const max = Math.max(...allTemps);
    return { minTemp: min, range: max - min || 1 };
  }, [daily]);

  // Staggered row animations for forecast
  const rowAnims = useRef(daily.map(() => new Animated.Value(0))).current;
  // Bar fill animations
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
    rowAnims.forEach(a => a.setValue(0));
    barAnims.forEach(a => a.setValue(0));

    Animated.stagger(60,
      rowAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 85 })
      )
    ).start();

    // Delayed bar fill animation
    Animated.sequence([
      Animated.delay(300),
      Animated.stagger(80,
        barAnims.map(anim =>
          Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false })
        )
      ),
    ]).start();
  }, [daily, reduceMotion]);

  const formatHour = (iso: string, index: number) => {
    if (index === 0) return 'NOW';
    const d = new Date(iso);
    const h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}${ampm}`;
  };

  const formatDay = (iso: string, index: number) => {
    if (index === 0) return 'Today';
    const d = new Date(iso);
    return DAYS[d.getDay()];
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  const windDirText = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  /** Short condition label for forecast rows */
  const shortCondition = (label: string) => {
    if (label.length <= 10) return label;
    // "Mostly Cloudy" → "M. Cloudy", "Light Rain" → "Lt. Rain"
    return label
      .replace('Mostly ', 'M. ')
      .replace('Partly ', 'P. ')
      .replace('Light ', 'Lt. ')
      .replace('Heavy ', 'Hv. ')
      .replace('Freezing ', 'Fr. ');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 02 · Timeline</Text>
          <Text style={styles.title}>Hours & Days</Text>
        </View>
        <View style={styles.windBadge}>
          <Text style={styles.windBadgeVal}>
            {Math.round((currentWind?.windSpeed ?? 0) * 3.6)}
          </Text>
          <Text style={styles.windBadgeUnit}>km/h {windDirText(currentWind?.windDirection ?? 0)}</Text>
        </View>
      </View>

      {/* Compact hourly tape */}
      <View style={styles.tapeSection}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tapeContent}
          style={styles.tape}
          accessibilityRole="list"
          accessibilityLabel="Hourly forecast timeline"
        >
          {hourly.map((item, index) => {
            const code = item.values.weatherCode;
            const condition = WEATHER_CODES[code] || WEATHER_CODES[1000];
            const isNow = index === 0;
            const precip = item.values.precipitationProbability;

            return (
              <View
                key={item.startTime}
                style={[styles.tapeItem, isNow && styles.tapeItemNow]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${formatHour(item.startTime, index)}, ${Math.round(item.values.temperature)} degrees, ${condition.label}, ${precip} percent precipitation chance`}
              >
                <Text style={[styles.tapeHr, isNow && styles.tapeTextLight]}>
                  {formatHour(item.startTime, index)}
                </Text>
                <Text style={styles.tapeCond} importantForAccessibility="no">{condition.icon}</Text>
                <Text style={[styles.tapeTemp, isNow && styles.tapeTextLight]}>
                  {Math.round(item.values.temperature)}°
                </Text>
                {precip > 0 && (
                  <View style={[styles.tapePrecipBadge, isNow && styles.tapePrecipBadgeNow]}>
                    <Text style={[styles.tapePrecipVal, isNow && styles.tapeTextMuted]}>
                      💧{precip}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Forecast section */}
      <View style={styles.forecastSection}>
        <View style={styles.forecastHeader}>
          <Text style={styles.forecastTitle}>{daily.length}-Day Forecast</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.legendText}>Hi</Text>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.accent2 }]} />
            <Text style={styles.legendText}>Lo</Text>
          </View>
        </View>

        <View style={styles.table}>
          {daily.map((day, index) => {
            const condition = WEATHER_CODES[day.values.weatherCode] || WEATHER_CODES[1000];
            const barLeft = ((day.values.temperatureMin - minTemp) / range) * 100;
            const barWidth = ((day.values.temperatureMax - day.values.temperatureMin) / range) * 100;
            const precip = day.values.precipitationProbability;

            const rowOpacity = rowAnims[index] || new Animated.Value(1);
            const rowTranslateY = rowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            });
            const barScale = barAnims[index] || new Animated.Value(1);

            return (
              <Animated.View
                key={day.startTime}
                style={[
                  styles.row,
                  index === daily.length - 1 && styles.rowLast,
                  {
                    opacity: rowOpacity,
                    transform: [{ translateY: rowTranslateY }],
                  },
                ]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${formatDay(day.startTime, index)}, ${formatDate(day.startTime)}. ${condition.label}. High ${Math.round(day.values.temperatureMax)}, Low ${Math.round(day.values.temperatureMin)}.${precip > 0 ? ` ${precip} percent precipitation.` : ''}`}
              >
                {/* Day + date */}
                <View style={styles.dayCol}>
                  <Text style={styles.fcDay}>{formatDay(day.startTime, index)}</Text>
                  <Text style={styles.fcDate}>{formatDate(day.startTime)}</Text>
                </View>

                {/* Icon + condition */}
                <View style={styles.condCol}>
                  <Text style={styles.fcIcon} importantForAccessibility="no">{condition.icon}</Text>
                  <Text style={styles.fcCondLabel} numberOfLines={1}>{shortCondition(condition.label)}</Text>
                </View>

                {/* Precip badge */}
                <View style={styles.precipCol}>
                  {precip > 0 ? (
                    <View style={styles.fcPrecipBadge}>
                      <Text style={styles.fcPrecipText}>💧{precip}%</Text>
                    </View>
                  ) : null}
                </View>

                {/* Temperature bar */}
                <View style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          left: `${barLeft}%`,
                          width: barScale.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', `${barWidth}%`],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Temps */}
                <View style={styles.tempsCol}>
                  <Text style={styles.fcHi}>{Math.round(day.values.temperatureMax)}°</Text>
                  <Text style={styles.fcLo}>{Math.round(day.values.temperatureMin)}°</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paperDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
    paddingBottom: sh(10),
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(24),
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
  windBadge: {
    alignItems: 'flex-end',
  },
  windBadgeVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(18),
    color: theme.colors.ink,
  },
  windBadgeUnit: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
  },

  /* --- Tape --- */
  tapeSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
    paddingBottom: sh(2),
  },
  tape: {
    paddingHorizontal: sw(16),
  },
  tapeContent: {
    gap: 0,
    paddingRight: sw(16),
  },
  tapeItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: sh(10),
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: theme.colors.faint,
  },
  tapeItemNow: {
    backgroundColor: theme.colors.ink,
    borderRadius: 6,
  },
  tapeHr: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  tapeTemp: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(17),
    color: theme.colors.ink,
    lineHeight: ms(19),
    marginTop: 4,
  },
  tapeTextLight: {
    color: theme.colors.paper,
  },
  tapeTextMuted: {
    color: 'rgba(240,235,225,0.5)',
  },
  tapeCond: {
    fontSize: 16,
    marginBottom: 1,
  },
  tapePrecipBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(28,93,196,0.08)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tapePrecipBadgeNow: {
    backgroundColor: 'rgba(28,93,196,0.2)',
  },
  tapePrecipVal: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    color: theme.colors.accent2,
  },

  /* --- Forecast --- */
  forecastSection: {
    flex: 1,
    paddingHorizontal: sw(20),
    justifyContent: 'center',
    paddingVertical: sh(8),
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sh(6),
    paddingHorizontal: sw(4),
  },
  forecastTitle: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  table: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sh(9),
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dayCol: {
    width: sw(52),
  },
  fcDay: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(13),
    color: theme.colors.ink,
  },
  fcDate: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    letterSpacing: 0.5,
    color: theme.colors.muted,
    marginTop: 1,
  },
  condCol: {
    alignItems: 'center',
    width: sw(44),
  },
  fcIcon: {
    fontSize: 18,
    textAlign: 'center',
  },
  fcCondLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    color: theme.colors.muted,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 1,
  },
  precipCol: {
    width: sw(38),
    alignItems: 'center',
  },
  fcPrecipBadge: {
    backgroundColor: 'rgba(28,93,196,0.08)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  fcPrecipText: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    color: theme.colors.accent2,
  },
  barCol: {
    flex: 1,
    paddingHorizontal: sw(6),
  },
  barTrack: {
    height: 5,
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
  tempsCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    minWidth: sw(48),
    justifyContent: 'flex-end',
  },
  fcHi: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(14),
    color: theme.colors.accent,
  },
  fcLo: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.accent2,
  },
});
