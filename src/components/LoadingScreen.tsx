import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { theme } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');
const CENTER_X = W / 2;
const CENTER_Y = H * 0.4;

/** Number of concentric atmospheric rings */
const RING_COUNT = 5;
const RING_COLORS = [
  'rgba(196,65,28,0.12)',   // accent warmth
  'rgba(196,65,28,0.08)',
  'rgba(138,128,112,0.08)', // muted
  'rgba(138,128,112,0.05)',
  'rgba(15,14,12,0.03)',    // ink whisper
];

const TIPS = [
  'Reading the sky…',
  'Checking the clouds…',
  'Measuring humidity…',
  'Feeling the wind…',
  'Sampling the air…',
  'Tracking the sun…',
  'Listening to the atmosphere…',
];

interface Props {
  tipIndex: number;
  tipFade: Animated.Value;
}

/**
 * Animated loading screen with pulsing concentric rings (atmospheric strata),
 * floating particles, and a breathing center orb.
 */
export const LoadingScreen = React.memo(({ tipIndex, tipFade }: Props) => {
  // --- Pulsing rings ---
  const ringAnims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0))
  ).current;

  // --- Center orb breathe ---
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.6)).current;

  // --- Floating particles ---
  const PARTICLE_COUNT = 8;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(Math.random() * W),
      y: new Animated.Value(Math.random() * H),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // --- Strata text fade-in ---
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(12)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Staggered ring pulses
    const ringAnimations = ringAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      )
    );

    // 2. Center orb breathing
    const orbAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.15,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.9,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.6,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 3. Floating particles — drift upward and fade
    const particleAnims = particles.map((p) => {
      const startX = Math.random() * W;
      const startY = H * 0.6 + Math.random() * H * 0.3;
      p.x.setValue(startX);
      p.y.setValue(startY);
      p.opacity.setValue(0);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(Math.random() * 3000),
          Animated.parallel([
            Animated.timing(p.opacity, {
              toValue: 0.4 + Math.random() * 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(p.y, {
              toValue: startY - 120 - Math.random() * 200,
              duration: 4000 + Math.random() * 2000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.x, {
              toValue: startX + (Math.random() - 0.5) * 60,
              duration: 4000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    });

    // 4. Title entrance
    const titleAnim = Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Start all
    ringAnimations.forEach((a) => a.start());
    orbAnim.start();
    particleAnims.forEach((a) => a.start());
    titleAnim.start();

    return () => {
      ringAnimations.forEach((a) => a.stop());
      orbAnim.stop();
      particleAnims.forEach((a) => a.stop());
      titleAnim.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Floating particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={`p-${i}`}
          style={[
            styles.particle,
            {
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }],
            },
          ]}
        />
      ))}

      {/* Concentric pulsing rings */}
      {ringAnims.map((anim, i) => {
        const baseSize = 60 + i * 55;
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.12 + i * 0.03],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.15 + (RING_COUNT - i) * 0.05, 0.6 + (RING_COUNT - i) * 0.06, 0.15],
        });

        return (
          <Animated.View
            key={`ring-${i}`}
            style={[
              styles.ring,
              {
                width: baseSize,
                height: baseSize,
                borderRadius: baseSize / 2,
                borderColor: RING_COLORS[i],
                left: CENTER_X - baseSize / 2,
                top: CENTER_Y - baseSize / 2,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}

      {/* Center orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            left: CENTER_X - 20,
            top: CENTER_Y - 20,
            opacity: orbOpacity,
            transform: [{ scale: orbScale }],
          },
        ]}
      />

      {/* Brand + tip text */}
      <View style={styles.textArea}>
        <Animated.Text
          style={[
            styles.brandName,
            { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
          ]}
        >
          STRATA
        </Animated.Text>
        <Animated.Text style={[styles.brandSub, { opacity: subtitleOpacity }]}>
          Layered Weather
        </Animated.Text>
        <Animated.Text style={[styles.tipText, { opacity: tipFade }]}>
          {TIPS[tipIndex]}
        </Animated.Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  orb: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.muted,
  },
  textArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.35,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  brandName: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    letterSpacing: 6,
    color: theme.colors.ink,
  },
  brandSub: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 15,
    color: theme.colors.muted,
    marginTop: 4,
  },
  tipText: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 28,
  },
});
