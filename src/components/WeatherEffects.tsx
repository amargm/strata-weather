import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, AccessibilityInfo } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WeatherEffectsProps {
  weatherCode: number;
  cloudCover: number;
}

export const WeatherEffects = React.memo(function WeatherEffects({
  weatherCode,
  cloudCover,
}: WeatherEffectsProps) {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  if (reduceMotion) return null;

  const isThunder = [8000].includes(weatherCode);
  const isRain = [4000, 4001, 4200, 4201, 6000, 6001, 6200, 6201].includes(weatherCode);
  const isSnow = [5000, 5001, 5100, 5101, 7000, 7101, 7102].includes(weatherCode);
  const isFog = [2000, 2100].includes(weatherCode);
  const isClear = [1000, 1100].includes(weatherCode);
  const isCloudy = cloudCover > 50 || [1001, 1101, 1102].includes(weatherCode);

  if (isThunder) return <ThunderstormEffect />;
  if (isRain) return <RainEffect heavy={[4001, 4201, 6001, 6201].includes(weatherCode)} />;
  if (isSnow) return <SnowEffect heavy={[5001, 5101].includes(weatherCode)} />;
  if (isFog) return <FogEffect />;
  if (isClear) return <SunEffect />;
  if (isCloudy) return <CloudEffect cover={cloudCover} />;
  return <FloatingParticles />;
});

// ─── RAIN ─────────────────────────────────────────────────────────────
function RainEffect({ heavy }: { heavy: boolean }) {
  const count = heavy ? 35 : 20;
  const windAngle = heavy ? 12 : 5;

  const drops = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * SCREEN_WIDTH * 1.2 - SCREEN_WIDTH * 0.1,
      duration: heavy ? 500 + Math.random() * 300 : 700 + Math.random() * 500,
      height: heavy ? 24 + Math.random() * 16 : 14 + Math.random() * 10,
      opacity: heavy ? 0.3 + Math.random() * 0.2 : 0.15 + Math.random() * 0.15,
    }))
  ).current;

  const splashes = useRef(
    Array.from({ length: heavy ? 8 : 4 }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * SCREEN_WIDTH,
      bottom: Math.random() * 60,
      delay: Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    drops.forEach((drop) => {
      const loop = () => {
        drop.anim.setValue(0);
        Animated.timing(drop.anim, {
          toValue: 1,
          duration: drop.duration,
          delay: Math.random() * 400,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          drop.left = Math.random() * SCREEN_WIDTH * 1.2 - SCREEN_WIDTH * 0.1;
          loop();
        });
      };
      loop();
    });

    splashes.forEach((splash) => {
      const loop = () => {
        splash.anim.setValue(0);
        Animated.timing(splash.anim, {
          toValue: 1,
          duration: 600,
          delay: splash.delay + Math.random() * 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          splash.left = Math.random() * SCREEN_WIDTH;
          splash.delay = 0;
          loop();
        });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {drops.map((drop, i) => (
        <Animated.View
          key={`r${i}`}
          style={{
            position: 'absolute',
            left: drop.left,
            width: 1.5,
            height: drop.height,
            borderRadius: 1,
            backgroundColor: `rgba(28,93,196,${drop.opacity})`,
            transform: [
              { rotate: `${windAngle}deg` },
              {
                translateY: drop.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, SCREEN_HEIGHT + 40],
                }),
              },
            ],
            opacity: drop.anim.interpolate({
              inputRange: [0, 0.05, 0.85, 1],
              outputRange: [0, 1, 1, 0],
            }),
          }}
        />
      ))}
      {splashes.map((splash, i) => (
        <Animated.View
          key={`s${i}`}
          style={{
            position: 'absolute',
            left: splash.left,
            bottom: splash.bottom,
            width: 16,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(28,93,196,0.15)',
            transform: [
              {
                scaleX: splash.anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1.5, 0],
                }),
              },
              {
                scaleY: splash.anim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0, 1, 0],
                }),
              },
            ],
            opacity: splash.anim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 0.6, 0],
            }),
          }}
        />
      ))}
    </View>
  );
}

