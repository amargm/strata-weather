import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing, AccessibilityInfo } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WeatherEffectsProps {
  weatherCode: number;
  cloudCover: number;
}

/**
 * Subtle animated weather overlay effects that respond to current conditions.
 * Rain drops, snow flakes, sun rays, or cloud drift depending on weather code.
 */
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

  // Skip all decorative animations when reduce motion is enabled
  if (reduceMotion) return null;

  const isRain = [4000, 4001, 4200, 4201, 6000, 6001, 6200, 6201].includes(weatherCode);
  const isSnow = [5000, 5001, 5100, 5101, 7000, 7101, 7102].includes(weatherCode);
  const isClear = [1000, 1100].includes(weatherCode);
  const isCloudy = cloudCover > 60 || [1001, 1102].includes(weatherCode);

  if (isRain) return <RainEffect heavy={[4001, 4201, 6001, 6201].includes(weatherCode)} />;
  if (isSnow) return <SnowEffect />;
  if (isClear) return <SunRaysEffect />;
  if (isCloudy) return <CloudDriftEffect />;
  return null;
});

/** Falling rain streaks */
function RainEffect({ heavy }: { heavy: boolean }) {
  const count = heavy ? 18 : 10;
  const drops = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 2000,
      duration: 800 + Math.random() * 600,
    }))
  ).current;

  useEffect(() => {
    drops.forEach((drop) => {
      const loop = () => {
        drop.anim.setValue(0);
        Animated.timing(drop.anim, {
          toValue: 1,
          duration: drop.duration,
          delay: drop.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          drop.delay = 0;
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
          key={i}
          style={[
            styles.rainDrop,
            {
              left: drop.left,
              opacity: drop.anim.interpolate({
                inputRange: [0, 0.1, 0.8, 1],
                outputRange: [0, 0.3, 0.3, 0],
              }),
              transform: [
                {
                  translateY: drop.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, SCREEN_HEIGHT + 20],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Falling snow flakes */
function SnowEffect() {
  const flakes = useRef(
    Array.from({ length: 12 }, () => ({
      anim: new Animated.Value(0),
      left: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 3000,
      duration: 4000 + Math.random() * 3000,
      drift: (Math.random() - 0.5) * 60,
    }))
  ).current;

  useEffect(() => {
    flakes.forEach((flake) => {
      const loop = () => {
        flake.anim.setValue(0);
        Animated.timing(flake.anim, {
          toValue: 1,
          duration: flake.duration,
          delay: flake.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          flake.delay = 0;
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
          style={[
            styles.snowFlake,
            {
              left: flake.left,
              opacity: flake.anim.interpolate({
                inputRange: [0, 0.1, 0.85, 1],
                outputRange: [0, 0.4, 0.4, 0],
              }),
              transform: [
                {
                  translateY: flake.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, SCREEN_HEIGHT + 10],
                  }),
                },
                {
                  translateX: flake.anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, flake.drift, 0],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Subtle radial sun rays that slowly rotate */
function SunRaysEffect() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.sunRays,
          { transform: [{ rotate: spin }] },
        ]}
      >
        {[0, 45, 90, 135].map((deg) => (
          <View
            key={deg}
            style={[
              styles.sunRay,
              { transform: [{ rotate: `${deg}deg` }] },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Slow horizontal cloud drift */
function CloudDriftEffect() {
  const clouds = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      anim: new Animated.Value(0),
      top: 60 + i * 120 + Math.random() * 50,
      duration: 25000 + i * 10000,
      width: 80 + Math.random() * 60,
      height: 20 + Math.random() * 15,
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
          style={[
            styles.cloud,
            {
              top: cloud.top,
              width: cloud.width,
              height: cloud.height,
              borderRadius: cloud.height,
              transform: [
                {
                  translateX: cloud.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-cloud.width, SCREEN_WIDTH + cloud.width],
                  }),
                },
              ],
            },
          ]}
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
  rainDrop: {
    position: 'absolute',
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(28,93,196,0.25)',
    borderRadius: 1,
  },
  snowFlake: {
    position: 'absolute',
    width: 5,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
  },
  sunRays: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunRay: {
    position: 'absolute',
    width: 260,
    height: 1,
    backgroundColor: 'rgba(228,168,56,0.06)',
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(15,14,12,0.03)',
  },
});
