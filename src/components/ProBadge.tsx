import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../utils/theme';
import { useUser } from '../context/UserContext';

interface ProBadgeProps {
  /** true = dark (ink) background layers, false = light (paper) */
  dark?: boolean;
  onPress?: () => void;
  /** Always show badge even for Pro users (data genuinely unavailable on free API) */
  force?: boolean;
}

/**
 * Small "PRO" lock badge overlaid on metrics that require a paid API tier.
 * Auto-wires to UserContext paywall when no explicit onPress provided.
 * Returns null if user is Pro (unless force=true).
 */
export function ProBadge({ dark = true, onPress, force }: ProBadgeProps) {
  const { isPro, isGuest, showPaywall } = useUser();
  // Hide for Pro users (they have access) and guests (don't show upgrade prompts)
  if (isPro && !force) return null;
  if (isGuest) return null;

  const handlePress = onPress || showPaywall;
  const badge = (
    <View style={[styles.badge, dark ? styles.badgeDark : styles.badgeLight]}>
      <Text style={[styles.lock, dark ? styles.lockDark : styles.lockLight]}>⊘</Text>
      <Text style={[styles.label, dark ? styles.labelDark : styles.labelLight]}>PRO</Text>
    </View>
  );

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} accessible accessibilityRole="button" accessibilityLabel="Upgrade to Pro to unlock this feature">
      {badge}
    </TouchableOpacity>
  );
}

/**
 * Full-cell overlay that dims the value and shows a centered PRO badge.
 * Wrap around the cell content.
 * Returns just children if user is Pro (no overlay).
 */
export function ProOverlay({ dark = true, children, onPress, force }: ProBadgeProps & { children: React.ReactNode }) {
  const { isPro, showPaywall } = useUser();
  if (isPro && !force) return <>{children}</>;

  const handlePress = onPress || showPaywall;
  return (
    <View style={styles.overlayWrap}>
      <View style={styles.dimmed}>{children}</View>
      <View style={styles.overlayCentre}>
        <ProBadge dark={dark} onPress={handlePress} />
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
          <Text style={[styles.upgradeHint, dark ? styles.upgradeHintDark : styles.upgradeHintLight]}>
            Upgrade to Pro
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  badgeDark: {
    backgroundColor: 'rgba(196,65,28,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,65,28,0.35)',
  },
  badgeLight: {
    backgroundColor: 'rgba(196,65,28,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,65,28,0.25)',
  },
  lock: { fontSize: 10 },
  lockDark: { color: 'rgba(240,235,225,0.6)' },
  lockLight: { color: theme.colors.ink },
  label: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 9,
    letterSpacing: 2,
  },
  labelDark: { color: theme.colors.accent },
  labelLight: { color: theme.colors.accent },

  overlayWrap: { position: 'relative' },
  dimmed: { opacity: 0.25 },
  overlayCentre: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 6,
  },
  upgradeHintDark: { color: 'rgba(240,235,225,0.45)' },
  upgradeHintLight: { color: 'rgba(15,14,12,0.4)' },
});
