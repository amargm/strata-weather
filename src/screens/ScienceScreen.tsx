import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues, DailyInterval } from '../types/weather';

interface ScienceScreenProps {
  weather: WeatherValues | null;
  today: DailyInterval | null;
}

export function ScienceScreen({ weather, today }: ScienceScreenProps) {
  const uvIndex = weather?.uvIndex || 0;
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Layer 04 · Deep Data</Text>
        <Text style={styles.title}>Science & Extremes</Text>
      </View>

      {/* Science grid */}
      <View style={styles.grid}>
        {/* UV */}
        <View style={styles.block}>
          <Text style={styles.label}>UV Index</Text>
          <Text style={[styles.val, { color: theme.colors.accent }]}>{uvIndex}</Text>
          <Text style={styles.unit}>{uvLabel}</Text>
          <View style={styles.uvBar}>
            <View style={[styles.uvMarker, { left: `${(uvIndex / 11) * 100}%` }]} />
          </View>
          <Text style={styles.sub}>SPF 15+ recommended 10–14h</Text>
        </View>

        {/* Pressure trend */}
        <View style={styles.block}>
          <Text style={styles.label}>Pressure</Text>
          <Text style={styles.val}>{Math.round(weather?.pressureSurfaceLevel || 0)}</Text>
          <Text style={styles.unit}>hPa · Steady</Text>
          <Text style={styles.sub}>Current surface level reading</Text>
        </View>

        {/* Wet-bulb */}
        <View style={styles.block}>
          <Text style={styles.label}>Wet-bulb Temp</Text>
          <Text style={styles.val}>{Math.round((weather?.dewPoint || 0) + 2)}°</Text>
          <Text style={styles.unit}>°C</Text>
          <Text style={styles.sub}>
            Dew point {Math.round(weather?.dewPoint || 0)}°C{'\n'}
            Feels {Math.round(weather?.temperatureApparent || 0)}° — 
            {(weather?.temperatureApparent || 0) < 18 ? ' comfortable' : ' warm'}
          </Text>
        </View>

        {/* Humidity */}
        <View style={styles.block}>
          <Text style={styles.label}>Humidity</Text>
          <Text style={[styles.val, { color: theme.colors.accent2 }]}>
            {weather?.humidity || 0}
          </Text>
          <Text style={styles.unit}>%</Text>
          <Text style={styles.sub}>
            Cloud cover {weather?.cloudCover || 0}%{'\n'}
            Visibility {weather?.visibility || '--'} km
          </Text>
        </View>
      </View>

      {/* Sun strip */}
      <View style={styles.sunStrip}>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Sunrise</Text>
          <Text style={styles.sunVal}>{sunrise}</Text>
        </View>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Sunset</Text>
          <Text style={styles.sunVal}>{sunset}</Text>
        </View>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Daylight</Text>
          <Text style={[styles.sunVal, { color: 'rgba(240,200,80,0.9)', fontSize: 15 }]}>
            {daylightStr}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 28,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(240,235,225,0.1)',
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.3)',
    marginBottom: 6,
  },
  title: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 28,
    color: theme.colors.paper,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  block: {
    width: '50%',
    padding: 18,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(240,235,225,0.08)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(240,235,225,0.08)',
  },
  label: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.3)',
    marginBottom: 10,
  },
  val: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 32,
    color: theme.colors.paper,
    lineHeight: 32,
  },
  unit: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.4)',
    marginTop: 2,
  },
  sub: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.4)',
    marginTop: 6,
    lineHeight: 14,
  },
  uvBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    position: 'relative',
    overflow: 'visible',
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
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.1)',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    marginTop: 20,
  },
  sunCol: {
    alignItems: 'center',
  },
  sunLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.3)',
    marginBottom: 4,
  },
  sunVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 18,
    color: theme.colors.paper,
  },
});
