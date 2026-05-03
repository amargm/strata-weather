import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { theme } from '../utils/theme';
import { WeatherValues, DailyInterval } from '../types/weather';
import { ProOverlay } from '../components/ProBadge';
import { useUser } from '../context/UserContext';
import { getStatusBarPadding, sw, ms } from '../utils/responsive';

interface ScienceScreenProps {
  weather: WeatherValues | null;
  today: DailyInterval | null;
}

export const ScienceScreen = React.memo(function ScienceScreen({ weather, today }: ScienceScreenProps) {
  const { isPro, isGuest, signOut, showPaywall } = useUser();
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

  const uvIndex = weather?.uvIndex ?? 0;
  const uvLabel = uvIndex <= 2 ? 'Low' : uvIndex <= 5 ? 'Moderate' : uvIndex <= 7 ? 'High' : 'Very High';

  useEffect(() => {
    if (!weather) return;
    const targets = [
      Math.min(uvIndex / 11, 1),
      Math.max(0, Math.min((weather.pressureSurfaceLevel - 950) / 100, 1)),
      Math.max(0, Math.min((weather.temperatureApparent + 10) / 60, 1)),
      (weather.humidity ?? 0) / 100,
    ];
    if (reduceMotion) {
      barAnims.forEach((anim, i) => anim.setValue(targets[i]));
      return;
    }
    Animated.stagger(80, barAnims.map((anim, i) =>
      Animated.spring(anim, { toValue: targets[i], useNativeDriver: false, damping: 18 })
    )).start();
  }, [weather, reduceMotion]);

  const formatTime = (iso: string | undefined) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const sunrise = formatTime(today?.values?.sunriseTime);
  const sunset = formatTime(today?.values?.sunsetTime);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header} accessible accessibilityRole="header">
        <View>
          <Text style={styles.eyebrow}>Layer 03 · Deep Data</Text>
          <Text style={styles.title}>Science</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.updatedLabel}>UV Level</Text>
          <Text style={styles.updatedTime}>{uvLabel}</Text>
        </View>
      </View>

      {/* 2-column metric grid — matching Layer 1 style */}
      <View style={styles.grid}>
        {/* UV Index */}
        <MetricCell
          label="UV Index"
          value={`${uvIndex}`}
          unit={uvLabel}
          hint={uvIndex >= 6 ? 'Wear sunscreen — burns in under 20 min.' : 'Sun exposure is manageable right now.'}
          barAnim={barAnims[0]}
          color={theme.colors.accent}
          isLeft
          valueColor={uvIndex >= 6 ? theme.colors.accent : undefined}
          isPro
        />
        {/* Pressure */}
        <MetricCell
          label="Pressure"
          value={`${Math.round(weather?.pressureSurfaceLevel ?? 0)}`}
          unit="hPa"
          hint="Weight of air above you. Below 1000 = storms likely."
          barAnim={barAnims[1]}
          color={theme.colors.accent2}
          isLeft={false}
        />
        {/* Feels Like */}
        <MetricCell
          label="Feels Like"
          value={`${Math.round(weather?.temperatureApparent ?? 0)}°`}
          unit={`Dew point ${Math.round(weather?.dewPoint ?? 0)}°C`}
          hint={(weather?.dewPoint ?? 0) > 15 ? 'Muggy — sweat won\'t evaporate easily.' : 'Comfortable moisture level.'}
          barAnim={barAnims[2]}
          color="rgba(240,235,225,0.4)"
          isLeft
          isPro
        />
        {/* Humidity */}
        <MetricCell
          label="Humidity"
          value={`${weather?.humidity ?? 0}`}
          unit="%"
          hint="Above 70% feels muggy. Below 30% feels dry."
          barAnim={barAnims[3]}
          color={theme.colors.accent2}
          isLeft={false}
        />
      </View>

      {/* Sun strip — separate section */}
      <View style={styles.sunSection} accessible accessibilityRole="text" accessibilityLabel={`Sunrise at ${sunrise}. Sunset at ${sunset}. Total daylight ${daylightStr}`}>
        <View style={styles.sunRow}>
          <View style={styles.sunItem}>
            <Text style={styles.sunLabel}>Sunrise</Text>
            <Text style={styles.sunVal}>{sunrise}</Text>
          </View>
          <View style={styles.sunDivider} />
          <View style={styles.sunItem}>
            <Text style={styles.sunLabel}>Sunset</Text>
            <Text style={styles.sunVal}>{sunset}</Text>
          </View>
          <View style={styles.sunDivider} />
          <View style={styles.sunItem}>
            <Text style={styles.sunLabel}>Daylight</Text>
            <Text style={[styles.sunVal, { color: 'rgba(240,200,80,0.9)' }]}>{daylightStr}</Text>
          </View>
        </View>
      </View>

      {/* ---- Account & App footer ---- */}
      <View style={styles.footerSection}>
        <View style={styles.footerDivider} />

        {/* Upgrade banner — only for signed-in non-Pro users, not guests */}
        {!isPro && !isGuest && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={showPaywall}
            activeOpacity={0.75}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Strata Pro"
          >
            <View style={styles.upgradeBannerLeft}>
              <Text style={styles.upgradeBannerTitle}>Strata Pro</Text>
              <Text style={styles.upgradeBannerSub}>Unlock UV, dew point & more</Text>
            </View>
            <View style={styles.upgradePill}>
              <Text style={styles.upgradePillText}>Upgrade</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={signOut}
            activeOpacity={0.6}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.actionIcon}>↩</Text>
            <Text style={styles.actionLabel}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => BackHandler.exitApp()}
            activeOpacity={0.6}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close app"
          >
            <Text style={styles.actionIcon}>✕</Text>
            <Text style={styles.actionLabel}>Close App</Text>
          </TouchableOpacity>
        </View>

        {/* App branding */}
        <Text style={styles.brandMark}>Strata · Weather, felt.</Text>
      </View>
    </ScrollView>
  );
});

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

  /* ---- 2-column grid (matches Layer 1) ---- */
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

  /* ---- Sun section (separate) ---- */
  sunSection: {
    marginTop: 24,
    marginHorizontal: sw(22),
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(240,235,225,0.1)',
    paddingTop: 20,
  },
  sunRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sunItem: {
    flex: 1,
    alignItems: 'center',
  },
  sunDivider: {
    width: 0.5,
    height: 32,
    backgroundColor: 'rgba(240,235,225,0.12)',
  },
  sunLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.55)',
    marginBottom: 6,
  },
  sunVal: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 18,
    color: theme.colors.paper,
  },

  /* ---- Footer section ---- */
  footerSection: {
    marginTop: 32,
    paddingBottom: 20,
  },
  footerDivider: {
    height: 0.5,
    backgroundColor: 'rgba(240,235,225,0.08)',
    marginHorizontal: sw(22),
    marginBottom: 20,
  },

  /* Upgrade banner */
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: sw(22),
    marginBottom: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(240,235,225,0.2)',
  },
  upgradeBannerLeft: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontFamily: theme.fonts.serifBold,
    fontSize: 14,
    color: theme.colors.paper,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  upgradeBannerSub: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: 'rgba(240,235,225,0.45)',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  upgradePill: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  upgradePillText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.accent,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: sw(22),
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,225,0.1)',
    overflow: 'hidden',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionDivider: {
    width: 0.5,
    height: 24,
    backgroundColor: 'rgba(240,235,225,0.1)',
  },
  actionIcon: {
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    color: 'rgba(240,235,225,0.4)',
  },
  actionLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(240,235,225,0.45)',
  },

  /* Brand mark */
  brandMark: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 11,
    color: 'rgba(240,235,225,0.2)',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
