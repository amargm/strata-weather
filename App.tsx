import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
  NativeModules,
  Platform,
  Animated as RNAnimated,
  Linking,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { useLocation } from './src/hooks/useLocation';
import { useWeather } from './src/hooks/useWeather';
import { NowScreen } from './src/screens/NowScreen';
import { AtmosphereScreen } from './src/screens/AtmosphereScreen';
import { HourlyScreen } from './src/screens/HourlyScreen';
import { ScienceScreen } from './src/screens/ScienceScreen';
import { theme } from './src/utils/theme';
import { sw, sh } from './src/utils/responsive';
import { WEATHER_CODES } from './src/utils/constants';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { WeatherEffects } from './src/components/WeatherEffects';
import { getExpressiveDescription, getSeasonalColors } from './src/utils/weatherPoetry';
import { LoadingScreen } from './src/components/LoadingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { PaywallModal } from './src/components/PaywallModal';
import { CitySearchModal } from './src/components/CitySearchModal';
import { UserProvider, AuthState } from './src/context/UserContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LAYER_LABELS = ['Now', 'Atmosphere', 'Timeline', 'Science'];
const LAST_LAYER_KEY = 'strata_last_layer';
const ONBOARDED_KEY = 'strata_onboarded';
const AUTH_KEY = 'strata_auth_state'; // 'signed_in' | 'guest' | null

// Layers 1 (Atmosphere) and 3 (Science) have dark backgrounds
const DARK_LAYERS = new Set([1, 3]);

const LOADING_TIPS = [
  'Reading the sky...',
  'Checking the clouds...',
  'Measuring humidity...',
  'Feeling the wind...',
  'Sampling the air...',
  'Tracking the sun...',
  'Listening to the atmosphere...',
];

/** Map raw API error to friendly message + suggestion */
function friendlyError(raw: string): { title: string; body: string } {
  const lower = raw.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch'))
    return { title: 'No connection', body: 'Check your Wi-Fi or mobile data and try again.' };
  if (lower.includes('permission') || lower.includes('denied'))
    return { title: 'Location blocked', body: 'Open Settings and allow location access for Strata.' };
  if (lower.includes('401') || lower.includes('api key'))
    return { title: 'Authentication issue', body: 'The weather service rejected our key. Try updating the app.' };
  if (lower.includes('429') || lower.includes('rate'))
    return { title: 'Too many requests', body: 'The weather service is busy. Wait a minute and retry.' };
  if (lower.includes('timeout'))
    return { title: 'Request timed out', body: 'The server took too long. Check your connection and retry.' };
  if (lower.includes('500') || lower.includes('503'))
    return { title: 'Server trouble', body: 'The weather service is having issues. Try again shortly.' };
  return { title: 'Something went wrong', body: raw.length > 80 ? 'Could not load weather data. Please try again.' : raw };
}

