import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../utils/theme';
import { sw, sh, ms } from '../utils/responsive';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function PaywallModal({ visible, onClose, onUpgrade }: PaywallModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <Text style={styles.title}>Strata Pro</Text>
          <Text style={styles.subtitle}>Unlock the full atmosphere</Text>

          {/* Feature list */}
          <View style={styles.features}>
            <FeatureRow icon="UV" label="UV Index" desc="Real-time sun exposure data" />
            <FeatureRow icon="DP" label="Dew Point" desc="Accurate moisture & comfort levels" />
            <FeatureRow icon="HR" label="Hourly Forecast" desc="True hour-by-hour predictions" />
            <FeatureRow icon="AL" label="Weather Alerts" desc="Severe weather notifications" />
            <FeatureRow icon="HI" label="Historical Data" desc="Compare today with past trends" />
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={onUpgrade}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
          >
            <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            <Text style={styles.priceText}>Coming Soon</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onClose}
            activeOpacity={0.6}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.dismissBtnText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FeatureRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <View style={styles.featureRow} accessible accessibilityLabel={`${label}: ${desc}`}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,14,12,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: sw(28),
    paddingTop: 12,
    paddingBottom: sh(40),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.faint,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(28),
    color: theme.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: ms(14),
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  features: {
    gap: 16,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: theme.colors.ink,
  },
  featureDesc: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 1,
  },
  upgradeBtn: {
    backgroundColor: theme.colors.ink,
    paddingVertical: sh(16),
    borderRadius: 6,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.paper,
  },
  priceText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: 'rgba(240,235,225,0.5)',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: sh(14),
    alignItems: 'center',
  },
  dismissBtnText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
});
