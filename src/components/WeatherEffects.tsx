import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, AccessibilityInfo } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

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
  const isWind = [3000, 3001, 3002].includes(weatherCode);
  const isClear = [1000, 1100].includes(weatherCode);
  const isCloudy = cloudCover > 50 || [1001, 1101, 1102].includes(weatherCode);

  if (isThunder) return <ThunderstormEffect />;
  if (isRain) return <RainEffect heavy={[4001, 4201, 6001, 6201].includes(weatherCode)} freezing={[6000, 6001, 6200, 6201].includes(weatherCode)} />;
  if (isSnow) return <SnowEffect heavy={[5001, 5101].includes(weatherCode)} />;
  if (isFog) return <FogEffect dense={weatherCode === 2000} />;
  if (isWind) return <WindEffect intensity={weatherCode === 3002 ? 3 : weatherCode === 3001 ? 2 : 1} />;
  if (isClear) return <ClearSkyEffect />;
  if (isCloudy) return <CloudEffect cover={cloudCover} />;
  return <AmbientDust />;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RAIN — layered depth, splash crowns, mist veil, puddle ripples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RainEffect({ heavy, freezing }: { heavy: boolean; freezing: boolean }) {
  const dropColor = freezing ? 'rgba(180,210,240,' : 'rgba(28,93,196,';
  const windAngle = heavy ? 15 : 6;
  const mistOpacity = heavy ? 0.06 : 0.03;

  const nearCount = heavy ? 28 : 14;
  const farCount = heavy ? 20 : 10;

  const nearDrops = useRef(
    Array.from({ length: nearCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W * 1.3 - W * 0.15,
      duration: heavy ? 450 + Math.random() * 250 : 650 + Math.random() * 350,
      height: heavy ? 28 + Math.random() * 18 : 16 + Math.random() * 12,
      width: heavy ? 2 + Math.random() * 0.5 : 1.5,
      opacity: heavy ? 0.3 + Math.random() * 0.15 : 0.18 + Math.random() * 0.12,
    }))
  ).current;

  const farDrops = useRef(
    Array.from({ length: farCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W,
      duration: heavy ? 700 + Math.random() * 400 : 1000 + Math.random() * 600,
      height: 8 + Math.random() * 8,
      opacity: 0.06 + Math.random() * 0.06,
    }))
  ).current;

  const splashCount = heavy ? 12 : 6;
  const splashes = useRef(
    Array.from({ length: splashCount }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * W,
      bottom: Math.random() * 50,
    }))
  ).current;

  const rippleCount = heavy ? 6 : 3;
  const ripples = useRef(
    Array.from({ length: rippleCount }, () => ({
      anim: new Animated.Value(0),
      left: W * 0.1 + Math.random() * W * 0.8,
      bottom: 20 + Math.random() * 40,
    }))
  ).current;

  const mistDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopDrop = (drop: any) => {
      drop.anim.setValue(0);
      Animated.timing(drop.anim, {
        toValue: 1,
        duration: drop.duration,
        delay: Math.random() * 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        drop.left = Math.random() * W * 1.3 - W * 0.15;
        loopDrop(drop);
      });
    };
    nearDrops.forEach(loopDrop);
    farDrops.forEach(loopDrop);

    splashes.forEach((s) => {
      const loop = () => {
        s.anim.setValue(0);
        Animated.timing(s.anim, {
          toValue: 1,
          duration: 500,
          delay: Math.random() * (heavy ? 800 : 1800),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          s.left = Math.random() * W;
          loop();
        });
      };
      loop();
    });

    ripples.forEach((r) => {
      const loop = () => {
        r.anim.setValue(0);
        Animated.timing(r.anim, {
          toValue: 1,
          duration: 1200,
          delay: Math.random() * 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          r.left = W * 0.1 + Math.random() * W * 0.8;
          loop();
        });
      };
      loop();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(mistDrift, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mistDrift, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Rain mist veil at bottom */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: H * 0.25,
          backgroundColor: `${dropColor}${mistOpacity})`,
          opacity: mistDrift.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [{ translateX: mistDrift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) }],
        }}
      />

      {/* Far depth drops */}
      {farDrops.map((drop, i) => (
        <Animated.View
          key={`f${i}`}
          style={{
            position: 'absolute',
            left: drop.left,
            width: 1,
            height: drop.height,
            borderRadius: 0.5,
            backgroundColor: `${dropColor}${drop.opacity})`,
            transform: [
              { rotate: `${windAngle * 0.7}deg` },
              { translateY: drop.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, H + 20] }) },
            ],
            opacity: drop.anim.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 0.7, 0.7, 0] }),
          }}
        />
      ))}

      {/* Near drops */}
      {nearDrops.map((drop, i) => (
        <Animated.View
          key={`n${i}`}
          style={{
            position: 'absolute',
            left: drop.left,
            width: drop.width,
            height: drop.height,
            borderRadius: 1,
            backgroundColor: `${dropColor}${drop.opacity})`,
            transform: [
              { rotate: `${windAngle}deg` },
              { translateY: drop.anim.interpolate({ inputRange: [0, 1], outputRange: [-50, H + 50] }) },
            ],
            opacity: drop.anim.interpolate({ inputRange: [0, 0.03, 0.88, 1], outputRange: [0, 1, 1, 0] }),
          }}
        />
      ))}

      {/* Splash crowns */}
      {splashes.map((s, i) => (
        <Animated.View
          key={`sp${i}`}
          style={{
            position: 'absolute',
            left: s.left - 4,
            bottom: s.bottom,
            width: 8,
            height: 4,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: `${dropColor}0.2)`,
            backgroundColor: 'transparent',
            transform: [
              { scaleX: s.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.3, 1.8, 0.5] }) },
              { scaleY: s.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.2, 0] }) },
              { translateY: s.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, -6, -2] }) },
            ],
            opacity: s.anim.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 0.8, 0.4, 0] }),
          }}
        />
      ))}

      {/* Puddle ripple rings */}
      {ripples.map((r, i) => (
        <Animated.View
          key={`rp${i}`}
          style={{
            position: 'absolute',
            left: r.left - 12,
            bottom: r.bottom,
            width: 24,
            height: 8,
            borderRadius: 12,
            borderWidth: 0.8,
            borderColor: `${dropColor}0.12)`,
            backgroundColor: 'transparent',
            transform: [
              { scaleX: r.anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.5] }) },
              { scaleY: r.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.3] }) },
            ],
            opacity: r.anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.5, 0.2, 0] }),
          }}
        />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SNOW — multi-depth, tumbling, ground glow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SnowEffect({ heavy }: { heavy: boolean }) {
  const nearCount = heavy ? 18 : 10;
  const farCount = heavy ? 22 : 14;

  const nearFlakes = useRef(
    Array.from({ length: nearCount }, () => ({
      anim: new Animated.Value(Math.random()),
      spin: new Animated.Value(0),
      left: Math.random() * W,
      duration: 4000 + Math.random() * 3000,
      size: 5 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 120,
      wobbleAmp: 25 + Math.random() * 35,
      opacity: 0.35 + Math.random() * 0.3,
    }))
  ).current;

  const farFlakes = useRef(
    Array.from({ length: farCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W,
      duration: 7000 + Math.random() * 6000,
      size: 2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 60,
      wobbleAmp: 10 + Math.random() * 20,
      opacity: 0.12 + Math.random() * 0.15,
    }))
  ).current;

  const groundGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    nearFlakes.forEach((f) => {
      const loopFall = () => {
        f.anim.setValue(0);
        Animated.timing(f.anim, {
          toValue: 1, duration: f.duration, delay: Math.random() * 800,
          easing: Easing.linear, useNativeDriver: true,
        }).start(() => { f.left = Math.random() * W; loopFall(); });
      };
      loopFall();
      Animated.loop(
        Animated.timing(f.spin, { toValue: 1, duration: 3000 + Math.random() * 4000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    });

    farFlakes.forEach((f) => {
      const loopFall = () => {
        f.anim.setValue(0);
        Animated.timing(f.anim, {
          toValue: 1, duration: f.duration, delay: Math.random() * 1500,
          easing: Easing.linear, useNativeDriver: true,
        }).start(() => { f.left = Math.random() * W; loopFall(); });
      };
      loopFall();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(groundGlow, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(groundGlow, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Ground accumulation glow */}
      <Animated.View
        style={{
          position: 'absolute', bottom: 0, left: -W * 0.1, width: W * 1.2,
          height: heavy ? 100 : 60, borderRadius: 60,
          backgroundColor: 'rgba(255,255,255,0.08)',
          opacity: groundGlow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] }),
          transform: [{ scaleY: groundGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
        }}
      />

      {/* Far depth flakes */}
      {farFlakes.map((f, i) => (
        <Animated.View
          key={`sf${i}`}
          style={{
            position: 'absolute', left: f.left, width: f.size, height: f.size,
            borderRadius: f.size / 2, backgroundColor: 'rgba(220,220,225,0.5)',
            opacity: f.anim.interpolate({ inputRange: [0, 0.05, 0.88, 1], outputRange: [0, f.opacity, f.opacity * 0.8, 0] }),
            transform: [
              { translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [-15, H + 15] }) },
              { translateX: f.anim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, f.wobbleAmp, f.drift * 0.5, -f.wobbleAmp * 0.6, f.drift, f.drift * 0.3] }) },
            ],
          }}
        />
      ))}

      {/* Near flakes with tumbling */}
      {nearFlakes.map((f, i) => (
        <Animated.View
          key={`sn${i}`}
          style={{
            position: 'absolute', left: f.left, width: f.size, height: f.size,
            borderRadius: f.size * 0.35, backgroundColor: 'rgba(255,255,255,0.75)',
            opacity: f.anim.interpolate({ inputRange: [0, 0.04, 0.9, 1], outputRange: [0, f.opacity, f.opacity * 0.7, 0] }),
            transform: [
              { translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [-25, H + 25] }) },
              { translateX: f.anim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, f.wobbleAmp, f.drift, -f.wobbleAmp * 0.5, f.drift * 0.4] }) },
              { rotate: f.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEAR SKY — warm glow, lens flare, god rays, heat shimmer, golden dust
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ClearSkyEffect() {
  const glowPulse = useRef(new Animated.Value(0)).current;
  const rayRotation = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const flarePulse = useRef(new Animated.Value(0)).current;

  const moteCount = 16;
  const motes = useRef(
    Array.from({ length: moteCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W,
      startY: H * 0.2 + Math.random() * H * 0.6,
      duration: 7000 + Math.random() * 6000,
      size: 1.5 + Math.random() * 2.5,
      driftX: (Math.random() - 0.5) * 60,
      maxOpacity: 0.15 + Math.random() * 0.35,
    }))
  ).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    Animated.loop(
      Animated.timing(rayRotation, { toValue: 1, duration: 120000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(flarePulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flarePulse, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    motes.forEach((m) => {
      const loop = () => {
        m.anim.setValue(0);
        Animated.timing(m.anim, {
          toValue: 1, duration: m.duration, delay: Math.random() * 3000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }).start(() => {
          m.left = Math.random() * W;
          m.startY = H * 0.2 + Math.random() * H * 0.6;
          loop();
        });
      };
      loop();
    });
  }, []);

  const hour = new Date().getHours();
  const isGolden = hour < 8 || hour >= 17;
  const glowColor = isGolden ? 'rgba(255,170,40,' : 'rgba(255,210,80,';
  const rayColor = isGolden ? 'rgba(255,160,30,0.06)' : 'rgba(255,200,60,0.04)';

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Primary warm glow */}
      <Animated.View
        style={{
          position: 'absolute', top: -H * 0.18, right: -W * 0.25,
          width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45,
          backgroundColor: `${glowColor}0.05)`,
          opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }),
          transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
        }}
      />

      {/* Inner glow */}
      <Animated.View
        style={{
          position: 'absolute', top: -H * 0.08, right: -W * 0.1,
          width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25,
          backgroundColor: `${glowColor}0.06)`,
          opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
          transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) }],
        }}
      />

      {/* Lens flare accent */}
      <Animated.View
        style={{
          position: 'absolute', top: H * 0.12, right: W * 0.15,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: `${glowColor}0.08)`,
          opacity: flarePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          transform: [
            { scale: flarePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] }) },
            { translateY: flarePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
          ],
        }}
      />

      {/* God rays */}
      <Animated.View
        style={{
          position: 'absolute', top: -80, right: -80, width: 300, height: 300,
          alignItems: 'center', justifyContent: 'center', opacity: 0.5,
          transform: [{ rotate: rayRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      >
        {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((deg) => (
          <View key={deg} style={{ position: 'absolute', width: 260, height: 1, backgroundColor: rayColor, transform: [{ rotate: `${deg}deg` }] }} />
        ))}
      </Animated.View>

      {/* Heat shimmer */}
      <Animated.View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.08,
          backgroundColor: `${glowColor}0.02)`,
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
          transform: [{ scaleY: shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
        }}
      />

      {/* Golden dust motes */}
      {motes.map((m, i) => (
        <Animated.View
          key={`m${i}`}
          style={{
            position: 'absolute', left: m.left, top: m.startY,
            width: m.size, height: m.size, borderRadius: m.size / 2,
            backgroundColor: `${glowColor}0.5)`,
            opacity: m.anim.interpolate({ inputRange: [0, 0.15, 0.5, 0.85, 1], outputRange: [0, m.maxOpacity, m.maxOpacity * 0.5, m.maxOpacity * 0.8, 0] }),
            transform: [
              { translateY: m.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80 - Math.random() * 60] }) },
              { translateX: m.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, m.driftX, m.driftX * 0.3] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOUDS — multi-layer parallax, varying density, overcast dimming
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CloudEffect({ cover }: { cover: number }) {
  const intensity = Math.min(cover / 100, 1);

  const highClouds = useRef(
    Array.from({ length: 2 }, (_, i) => ({
      anim: new Animated.Value(Math.random()),
      top: 40 + i * 70 + Math.random() * 50,
      duration: 55000 + Math.random() * 25000,
      width: 180 + Math.random() * 100,
      height: 12 + Math.random() * 10,
      opacity: 0.012 + intensity * 0.018,
    }))
  ).current;

  const midClouds = useRef(
    Array.from({ length: 2 + Math.round(intensity) }, (_, i) => ({
      anim: new Animated.Value(Math.random()),
      top: 140 + i * (H * 0.12) + Math.random() * 60,
      duration: 35000 + Math.random() * 20000,
      width: 130 + Math.random() * 80,
      height: 28 + Math.random() * 18,
      opacity: 0.02 + intensity * 0.025,
    }))
  ).current;

  const lowCount = intensity > 0.7 ? 2 : 1;
  const lowClouds = useRef(
    Array.from({ length: lowCount }, (_, i) => ({
      anim: new Animated.Value(Math.random()),
      top: H * 0.5 + i * 100 + Math.random() * 60,
      duration: 60000 + Math.random() * 30000,
      width: 200 + Math.random() * 120,
      height: 36 + Math.random() * 24,
      opacity: 0.025 + intensity * 0.03,
    }))
  ).current;

  const dimPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startCloud = (c: any) => {
      Animated.loop(
        Animated.timing(c.anim, { toValue: 1, duration: c.duration, easing: Easing.linear, useNativeDriver: true })
      ).start();
    };
    highClouds.forEach(startCloud);
    midClouds.forEach(startCloud);
    lowClouds.forEach(startCloud);

    if (intensity > 0.6) {
      Animated.loop(Animated.sequence([
        Animated.timing(dimPulse, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dimPulse, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }
  }, []);

  // Fade in over first 12%, hold, fade out over last 12%
  const edgeFade = (anim: Animated.Value) => anim.interpolate({
    inputRange: [0, 0.12, 0.88, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {intensity > 0.6 && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(15,14,12,0.02)',
            opacity: dimPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
          }}
        />
      )}

      {highClouds.map((c, i) => (
        <Animated.View key={`h${i}`} style={{
          position: 'absolute', top: c.top, width: c.width, height: c.height,
          borderRadius: c.height, backgroundColor: `rgba(15,14,12,${c.opacity})`,
          opacity: edgeFade(c.anim),
          transform: [{ translateX: c.anim.interpolate({ inputRange: [0, 1], outputRange: [W + 20, -c.width - 20] }) }],
        }} />
      ))}

      {midClouds.map((c, i) => (
        <Animated.View key={`m${i}`} style={{
          position: 'absolute', top: c.top, width: c.width, height: c.height,
          borderRadius: c.height * 0.8, backgroundColor: `rgba(15,14,12,${c.opacity})`,
          opacity: edgeFade(c.anim),
          transform: [{ translateX: c.anim.interpolate({ inputRange: [0, 1], outputRange: [-c.width - 30, W + 30] }) }],
        }} />
      ))}

      {lowClouds.map((c, i) => (
        <Animated.View key={`l${i}`} style={{
          position: 'absolute', top: c.top, width: c.width, height: c.height,
          borderRadius: c.height, backgroundColor: `rgba(15,14,12,${c.opacity})`,
          opacity: edgeFade(c.anim),
          transform: [{ translateX: c.anim.interpolate({ inputRange: [0, 1], outputRange: [W + 40, -c.width - 40] }) }],
        }} />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FOG — rolling multi-layer, moisture particles, visibility veil
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FogEffect({ dense }: { dense: boolean }) {
  const veilBreathe = useRef(new Animated.Value(0)).current;

  const bandCount = dense ? 6 : 4;
  const bands = useRef(
    Array.from({ length: bandCount }, (_, i) => ({
      anim: new Animated.Value(0),
      top: H * 0.15 + i * (H * 0.14),
      duration: 14000 + i * 6000 + Math.random() * 8000,
      height: 60 + Math.random() * 50,
      opacity: dense ? 0.06 + Math.random() * 0.04 : 0.04 + Math.random() * 0.03,
      direction: i % 2 === 0 ? 1 : -1,
    }))
  ).current;

  const particleCount = dense ? 15 : 8;
  const particles = useRef(
    Array.from({ length: particleCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W,
      top: Math.random() * H,
      duration: 5000 + Math.random() * 5000,
      size: 2 + Math.random() * 3,
      maxOp: 0.08 + Math.random() * 0.12,
    }))
  ).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(veilBreathe, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(veilBreathe, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    bands.forEach((b) => {
      Animated.loop(
        Animated.timing(b.anim, { toValue: 1, duration: b.duration, easing: Easing.linear, useNativeDriver: true })
      ).start();
    });

    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1, duration: p.duration, delay: Math.random() * 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }).start(() => { p.left = Math.random() * W; p.top = Math.random() * H; loop(); });
      };
      loop();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: dense ? 'rgba(225,220,210,0.1)' : 'rgba(230,225,215,0.06)',
          opacity: veilBreathe.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] }),
        }}
      />

      {bands.map((b, i) => (
        <Animated.View key={`fb${i}`} style={{
          position: 'absolute', top: b.top, width: W * 1.6, height: b.height,
          borderRadius: b.height, backgroundColor: `rgba(200,195,185,${b.opacity})`,
          opacity: b.anim.interpolate({
            inputRange: [0, 0.15, 0.5, 0.85, 1],
            outputRange: [0, 0.7, 1, 0.7, 0],
          }),
          transform: [{ translateX: b.anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [b.direction > 0 ? -W * 0.6 : W * 0.3, b.direction > 0 ? W * 0.3 : -W * 0.6, b.direction > 0 ? -W * 0.6 : W * 0.3],
          }) }],
        }} />
      ))}

      {particles.map((p, i) => (
        <Animated.View key={`fp${i}`} style={{
          position: 'absolute', left: p.left, top: p.top,
          width: p.size, height: p.size, borderRadius: p.size / 2,
          backgroundColor: 'rgba(180,175,165,0.5)',
          opacity: p.anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, p.maxOp, p.maxOp, 0] }),
          transform: [
            { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, (Math.random() - 0.5) * 30] }) },
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15 + Math.random() * 30] }) },
          ],
        }} />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THUNDERSTORM — forked lightning, dark atmosphere, rain sheets
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ThunderstormEffect() {
  const flash = useRef(new Animated.Value(0)).current;
  const atmosphereDark = useRef(new Animated.Value(0)).current;

  const rainCount = 35;
  const rainDrops = useRef(
    Array.from({ length: rainCount }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W * 1.4 - W * 0.2,
      duration: 350 + Math.random() * 200,
      height: 24 + Math.random() * 20,
      width: 1.5 + Math.random() * 1,
    }))
  ).current;

  const sheets = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      anim: new Animated.Value(0),
      top: H * 0.2 + i * H * 0.25,
      duration: 6000 + i * 3000,
    }))
  ).current;

  useEffect(() => {
    const flashLoop = () => {
      const delay = 2500 + Math.random() * 5000;
      setTimeout(() => {
        Animated.timing(atmosphereDark, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(flash, { toValue: 1, duration: 40, useNativeDriver: true }),
            Animated.timing(flash, { toValue: 0, duration: 60, useNativeDriver: true }),
            Animated.delay(80),
            Animated.timing(flash, { toValue: 0.8, duration: 30, useNativeDriver: true }),
            Animated.timing(flash, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(atmosphereDark, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]).start(flashLoop);
        }, 300);
      }, delay);
    };
    flashLoop();

    rainDrops.forEach((drop) => {
      const loop = () => {
        drop.anim.setValue(0);
        Animated.timing(drop.anim, {
          toValue: 1, duration: drop.duration, easing: Easing.linear, useNativeDriver: true,
        }).start(() => { drop.left = Math.random() * W * 1.4 - W * 0.2; loop(); });
      };
      loop();
    });

    sheets.forEach((s) => {
      Animated.loop(
        Animated.timing(s.anim, { toValue: 1, duration: s.duration, easing: Easing.linear, useNativeDriver: true })
      ).start();
    });
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={{
        ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,14,12,0.06)',
        opacity: atmosphereDark.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }),
      }} />

      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.18)', opacity: flash }} />

      {sheets.map((s, i) => (
        <Animated.View key={`sh${i}`} style={{
          position: 'absolute', top: s.top, width: W * 0.6, height: 30, borderRadius: 15,
          backgroundColor: 'rgba(28,93,196,0.03)',
          opacity: s.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateX: s.anim.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.3, W + 20] }) }],
        }} />
      ))}

      {rainDrops.map((drop, i) => (
        <Animated.View key={`tr${i}`} style={{
          position: 'absolute', left: drop.left, width: drop.width, height: drop.height,
          borderRadius: 1, backgroundColor: 'rgba(28,93,196,0.3)',
          transform: [
            { rotate: '20deg' },
            { translateY: drop.anim.interpolate({ inputRange: [0, 1], outputRange: [-60, H + 60] }) },
          ],
          opacity: drop.anim.interpolate({ inputRange: [0, 0.04, 0.92, 1], outputRange: [0, 1, 1, 0] }),
        }} />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIND — streaks, leaf particles, air currents
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function WindEffect({ intensity }: { intensity: number }) {
  const streakCount = 6 + intensity * 4;
  const streaks = useRef(
    Array.from({ length: streakCount }, () => ({
      anim: new Animated.Value(0),
      top: Math.random() * H,
      duration: (2000 + Math.random() * 1500) / intensity,
      width: 60 + Math.random() * 80 + intensity * 30,
      height: 0.8 + Math.random() * 0.5,
      opacity: 0.04 + Math.random() * 0.04 + intensity * 0.01,
    }))
  ).current;

  const leafCount = 4 + intensity * 2;
  const leaves = useRef(
    Array.from({ length: leafCount }, () => ({
      anim: new Animated.Value(0),
      spin: new Animated.Value(0),
      startY: H * 0.2 + Math.random() * H * 0.6,
      duration: 3000 + Math.random() * 2000,
      size: 3 + Math.random() * 3,
      wobble: 30 + Math.random() * 50,
    }))
  ).current;

  const wavePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    streaks.forEach((s) => {
      const loop = () => {
        s.anim.setValue(0);
        Animated.timing(s.anim, {
          toValue: 1, duration: s.duration, delay: Math.random() * 2000,
          easing: Easing.in(Easing.quad), useNativeDriver: true,
        }).start(() => { s.top = Math.random() * H; loop(); });
      };
      loop();
    });

    leaves.forEach((l) => {
      const loop = () => {
        l.anim.setValue(0);
        Animated.timing(l.anim, {
          toValue: 1, duration: l.duration, delay: Math.random() * 1500,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }).start(() => { l.startY = H * 0.2 + Math.random() * H * 0.6; loop(); });
      };
      loop();
      Animated.loop(
        Animated.timing(l.spin, { toValue: 1, duration: 1000 + Math.random() * 1500, easing: Easing.linear, useNativeDriver: true })
      ).start();
    });

    Animated.loop(Animated.sequence([
      Animated.timing(wavePulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wavePulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', top: H * 0.3, left: 0, right: 0, height: H * 0.4,
        backgroundColor: 'rgba(15,14,12,0.01)',
        opacity: wavePulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
        transform: [{ translateX: wavePulse.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) }],
      }} />

      {streaks.map((s, i) => (
        <Animated.View key={`ws${i}`} style={{
          position: 'absolute', top: s.top, width: s.width, height: s.height,
          borderRadius: s.height, backgroundColor: `rgba(138,128,112,${s.opacity})`,
          transform: [{ translateX: s.anim.interpolate({ inputRange: [0, 1], outputRange: [-s.width - 10, W + 10] }) }],
          opacity: s.anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        }} />
      ))}

      {leaves.map((l, i) => (
        <Animated.View key={`wl${i}`} style={{
          position: 'absolute', top: l.startY, width: l.size, height: l.size * 0.6,
          borderRadius: l.size * 0.2, backgroundColor: 'rgba(138,128,112,0.2)',
          transform: [
            { translateX: l.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, W + 20] }) },
            { translateY: l.anim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -l.wobble, l.wobble * 0.5, -l.wobble * 0.3, l.wobble * 0.2] }) },
            { rotate: l.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
          ],
          opacity: l.anim.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.5, 0.4, 0] }),
        }} />
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AMBIENT DUST — default for mild / partial cloud conditions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AmbientDust() {
  const count = 10;
  const particles = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(Math.random()),
      left: Math.random() * W,
      startY: H * 0.3 + Math.random() * H * 0.5,
      duration: 8000 + Math.random() * 7000,
      size: 1.5 + Math.random() * 2.5,
      driftX: (Math.random() - 0.5) * 50,
      maxOp: 0.08 + Math.random() * 0.15,
    }))
  ).current;

  const ambientPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1, duration: p.duration, delay: Math.random() * 3000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }).start(() => { p.left = Math.random() * W; p.startY = H * 0.3 + Math.random() * H * 0.5; loop(); });
      };
      loop();
    });

    Animated.loop(Animated.sequence([
      Animated.timing(ambientPulse, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(ambientPulse, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', top: -H * 0.1, right: -W * 0.15,
        width: W * 0.6, height: W * 0.6, borderRadius: W * 0.3,
        backgroundColor: 'rgba(200,195,180,0.03)',
        opacity: ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
        transform: [{ scale: ambientPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
      }} />

      {particles.map((p, i) => (
        <Animated.View key={`ad${i}`} style={{
          position: 'absolute', left: p.left, top: p.startY,
          width: p.size, height: p.size, borderRadius: p.size / 2,
          backgroundColor: 'rgba(138,128,112,0.3)',
          opacity: p.anim.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, p.maxOp, p.maxOp * 0.5, p.maxOp * 0.7, 0] }),
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70 - Math.random() * 50] }) },
            { translateX: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.driftX, p.driftX * 0.3] }) },
          ],
        }} />
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
