import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES, DAYS, MONTHS } from '../utils/constants';
import { DailyInterval } from '../types/weather';

interface ForecastScreenProps {
  daily: DailyInterval[];
}

export function ForecastScreen({ daily }: ForecastScreenProps) {
  // Find temp range for bar normalization
  const allTemps = daily.flatMap(d => [d.values.temperatureMax, d.values.temperatureMin]);
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const range = maxTemp - minTemp || 1;

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
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Layer 03 · 7-Day</Text>
          <Text style={styles.title}>7 Days</Text>
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.legendText}>Hi</Text>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent2 }]} />
          <Text style={styles.legendText}>Lo</Text>
        </View>
      </View>

      {/* Column hints */}
      <View style={styles.colHints}>
        <Text style={styles.colHint}>Day</Text>
        <Text style={styles.colHint}></Text>
        <Text style={styles.colHint}>Temp range</Text>
        <Text style={styles.colHint}>Hi / Lo</Text>
        <Text style={styles.colHint}>Rain %</Text>
      </View>

      {/* Forecast rows */}
      <View style={styles.table}>
        {daily.map((day, index) => {
          const condition = WEATHER_CODES[day.values.weatherCode] || WEATHER_CODES[0];
          const barLeft = ((day.values.temperatureMin - minTemp) / range) * 100;
          const barWidth = ((day.values.temperatureMax - day.values.temperatureMin) / range) * 100;

          return (
            <TouchableOpacity key={day.startTime} style={styles.row} activeOpacity={0.7}>
              <View style={styles.dayCol}>
                <Text style={styles.fcDay}>{formatDay(day.startTime, index)}</Text>
                <Text style={styles.fcDaySm}>{formatDate(day.startTime)}</Text>
              </View>
              <Text style={styles.fcIcon}>{condition.icon}</Text>
              <View style={styles.barCell}>
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
                <Text style={styles.fcLo}> {Math.round(day.values.temperatureMin)}°</Text>
              </View>
              <Text style={styles.fcPrecip}>
                {day.values.precipitationProbability}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paperMid,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 52,
    paddingHorizontal: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.faint,
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 28,
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
  colHints: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 6,
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
  },
  colHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 7,
    color: theme.colors.faint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.faint,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  dayCol: {
    width: 76,
  },
  fcDay: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 16,
    color: theme.colors.ink,
  },
  fcDaySm: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
  },
  fcIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  barCell: {
    flex: 1,
    paddingHorizontal: 8,
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
    // Gradient approximation — use LinearGradient in production
    backgroundColor: theme.colors.accent,
  },
  tempsCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fcHi: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 17,
    color: theme.colors.accent,
  },
  fcLo: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.accent2,
    marginLeft: 4,
  },
  fcPrecip: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    width: 35,
    textAlign: 'right',
  },
});
