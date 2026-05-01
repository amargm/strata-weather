import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues, DailyInterval } from '../types/weather';

interface ScienceScreenProps {
  weather: WeatherValues | null;
  today: DailyInterval | null;
}

export const ScienceScreen = React.memo(function ScienceScreen({ weather, today }: ScienceScreenProps) {
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
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 04 · Deep Data</Text>
          <Text style={styles.title}>Science & Extremes</Text>
        </View>
      </View>

      {/* Science grid */}
      <View style={styles.grid}>
        {/* UV */}
        <View style={styles.block} accessible accessibilityRole="text" accessibilityLabel={`UV Index ${uvIndex}, ${uvLabel}. How strong the sun is right now. 6 plus means sunburn in under 20 minutes`}>
          <Text style={styles.label}>UV Index</Text>
          <Text style={[styles.val, { color: theme.colors.accent }]}>{uvIndex}</Text>
          <Text style={styles.unit}>{uvLabel}</Text>
          <View style={styles.uvBar} importantForAccessibility="no">
            <View style={[styles.uvMarker, { left: `${(uvIndex / 11) * 100}%` }]} />
          </View>
          <Text style={styles.sub}>
            How strong the sun is right now.{'\n'}6+ means sunburn in under 20 min.
          </Text>
        </View>

        {/* Pressure trend */}
        <View style={styles.block} accessible accessibilityRole="text" accessibilityLabel={`Pressure ${Math.round(weather?.pressureSurfaceLevel || 0)} hectopascals, steady. Weight of air above you. Dropping means rain likely, rising means clearing`}>
          <Text style={styles.label}>Pressure</Text>
          <Text style={styles.val}>{Math.round(weather?.pressureSurfaceLevel || 0)}</Text>
          <Text style={styles.unit}>hPa · Steady</Text>
          <Text style={styles.sub}>
            Weight of air above you.{'\n'}Dropping = rain likely. Rising = clearing.
          </Text>
        </View>

        {/* Wet-bulb */}
        <View style={styles.block} accessible accessibilityRole="text" accessibilityLabel={`Wet-bulb temperature ${Math.round((weather?.dewPoint || 0) + 2)} degrees. Feels ${Math.round(weather?.temperatureApparent || 0)} degrees. ${(weather?.temperatureApparent || 0) < 18 ? 'comfortable' : 'sweat won\'t evaporate easily'}`}>
          <Text style={styles.label}>Wet-bulb Temp</Text>
          <Text style={styles.val}>{Math.round((weather?.dewPoint || 0) + 2)}°</Text>
          <Text style={styles.unit}>°C</Text>
          <Text style={styles.sub}>
            How well your body can cool down.{'\n'}
            Feels {Math.round(weather?.temperatureApparent || 0)}° — 
            {(weather?.temperatureApparent || 0) < 18 ? ' comfortable' : ' sweat won\'t evaporate easily'}
          </Text>
        </View>

        {/* Humidity */}
        <View style={styles.block} accessible accessibilityRole="text" accessibilityLabel={`Humidity ${weather?.humidity || 0} percent. Moisture in the air. 70 percent plus feels muggy, 30 percent minus feels dry`}>
          <Text style={styles.label}>Humidity</Text>
          <Text style={[styles.val, { color: theme.colors.accent2 }]}>
            {weather?.humidity || 0}
          </Text>
          <Text style={styles.unit}>%</Text>
          <Text style={styles.sub}>
            Moisture in the air.{'\n'}70%+ feels muggy. 30%- feels dry.
          </Text>
        </View>
      </View>

      {/* Sun strip */}
      <View style={styles.sunStrip} accessible accessibilityRole="text" accessibilityLabel={`Sunrise at ${sunrise}. Sunset at ${sunset}. Total daylight ${daylightStr}`}>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Sunrise</Text>
          <Text style={styles.sunVal}>{sunrise}</Text>
          <Text style={styles.sunHint}>First light</Text>
        </View>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Sunset</Text>
          <Text style={styles.sunVal}>{sunset}</Text>
          <Text style={styles.sunHint}>Last light</Text>
        </View>
        <View style={styles.sunCol}>
          <Text style={styles.sunLabel}>Daylight</Text>
          <Text style={[styles.sunVal, { color: 'rgba(240,200,80,0.9)', fontSize: 15 }]}>
            {daylightStr}
          </Text>
          <Text style={styles.sunHint}>Total sun hours</Text>
        </View>
      </View>
    </ScrollView>
  );
});

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
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
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
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
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
    color: 'rgba(240,235,225,0.55)',
    marginTop: 2,
  },
  sub: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.55)',
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
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 4,
  },
  sunVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 18,
    color: theme.colors.paper,
  },
  sunHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.55)',
    marginTop: 3,
  },
});
