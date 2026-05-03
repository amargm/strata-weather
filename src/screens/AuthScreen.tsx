import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { theme } from '../utils/theme';
import { sw, ms, sh, getStatusBarPadding } from '../utils/responsive';

interface AuthScreenProps {
  onSignIn: () => void;
  onGuest: () => void;
}

export function AuthScreen({ onSignIn, onGuest }: AuthScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ring entrance
    Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Text entrance
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 18,
          stiffness: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Buttons entrance
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(btnFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />

      {/* Decorative ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Brand */}
      <Animated.View
        style={[
          styles.brand,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.appName}>Strata</Text>
        <Text style={styles.tagline}>Weather, felt.</Text>
      </Animated.View>

      {/* Auth buttons */}
      <Animated.View style={[styles.actions, { opacity: btnFade }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onSignIn}
          activeOpacity={0.8}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sign in or create account"
        >
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={onGuest}
          activeOpacity={0.6}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Explore as guest"
        >
          <Text style={styles.ghostBtnText}>Explore as Guest</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: btnFade }]}>
        <Text style={styles.footerText}>
          Subscription unlocks all layers & features
        </Text>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sw(40),
  },

  /* Ring */
  ring: {
    position: 'absolute',
    top: sh(140),
    width: sw(120),
    height: sw(120),
    borderRadius: sw(60),
    borderWidth: 1.5,
    borderColor: theme.colors.faint,
  },

  /* Brand */
  brand: {
    alignItems: 'center',
    marginBottom: sh(60),
  },
  appName: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: ms(48),
    color: theme.colors.ink,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: ms(16),
    color: theme.colors.muted,
    marginTop: 6,
  },

  /* Buttons */
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: sh(14),
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: theme.colors.ink,
    paddingVertical: sh(16),
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.paper,
  },
  ghostBtn: {
    width: '100%',
    paddingVertical: sh(14),
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: theme.colors.faint,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: sh(40),
    alignItems: 'center',
  },
  footerText: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
});
