import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { TimelineInterval, WeatherValues, DailyInterval } from '../types/weather';
import { getStatusBarPadding, sw, ms, sh } from '../utils/responsive';

const ITEM_WIDTH = sw(58);

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
      return;
    }
    rowAnims.forEach(a => a.setValue(0));
    Animated.stagger(50,
      rowAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 90 })
      )
    ).start();
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
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  };

  const windDirText = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
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

            return (
              <View
                key={item.startTime}
                style={[styles.tapeItem, isNow && styles.tapeItemNow]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${formatHour(item.startTime, index)}, ${Math.round(item.values.temperature)} degrees, ${condition.label}, ${item.values.precipitationProbability} percent precipitation chance`}
              >
                <Text style={[styles.tapeHr, isNow && styles.tapeTextLight]}>
                  {formatHour(item.startTime, index)}
                </Text>
                <Text style={[styles.tapeTemp, isNow && styles.tapeTextLight]}>
                  {Math.round(item.values.temperature)}°
                </Text>
                <Text style={styles.tapeCond} importantForAccessibility="no">{condition.icon}</Text>
                <Text
                  style={[styles.tapeCondLabel, isNow && styles.tapeTextMuted]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {condition.label.length > 8 ? condition.label.split(' ')[0] : condition.label}
                </Text>
                {item.values.precipitationProbability > 0 && (
                  <Text style={[styles.tapePrecipVal, isNow && styles.tapeTextMuted]}>
                    💧{item.values.precipitationProbability}%
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 7-Day forecast rows */}
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

            const rowOpacity = rowAnims[index] || new Animated.Value(1);
            const rowTranslateY = rowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
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
                accessibilityLabel={`${formatDay(day.startTime, index)}, ${formatDate(day.startTime)}. ${condition.label}. High ${Math.round(day.values.temperatureMax)}, Low ${Math.round(day.values.temperatureMin)}. ${day.values.precipitationProbability} percent precipitation`}
              >
                <View style={styles.dayCol}>
                  <Text style={styles.fcDay}>{formatDay(day.startTime, index)}</Text>
                  <Text style={styles.fcDate}>{formatDate(day.startTime)}</Text>
                </View>
                <Text style={styles.fcIcon} importantForAccessibility="no">{condition.icon}</Text>
                <View style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { left: `${barLeft}%`, width: `${barWidth}%` },
                      ]}
                    />
                  </View>
                </View>
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
    paddingBottom: 12,
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
  },
  tape: {
    paddingHorizontal: sw(20),
  },
  tapeContent: {
    gap: 0,
    paddingRight: sw(20),
  },
  tapeItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: 10,
    borderRightWidth: 0.5,
    borderRightColor: theme.colors.faint,
  },
  tapeItemNow: {
    backgroundColor: theme.colors.ink,
    borderRadius: 4,
  },
  tapeHr: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tapeTemp: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 18,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  tapeTextLight: {
    color: theme.colors.paper,
  },
  tapeTextMuted: {
    color: 'rgba(240,235,225,0.5)',
  },
  tapeCond: {
    fontSize: 14,
    marginVertical: 2,
  },
  tapeCondLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    color: theme.colors.muted,
    letterSpacing: 0.3,
    textAlign: 'center',
    width: ITEM_WIDTH - 8,
  },
  tapePrecipVal: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    color: theme.colors.accent2,
    marginTop: 2,
  },

  /* --- Forecast --- */
  forecastSection: {
    flex: 1,
    paddingHorizontal: sw(20),
    justifyContent: 'center',
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  dayCol: {
    width: sw(60),
  },
  fcDay: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(13),
    color: theme.colors.ink,
  },
  fcDate: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: theme.colors.muted,
    marginTop: 1,
  },
  fcIcon: {
    fontSize: 18,
    width: sw(28),
    textAlign: 'center',
  },
  barCol: {
    flex: 1,
    paddingHorizontal: sw(8),
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
    gap: 4,
    minWidth: sw(52),
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