export default function App(props: { initialLayer?: number }) {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay-Black': PlayfairDisplay_900Black,
    'PlayfairDisplay-Italic': PlayfairDisplay_400Regular_Italic,
    'SpaceMono-Regular': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

  // --- Auth gate ---
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then(val => {
      // Validate stored value — only accept known states
      if (val === 'signed_in' || val === 'guest') {
        setAuthState(val);
      } else {
        // Unknown/corrupted value → force re-auth
        if (val != null) AsyncStorage.removeItem(AUTH_KEY);
        setAuthState('none');
      }
    });
  }, []);

  const handleSignIn = useCallback(() => {
    // TODO: Replace with real auth flow (Firebase/Supabase)
    AsyncStorage.setItem(AUTH_KEY, 'signed_in');
    setAuthState('signed_in');
  }, []);

  const handleGuest = useCallback(() => {
    AsyncStorage.setItem(AUTH_KEY, 'guest');
    setAuthState('guest');
  }, []);

  const handleSignOut = useCallback(() => {
    AsyncStorage.removeItem(AUTH_KEY);
    setAuthState('none');
  }, []);

  const handleShowPaywall = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  const handleUpgrade = useCallback(() => {
    // Dummy upgrade: promote guest → signed_in (pro)
    AsyncStorage.setItem(AUTH_KEY, 'signed_in');
    setAuthState('signed_in');
    setPaywallVisible(false);
  }, []);

  const isPro = authState === 'signed_in';
  const authPassed = authState === 'signed_in' || authState === 'guest';

  // UserContext value — memoized to avoid re-renders
  const userContextValue = useMemo(() => ({
    authState,
    isPro,
    showPaywall: handleShowPaywall,
    signOut: handleSignOut,
  }), [authState, isPro, handleShowPaywall, handleSignOut]);

  // Only request location after auth is resolved (privacy: don't ask before user consents)
  const { coords, locationName, loading: locLoading } = useLocation(authPassed);

  // City search override
  const [customCoords, setCustomCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customCityName, setCustomCityName] = useState<string | null>(null);
  const [citySearchVisible, setCitySearchVisible] = useState(false);

  const effectiveCoords = customCoords || coords;
  const effectiveLocationName = customCityName || locationName;

  const { data, loading: weatherLoading, error, refresh } = useWeather(effectiveCoords);

  // --- Loading tip rotation ---
  const [tipIndex, setTipIndex] = useState(0);
  const tipFade = useRef(new RNAnimated.Value(1)).current;

  // --- Splash screen (show on every app open) ---
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new RNAnimated.Value(1)).current;
  const splashScale = useRef(new RNAnimated.Value(1)).current;
  const splashReady = useRef(false);
  const dataReady = useRef(false);

  const dismissSplash = useCallback(() => {
    if (!splashReady.current) return;
    RNAnimated.parallel([
      RNAnimated.timing(splashScale, {
        toValue: 1.15,
        duration: 700,
        useNativeDriver: true,
      }),
      RNAnimated.timing(splashOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSplash(false));
  }, []);

  // Minimum splash display: 1.8s
  useEffect(() => {
    const timer = setTimeout(() => {
      splashReady.current = true;
      // If data already loaded, dismiss now
      if (dataReady.current) dismissSplash();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // When data arrives, dismiss splash (if min time elapsed)
  useEffect(() => {
    if (data && !dataReady.current) {
      dataReady.current = true;
      if (splashReady.current) dismissSplash();
    }
  }, [data]);

  useEffect(() => {
    if (!showSplash && !(locLoading || weatherLoading)) return;
    const interval = setInterval(() => {
      RNAnimated.timing(tipFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
        RNAnimated.timing(tipFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [showSplash, locLoading, weatherLoading]);

  // --- Sync weather data to Android widget ---
  useEffect(() => {
    if (!data?.current || !effectiveCoords || Platform.OS !== 'android') return;
    try {
      const w = data.current;
      const code = w.weatherCode || 1000;
      const condition = WEATHER_CODES[code]?.label || 'Clear';
      const hiTemp = data.daily?.[0]?.values?.temperatureMax ?? w.temperature + 2;
      const loTemp = data.daily?.[0]?.values?.temperatureMin ?? w.temperature - 2;

      NativeModules.AppConfig?.saveWidgetData(
        effectiveLocationName || 'Unknown',
        w.temperature || 0,
        w.temperatureApparent || 0,
        hiTemp,
        loTemp,
        w.humidity || 0,
        w.windSpeed || 0,
        w.uvIndex || 0,
        w.precipitationProbability || 0,
        code,
        condition,
        effectiveCoords.latitude,
        effectiveCoords.longitude,
      );
    } catch (e) {
      // Widget sync is non-critical
    }
  }, [data, effectiveLocationName, effectiveCoords]);

  // --- Scroll + layer state ---
  const scrollY = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [currentLayer, setCurrentLayer] = useState(0);
  const prevLayerRef = useRef(0);

  // --- Navigation + onboarding ---
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintFade = useRef(new RNAnimated.Value(0)).current;

  // Check if first launch → show swipe hint
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then(val => {
      if (!val) {
        setShowSwipeHint(true);
        RNAnimated.timing(swipeHintFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => {
          RNAnimated.timing(swipeHintFade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
            setShowSwipeHint(false);
          });
          AsyncStorage.setItem(ONBOARDED_KEY, '1');
        }, 4000);
        return () => clearTimeout(timer);
      }
    });
  }, []);



  const onScrollEnd = useCallback((event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
    setCurrentLayer(page);
    AsyncStorage.setItem(LAST_LAYER_KEY, String(page));
    // Haptic on layer change
    if (page !== prevLayerRef.current) {
      prevLayerRef.current = page;
      Haptics.selectionAsync();
      // Dismiss swipe hint on first scroll
      if (showSwipeHint) {
        RNAnimated.timing(swipeHintFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setShowSwipeHint(false);
        });
        AsyncStorage.setItem(ONBOARDED_KEY, '1');
      }
    }
  }, [showSwipeHint, swipeHintFade]);

  const goToLayer = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ y: index * SCREEN_HEIGHT, animated: true });
    setCurrentLayer(index);
    AsyncStorage.setItem(LAST_LAYER_KEY, String(index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Restore last viewed layer (deep-link from widget takes priority)
  useEffect(() => {
    const deepLinkLayer = props.initialLayer;
    if (deepLinkLayer != null && deepLinkLayer > 0 && deepLinkLayer < LAYER_LABELS.length) {
      setCurrentLayer(deepLinkLayer);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: deepLinkLayer * SCREEN_HEIGHT, animated: false });
      }, 100);
      return;
    }
    AsyncStorage.getItem(LAST_LAYER_KEY).then(val => {
      const layer = parseInt(val || '0', 10);
      if (layer > 0 && layer < LAYER_LABELS.length) {
        setCurrentLayer(layer);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: layer * SCREEN_HEIGHT, animated: false });
        }, 100);
      }
    });
  }, []);

  // Handle deep-links when app is already running (singleTask onNewIntent)
  useEffect(() => {
    const parseAndNavigate = (url: string | null) => {
      if (!url) return;
      const match = url.match(/strata:\/\/weather\/layer\/(\d+)/);
      if (match) {
        const layer = parseInt(match[1], 10);
        if (layer >= 0 && layer < LAYER_LABELS.length) {
          goToLayer(layer);
        }
      }
    };
    const sub = Linking.addEventListener('url', ({ url }) => parseAndNavigate(url));
    return () => sub.remove();
  }, [goToLayer]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Track nearest layer in real-time during scroll for smooth nav updates
  useAnimatedReaction(
    () => {
      const page = Math.round(scrollY.value / SCREEN_HEIGHT);
      return Math.max(0, Math.min(page, LAYER_LABELS.length - 1));
    },
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(setCurrentLayer)(current);
      }
    },
    []
  );

  // --- Parallax animated styles for each layer ---
  const makeLayerStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_HEIGHT,
        index * SCREEN_HEIGHT,
        (index + 1) * SCREEN_HEIGHT,
      ];
      const opacity = interpolate(
        scrollY.value,
        inputRange,
        [0.3, 1, 0.3],
        Extrapolation.CLAMP,
      );
      const translateY = interpolate(
        scrollY.value,
        inputRange,
        [30, 0, -30],
        Extrapolation.CLAMP,
      );
      return { opacity, transform: [{ translateY }] };
    });
  };

  const layer0Style = makeLayerStyle(0);
  const layer1Style = makeLayerStyle(1);
  const layer2Style = makeLayerStyle(2);
  const layer3Style = makeLayerStyle(3);
  const layerStyles = [layer0Style, layer1Style, layer2Style, layer3Style];

  // --- Scroll-driven dot indicator animations (vertical pills) ---
  const makeDotAnimStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const progress = scrollY.value / SCREEN_HEIGHT;
      const dist = Math.abs(progress - index);
      const active = interpolate(dist, [0, 0.5], [1, 0], Extrapolation.CLAMP);
      return {
        height: interpolate(active, [0, 1], [6, 20], Extrapolation.CLAMP),
        opacity: interpolate(active, [0, 1], [0.35, 1], Extrapolation.CLAMP),
        backgroundColor: interpolateColor(active, [0, 1], ['#8a8070', '#c4411c']),
      };
    });
  };
  const dotAnim0 = makeDotAnimStyle(0);
  const dotAnim1 = makeDotAnimStyle(1);
  const dotAnim2 = makeDotAnimStyle(2);
  const dotAnim3 = makeDotAnimStyle(3);
  const dotAnimStyles = [dotAnim0, dotAnim1, dotAnim2, dotAnim3];

  // --- Derived values ---
  const seasonalColors = useMemo(() => getSeasonalColors(), []);
  const expressiveDesc = useMemo(() => {
    if (!data?.current) return '';
    const code = data.current.weatherCode || 1000;
    const label = WEATHER_CODES[code]?.label || 'Clear';
    return getExpressiveDescription(data.current, label);
  }, [data?.current]);

  // --- Refresh with haptic ---
  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    refresh();
  }, [refresh]);

  const handleCitySelect = useCallback((city: { name: string; lat: number; lon: number; country: string; state?: string }) => {
    setCustomCoords({ latitude: city.lat, longitude: city.lon });
    setCustomCityName(`${city.name}${city.state ? ', ' + city.state : ''}`);
    setCitySearchVisible(false);
  }, []);

  const handleResetLocation = useCallback(() => {
    setCustomCoords(null);
    setCustomCityName(null);
  }, []);

  // --- Show splash while fonts load ---
  if (!fontsLoaded || authState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <LoadingScreen tipIndex={tipIndex} tipFade={tipFade} />
      </View>
    );
  }

  // --- Auth gate ---
  if (authState === 'none') {
    return <AuthScreen onSignIn={handleSignIn} onGuest={handleGuest} />;
  }

  // Show splash as full-screen takeover — always first thing user sees
  if (showSplash) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <RNAnimated.View style={[styles.splashFull, { opacity: splashOpacity, transform: [{ scale: splashScale }] }]}>
          <LoadingScreen tipIndex={tipIndex} tipFade={tipFade} />
        </RNAnimated.View>
      </View>
    );
  }

  if ((locLoading || weatherLoading) && !data) {
    return (
      <View style={styles.loadingContainer} accessible accessibilityRole="progressbar" accessibilityLabel="Loading weather data">
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <LoadingScreen tipIndex={tipIndex} tipFade={tipFade} />
      </View>
    );
  }

  // --- Friendly error screen (animated splash with error text) ---
  if (error && !data) {
    const { title, body } = friendlyError(error);
    const errorPoetry = 'my eyes unable to read the sky…';
    const technicalDetail = `${title} — ${body}`;
    return (
      <View style={styles.loadingContainer} accessible accessibilityRole="alert">
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <LoadingScreen
          tipIndex={tipIndex}
          tipFade={tipFade}
          errorMessage={errorPoetry}
          errorDetail={technicalDetail}
          onExit={() => BackHandler.exitApp()}
        />
      </View>
    );
  }

  const highTemp = data?.daily?.[0]?.values?.temperatureMax;
  const lowTemp = data?.daily?.[0]?.values?.temperatureMin;

  return (
    <UserProvider value={userContextValue}>
    <View style={styles.root}>
      <StatusBar
        barStyle={DARK_LAYERS.has(currentLayer) ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
        animated
      />

      {/* Vertical paging scroll */}
      <Animated.ScrollView
        ref={scrollRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
      >
        {/* Layer 0: Now */}
        <View style={{ height: SCREEN_HEIGHT, overflow: 'hidden', backgroundColor: theme.colors.paper }}>
          <Animated.View style={[{ flex: 1 }, layerStyles[0]]}>
            <ErrorBoundary layerName="Now">
              <NowScreen
                weather={data?.current || null}
                locationName={effectiveLocationName}
                highTemp={highTemp}
                lowTemp={lowTemp}
                expressiveDescription={expressiveDesc}
                seasonalColors={seasonalColors}
                onRefresh={handleRefresh}
                sunriseTime={data?.sunriseTime}
                sunsetTime={data?.sunsetTime}
                dataTimestamp={data?.dataTimestamp}
                comfortIndex={data?.comfortIndex}
                outdoorScore={data?.outdoorScore}
                timezoneOffset={data?.timezoneOffset}
                cityTempMin={data?.cityTempMin}
                cityTempMax={data?.cityTempMax}
                onCitySearch={() => setCitySearchVisible(true)}
                isCustomLocation={!!customCoords}
                onResetLocation={handleResetLocation}
              />
            </ErrorBoundary>
          </Animated.View>
        </View>

        {/* Layer 1: Atmosphere */}
        <View style={{ height: SCREEN_HEIGHT, overflow: 'hidden', backgroundColor: theme.colors.ink }}>
          <Animated.View style={[{ flex: 1 }, layerStyles[1]]}>
            <ErrorBoundary layerName="Atmosphere">
              <AtmosphereScreen
                weather={data?.current || null}
                pressureTrend={data?.pressureTrend}
                airQuality={data?.airQuality}
                dataTimestamp={data?.dataTimestamp}
                seaLevelPressure={data?.seaLevelPressure}
              />
            </ErrorBoundary>
          </Animated.View>
        </View>

        {/* Layer 2: Timeline (Hourly + Forecast merged) */}
        <View style={{ height: SCREEN_HEIGHT, overflow: 'hidden', backgroundColor: theme.colors.paperDark }}>
          <Animated.View style={[{ flex: 1 }, layerStyles[2]]}>
            <ErrorBoundary layerName="Timeline">
              <HourlyScreen
                hourly={data?.hourly || []}
                currentWind={data?.current || null}
                daily={data?.daily || []}
              />
            </ErrorBoundary>
          </Animated.View>
        </View>

        {/* Layer 3: Science */}
        <View style={{ height: SCREEN_HEIGHT, overflow: 'hidden', backgroundColor: theme.colors.ink }}>
          <Animated.View style={[{ flex: 1 }, layerStyles[3]]}>
            <ErrorBoundary layerName="Science">
              <ScienceScreen
                weather={data?.current || null}
                today={data?.daily?.[0] || null}
              />
            </ErrorBoundary>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Navigation dots — vertical, right side, centered */}
      <View style={styles.navContainer}>
        <View style={styles.dotsRow}>
          {LAYER_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToLayer(i)}
              hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
              accessibilityLabel={`Go to ${label} layer, ${i + 1} of ${LAYER_LABELS.length}`}
              accessibilityRole="button"
              accessibilityState={{ selected: currentLayer === i }}
            >
              <Animated.View style={[styles.dot, dotAnimStyles[i]]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* First-launch swipe hint */}
      {showSwipeHint && (
        <RNAnimated.View style={[styles.swipeHint, { opacity: swipeHintFade }]} accessible accessibilityRole="text" accessibilityLabel="Swipe up to explore layers">
          <Text style={styles.swipeHintArrow} importantForAccessibility="no">↕</Text>
          <Text style={styles.swipeHintText}>Swipe up to explore layers</Text>
        </RNAnimated.View>
      )}

      {/* Paywall modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUpgrade={handleUpgrade}
      />

      {/* City search modal */}
      <CitySearchModal
        visible={citySearchVisible}
        onClose={() => setCitySearchVisible(false)}
        onSelect={handleCitySelect}
      />

    </View>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navContainer: {
    position: 'absolute',
    right: sw(16),
    bottom: sh(40),
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: sh(10),
  },
  dot: {
    width: 6,
    borderRadius: 3,
  },
  swipeHint: {
    position: 'absolute',
    bottom: sh(90),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintArrow: {
    fontSize: 20,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  swipeHintText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  splashFull: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },

});