// ─── SNOW ─────────────────────────────────────────────────────────────
function SnowEffect({ heavy }: { heavy: boolean }) {
  const count = heavy ? 30 : 18;
  const flakes = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * SCREEN_WIDTH,
      duration: 5000 + Math.random() * 5000,
      size: 3 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 100,
      wobble: 20 + Math.random() * 30,
      opacity: 0.2 + Math.random() * 0.4,
    }))
  ).current;

  useEffect(() => {
    flakes.forEach((flake) => {
      const loop = () => {
        flake.anim.setValue(0);
        Animated.timing(flake.anim, {
          toValue: 1,
          duration: flake.duration,
          delay: Math.random() * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          flake.left = Math.random() * SCREEN_WIDTH;
          loop();
        });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {flakes.map((flake, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: flake.left,
            width: flake.size,
            height: flake.size,
            borderRadius: flake.size / 2,
            backgroundColor: 'rgba(255,255,255,0.7)',
            opacity: flake.anim.interpolate({
              inputRange: [0, 0.05, 0.9, 1],
              outputRange: [0, flake.opacity, flake.opacity, 0],
            }),
            transform: [
              {
                translateY: flake.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, SCREEN_HEIGHT + 20],
                }),
              },
              {
                translateX: flake.anim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, flake.wobble, flake.drift, -flake.wobble * 0.5, flake.drift * 0.3],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── SUN / CLEAR ──────────────────────────────────────────────────────
function SunEffect() {
  const glowPulse = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const particleCount = 12;

  const particles = useRef(
    Array.from({ length: particleCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * SCREEN_WIDTH,
      duration: 6000 + Math.random() * 4000,
      size: 2 + Math.random() * 3,
    }))
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 90000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          delay: Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          p.left = Math.random() * SCREEN_WIDTH;
          loop();
        });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Warm glow */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -SCREEN_HEIGHT * 0.15,
          right: -SCREEN_WIDTH * 0.2,
          width: SCREEN_WIDTH * 0.8,
          height: SCREEN_WIDTH * 0.8,
          borderRadius: SCREEN_WIDTH * 0.4,
          backgroundColor: 'rgba(255,200,60,0.06)',
          opacity: glowPulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0.8],
          }),
          transform: [
            { scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        }}
      />
      {/* Rotating rays */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.4,
          transform: [
            { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      >
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: 200,
              height: 1,
              backgroundColor: 'rgba(255,180,40,0.08)',
              transform: [{ rotate: `${deg}deg` }],
            }}
          />
        ))}
      </Animated.View>
      {/* Floating golden particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: 'rgba(255,200,60,0.4)',
            opacity: p.anim.interpolate({
              inputRange: [0, 0.1, 0.5, 0.9, 1],
              outputRange: [0, 0.6, 0.3, 0.5, 0],
            }),
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT * 0.7, -50],
                }),
              },
              {
                translateX: p.anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, (Math.random() - 0.5) * 40, 0],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── CLOUDS ───────────────────────────────────────────────────────────
function CloudEffect({ cover }: { cover: number }) {
  const intensity = Math.min(cover / 100, 1);
  const cloudCount = 4 + Math.round(intensity * 3);

  const clouds = useRef(
    Array.from({ length: cloudCount }, (_, i) => ({
      anim: new Animated.Value(Math.random()),
      top: 40 + (i * SCREEN_HEIGHT * 0.12) + Math.random() * 60,
      duration: 30000 + Math.random() * 25000,
      width: 100 + Math.random() * 80,
      height: 30 + Math.random() * 20,
      opacity: 0.03 + intensity * 0.04,
    }))
  ).current;

  useEffect(() => {
    clouds.forEach((cloud) => {
      Animated.loop(
        Animated.timing(cloud.anim, {
          toValue: 1,
          duration: cloud.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {clouds.map((cloud, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: cloud.top,
            width: cloud.width,
            height: cloud.height,
            borderRadius: cloud.height,
            backgroundColor: `rgba(15,14,12,${cloud.opacity})`,
            transform: [
              {
                translateX: cloud.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-cloud.width - 20, SCREEN_WIDTH + cloud.width + 20],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── FOG ──────────────────────────────────────────────────────────────
function FogEffect() {
  const layers = useRef(
    Array.from({ length: 4 }, (_, i) => ({
      anim: new Animated.Value(0),
      top: SCREEN_HEIGHT * 0.2 + i * SCREEN_HEIGHT * 0.18,
      duration: 18000 + i * 8000,
      height: 80 + Math.random() * 60,
      opacity: 0.06 + Math.random() * 0.04,
    }))
  ).current;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    layers.forEach((layer) => {
      Animated.loop(
        Animated.timing(layer.anim, {
          toValue: 1,
          duration: layer.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Ambient haze */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(240,235,225,0.08)',
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] }),
        }}
      />
      {layers.map((layer, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: layer.top,
            width: SCREEN_WIDTH * 1.5,
            height: layer.height,
            borderRadius: layer.height,
            backgroundColor: `rgba(200,195,185,${layer.opacity})`,
            transform: [
              {
                translateX: layer.anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [-SCREEN_WIDTH * 0.5, SCREEN_WIDTH * 0.3, -SCREEN_WIDTH * 0.5],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── THUNDERSTORM ─────────────────────────────────────────────────────
function ThunderstormEffect() {
  const flash = useRef(new Animated.Value(0)).current;
  const rainDrops = useRef(
    Array.from({ length: 30 }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * SCREEN_WIDTH * 1.3 - SCREEN_WIDTH * 0.15,
      duration: 400 + Math.random() * 250,
      height: 22 + Math.random() * 18,
    }))
  ).current;

  useEffect(() => {
    // Lightning flash loop
    const flashLoop = () => {
      const delay = 3000 + Math.random() * 6000;
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0.7, duration: 40, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(flashLoop);
      }, delay);
    };
    flashLoop();

    // Rain
    rainDrops.forEach((drop) => {
      const loop = () => {
        drop.anim.setValue(0);
        Animated.timing(drop.anim, {
          toValue: 1,
          duration: drop.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          drop.left = Math.random() * SCREEN_WIDTH * 1.3 - SCREEN_WIDTH * 0.15;
          loop();
        });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Lightning flash overlay */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255,255,255,0.15)',
          opacity: flash,
        }}
      />
      {/* Heavy rain at steep angle */}
      {rainDrops.map((drop, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: drop.left,
            width: 2,
            height: drop.height,
            borderRadius: 1,
            backgroundColor: 'rgba(28,93,196,0.35)',
            transform: [
              { rotate: '18deg' },
              {
                translateY: drop.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, SCREEN_HEIGHT + 50],
                }),
              },
            ],
            opacity: drop.anim.interpolate({
              inputRange: [0, 0.05, 0.9, 1],
              outputRange: [0, 1, 1, 0],
            }),
          }}
        />
      ))}
    </View>
  );
}

// ─── FLOATING PARTICLES (default/partial cloud) ───────────────────────
function FloatingParticles() {
  const count = 8;
  const particles = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * SCREEN_WIDTH,
      duration: 8000 + Math.random() * 6000,
      size: 2 + Math.random() * 2,
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          p.left = Math.random() * SCREEN_WIDTH;
          loop();
        });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: 'rgba(15,14,12,0.06)',
            opacity: p.anim.interpolate({
              inputRange: [0, 0.15, 0.5, 0.85, 1],
              outputRange: [0, 0.4, 0.2, 0.4, 0],
            }),
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT * 0.8, SCREEN_HEIGHT * 0.1],
                }),
              },
              {
                translateX: p.anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, (Math.random() - 0.5) * 50, 0],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
});
