import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { TimelineInterval, WeatherValues, DailyInterval } from '../types/weather';
import { getStatusBarPadding, sw, ms, sh } from '../utils/responsive';

const ITEM_WIDTH = sw(64);

/** Generate a poetic forecast summary from hourly + daily data */
function getForecastSummary(hourly: TimelineInterval[], daily: DailyInterval[]): string {
  if (!hourly.length && !daily.length) return '';

  const nextRainHour = hourly.findIndex(
    (h, i) => i > 0 && h.values.precipitationProbability > 40,
  );
  const todayHi = daily[0]?.values.temperatureMax;
  const todayLo = daily[0]?.values.temperatureMin;
  const tomorrowCode = daily[1]?.values.weatherCode;
  const tomorrowCond = tomorrowCode ? WEATHER_CODES[tomorrowCode]?.label : null;

  // Rain incoming within 6 hours
  if (nextRainHour > 0 && nextRainHour <= 6) {
    const hrs = nextRainHour;
    return `Rain likely in ${hrs === 1 ? 'about an hour' : `${hrs} hours`}. Plan accordingly.`;
  }

  // Big temp swing today
  if (todayHi != null && todayLo != null && todayHi - todayLo > 12) {
    return `A ${Math.round(todayHi - todayLo)}° swing today — dress in layers.`;
  }

  // Tomorrow changes
  if (tomorrowCond) {
    const todayCode = daily[0]?.values.weatherCode || 1000;
    const todayCond = WEATHER_CODES[todayCode]?.label || 'Clear';
    if (tomorrowCond !== todayCond) {
      return `Tomorrow shifts to ${tomorrowCond.toLowerCase()}. Today, ${todayCond.toLowerCase()}.`;
    }
  }

  // Dry streak
  const dryDays = daily.filter(d => d.values.precipitationProbability < 20).length;
  if (dryDays >= 5) {
    return `${dryDays} dry days ahead. The sky is in a generous mood.`;
  }

  // Fallback
  if (todayHi != null && todayHi > 30) return 'A hot stretch ahead. Keep water close.';
  if (todayLo != null && todayLo < 5) return 'Cold nights coming. The forecast says bundle up.';
  return 'The week ahead looks settled. No surprises on the horizon.';
}

interface HourlyScreenProps {
  hourly: TimelineInterval[];
  currentWind: WeatherValues | null;
  daily: DailyInterval[];
}

