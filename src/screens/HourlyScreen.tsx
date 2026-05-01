import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { theme } from '../utils/theme';
import { WEATHER_CODES } from '../utils/constants';
import { TimelineInterval, WeatherValues } from '../types/weather';

const ITEM_WIDTH = 68;

const WIND_DIR_FULL: Record<string, string> = {
  N: 'North', NNE: 'North-northeast', NE: 'Northeast', ENE: 'East-northeast',
  E: 'East', ESE: 'East-southeast', SE: 'Southeast', SSE: 'South-southeast',
  S: 'South', SSW: 'South-southwest', SW: 'Southwest', WSW: 'West-southwest',
  W: 'West', WNW: 'West-northwest', NW: 'Northwest', NNW: 'North-northwest',
};

interface HourlyScreenProps {
  hourly: TimelineInterval[];
  currentWind: WeatherValues | null;
}

export const HourlyScreen = React.memo(function HourlyScreen({ hourly, currentWind }: HourlyScreenProps) {
  const scrollRef = useRef<ScrollView>(null);

  const formatHour = (iso: string, index: number) => {
    if (index === 0) return 'NOW';
    const d = new Date(iso);
    const h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}${ampm}`;
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
          <Text style={styles.eyebrow}>Layer 02 · Hourly</Text>
          <Text style={styles.title}>Hourly</Text>
        </View>
        <Text style={styles.subtitle}>Next {hourly.length} hours →</Text>
      </View>

      {/* Tape timeline */}
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
              <Text style={[styles.tapeCondLabel, isNow && styles.tapeTextMuted]} numberOfLines={1}>
                {condition.label}
              </Text>
              <View style={styles.tapePrecip}>
                <View style={styles.tapePrecipBarWrap}>
                  <View
                    style={[
                      styles.tapePrecipBar,
                      { height: `${item.values.precipitationProbability}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.tapePrecipVal, isNow && styles.tapeTextMuted]}>
                  {item.values.precipitationProbability}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Details area — fills remaining vertical space */}
      <View style={styles.detailsArea}>
        {/* Wind section — 2 columns */}
        <View style={styles.windRibbon} accessible accessibilityRole="text" accessibilityLabel={`Wind sustained ${Math.round((currentWind?.windSpeed ?? 0) * 3.6)} kilometers per hour, direction ${WIND_DIR_FULL[windDirText(currentWind?.windDirection ?? 0)] || windDirText(currentWind?.windDirection ?? 0)} ${Math.round(currentWind?.windDirection ?? 0)} degrees${(currentWind?.windGust ?? 0) > 0 ? `, gusts to ${Math.round((currentWind?.windGust ?? 0) * 3.6)} kilometers per hour` : ''}`} accessibilityLiveRegion="polite">
          <View style={styles.windMain}>
            <Text style={styles.windLabelSm}>Wind · Sustained</Text>
            <Text style={styles.windBig}>
              {Math.round((currentWind?.windSpeed ?? 0) * 3.6)}
              <Text style={styles.windUnitSm}> km/h</Text>
            </Text>
            <Text style={styles.windHint}>Average wind speed at 10 m height</Text>
          </View>
          <View style={styles.windSide}>
            <Text style={styles.windDirLabel}>Direction</Text>
            <Text style={styles.windDirBig}>
              {windDirText(currentWind?.windDirection ?? 0)}
            </Text>
            <Text style={styles.windDirDeg}>{Math.round(currentWind?.windDirection ?? 0)}°</Text>
            {(currentWind?.windGust ?? 0) > 0 && (
              <Text style={styles.windGust}>
                ▲ Gusts {Math.round((currentWind?.windGust ?? 0) * 3.6)} km/h
              </Text>
            )}
          </View>
        </View>

        {/* Precipitation outlook */}
        <View style={styles.precipOutlook} accessible accessibilityRole="text" accessibilityLabel={`Precipitation outlook. ${hourly[0]?.values.precipitationProbability ?? 0} percent now. ${(hourly[3]?.values.precipitationProbability ?? 0) > (hourly[0]?.values.precipitationProbability ?? 0) ? 'Rising' : (hourly[3]?.values.precipitationProbability ?? 0) < (hourly[0]?.values.precipitationProbability ?? 0) ? 'Dropping' : 'Holding'} to ${hourly[3]?.values.precipitationProbability ?? 0} percent by ${hourly[3] ? formatHour(hourly[3].startTime, 3) : 'unknown'}`}>
          <Text style={styles.precipLabel}>Precipitation Outlook</Text>
          <Text style={styles.windHint}>Chance of precipitation in your area</Text>
          <Text style={styles.precipText}>
            {hourly[0]?.values.precipitationProbability ?? 0}% chance this hour.{' '}
            {(() => {
              const now = hourly[0]?.values.precipitationProbability ?? 0;
              const later = hourly[3]?.values.precipitationProbability ?? 0;
              const trend = later > now ? 'Rising to' : later < now ? 'Dropping to' : 'Holding at';
              return `${trend} ${later}% by ${hourly[3] ? formatHour(hourly[3].startTime, 3) : '--'}.`;
            })()}
          </Text>
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
    paddingTop: 52,
    paddingHorizontal: 28,
    paddingBottom: 20,
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
  subtitle: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  tape: {
    paddingHorizontal: 28,
  },
  tapeContent: {
    gap: 0,
  },
  tapeItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
    borderRightWidth: 0.5,
    borderRightColor: theme.colors.faint,
  },
  tapeItemNow: {
    backgroundColor: theme.colors.ink,
  },
  tapeHr: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tapeTemp: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 22,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  tapeTextLight: {
    color: theme.colors.paper,
  },
  tapeTextMuted: {
    color: 'rgba(240,235,225,0.5)',
  },
  tapeCond: {
    fontSize: 18,
    marginVertical: 4,
  },
  tapeCondLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    color: theme.colors.muted,
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  tapePrecip: {
    alignItems: 'center',
    gap: 2,
    marginTop: 'auto' as any,
    paddingBottom: 10,
  },
  tapePrecipBarWrap: {
    width: 3,
    height: 28,
    backgroundColor: theme.colors.faint,
    borderRadius: 2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tapePrecipBar: {
    width: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.accent2,
  },
  tapePrecipVal: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  detailsArea: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  windRibbon: {
    marginHorizontal: 28,
    backgroundColor: theme.colors.faint,
    borderRadius: 2,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  windMain: {
    flex: 1,
  },
  windSide: {
    alignItems: 'center',
    paddingLeft: 18,
    borderLeftWidth: 0.5,
    borderLeftColor: theme.colors.faint,
    minWidth: 80,
  },
  windDirLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  windDirBig: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 28,
    color: theme.colors.ink,
  },
  windDirDeg: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 2,
  },
  windLabelSm: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  windBig: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 36,
    color: theme.colors.ink,
    lineHeight: 36,
  },
  windUnitSm: {
    fontSize: 12,
    fontFamily: theme.fonts.mono,
    color: theme.colors.muted,
  },

  windGust: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: theme.colors.accent,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  windHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(15,14,12,0.45)',
    marginTop: 3,
  },
  precipOutlook: {
    marginHorizontal: 28,
    marginTop: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent2,
    backgroundColor: 'rgba(28,93,196,0.06)',
  },
  precipLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  precipText: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 15,
    color: theme.colors.ink,
  },
});