export const HourlyScreen = React.memo(function HourlyScreen({ hourly, currentWind, daily }: HourlyScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  const forecastSummary = React.useMemo(
    () => getForecastSummary(hourly, daily),
    [hourly, daily],
  );

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
                style={[styles.tapeItem, isNow && styles.tapeItemNow, item.values.isNight && styles.tapeItemNight]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${formatHour(item.startTime, index)}, ${Math.round(item.values.temperature)} degrees, ${condition.label}, ${precip} percent precipitation chance${item.values.isNight ? ', nighttime' : ''}`}
              >
                <Text style={[styles.tapeHr, isNow && styles.tapeTextLight]}>
                  {formatHour(item.startTime, index)}
                </Text>
                {item.values.isNight && !isNow && <Text style={styles.tapeNightIcon}>○</Text>}
                <Text style={styles.tapeCond} importantForAccessibility="no">{condition.icon}</Text>
                <Text style={[styles.tapeTemp, isNow && styles.tapeTextLight]}>
                  {Math.round(item.values.temperature)}°
                </Text>
                {precip > 0 && (
                  <View style={styles.tapePrecipBar}>
                    <View style={[styles.tapePrecipFill, { height: `${Math.min(precip, 100)}%` }]} />
                  </View>
                )}
                {precip > 0 && (
                  <Text style={[styles.tapePrecip, isNow && styles.tapePrecipLight]}>
                    {precip}%
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Section break */}
      <View style={styles.sectionBreak}>
        <View style={styles.breakLine} />
      </View>

      {/* Forecast */}
      <View style={styles.forecastSection}>
        <View style={styles.forecastHeader}>
          <Text style={styles.forecastTitle}>{daily.length}-Day Forecast</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.accent2 }]} />
            <Text style={styles.legendText}>Lo</Text>
            <View style={styles.legendSpacer} />
            <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.legendText}>Hi</Text>
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
                  <Text style={[styles.fcDay, index === 0 && styles.fcDayToday]}>{formatDay(day.startTime, index)}</Text>
                  <Text style={styles.fcDate}>{formatDate(day.startTime)}</Text>
                </View>

                {/* Icon */}
                <Text style={styles.fcIcon} importantForAccessibility="no">{condition.icon}</Text>

                {/* Lo temp */}
                <Text style={styles.fcLo}>{Math.round(day.values.temperatureMin)}°</Text>

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

                {/* Hi temp */}
                <Text style={styles.fcHi}>{Math.round(day.values.temperatureMax)}°</Text>

                {/* Precip */}
                <View style={styles.precipCol}>
                  {precip > 0 ? (
                    <Text style={styles.fcPrecip}>{precip}%</Text>
                  ) : null}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Forecast summary */}
        {forecastSummary ? (
          <Text style={styles.forecastSummary}>{forecastSummary}</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paperDark,
  },

  /* --- Header --- */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: getStatusBarPadding(),
    paddingHorizontal: sw(28),
    paddingBottom: sh(12),
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(24),
    color: theme.colors.ink,
    marginTop: 4,
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
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
    paddingBottom: sh(4),
  },
  tape: {
    paddingHorizontal: sw(20),
  },
  tapeContent: {
    gap: sw(4),
    paddingRight: sw(20),
  },
  tapeItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingVertical: sh(12),
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: theme.colors.faint,
  },
  tapeItemNow: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  tapeItemNight: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(15,14,12,0.15)',
  },
  tapeNightIcon: {
    fontSize: 10,
    marginBottom: 2,
    opacity: 0.6,
  },
  tapeHr: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tapeTemp: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(18),
    color: theme.colors.ink,
    marginTop: 5,
  },
  tapeTextLight: {
    color: theme.colors.paper,
  },
  tapeCond: {
    fontSize: 20,
  },
  tapePrecip: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    color: theme.colors.accent2,
    marginTop: 3,
  },
  tapePrecipBar: {
    width: 4,
    height: 20,
    backgroundColor: 'rgba(28,93,196,0.1)',
    borderRadius: 0,
    marginTop: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tapePrecipFill: {
    width: '100%',
    backgroundColor: theme.colors.accent2,
    borderRadius: 0,
  },
  tapePrecipLight: {
    color: 'rgba(240,235,225,0.55)',
  },

  /* --- Section break --- */
  sectionBreak: {
    alignItems: 'center',
    paddingVertical: sh(10),
  },
  breakLine: {
    width: sw(32),
    height: 1,
    backgroundColor: theme.colors.faint,
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
    marginBottom: sh(8),
    paddingHorizontal: sw(6),
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
    gap: 4,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legendSpacer: {
    width: 6,
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
    paddingVertical: sh(10),
    paddingHorizontal: sw(6),
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dayCol: {
    width: sw(56),
  },
  fcDay: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(13),
    color: theme.colors.ink,
  },
  fcDayToday: {
    color: theme.colors.accent,
  },
  fcDate: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    letterSpacing: 0.5,
    color: theme.colors.muted,
    marginTop: 1,
  },
  fcIcon: {
    fontSize: 18,
    width: sw(28),
    textAlign: 'center',
  },
  fcLo: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.accent2,
    width: sw(30),
    textAlign: 'right',
    marginRight: sw(6),
  },
  barCol: {
    flex: 1,
  },
  barTrack: {
    height: 4,
    borderRadius: 0,
    backgroundColor: theme.colors.faint,
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 0,
    backgroundColor: theme.colors.accent,
  },
  fcHi: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(13),
    color: theme.colors.accent,
    width: sw(30),
    textAlign: 'left',
    marginLeft: sw(6),
  },
  precipCol: {
    width: sw(34),
    alignItems: 'flex-end',
  },
  fcPrecip: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    color: theme.colors.accent2,
  },
  forecastSummary: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: ms(13),
    lineHeight: ms(19),
    color: theme.colors.muted,
    textAlign: 'center',
    paddingHorizontal: sw(16),
    marginTop: sh(10),
  },
});
