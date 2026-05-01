import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StatusBar,
  NativeModules,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
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
import { ForecastScreen } from './src/screens/ForecastScreen';
import { ScienceScreen } from './src/screens/ScienceScreen';
import { theme } from './src/utils/theme';
import { WEATHER_CODES } from './src/utils/constants';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LAYER_LABELS = ['Now', 'Atmosphere', 'Hourly', '7-Day', 'Deep Data'];

export default function App() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay-Black': PlayfairDisplay_900Black,
    'PlayfairDisplay-Italic': PlayfairDisplay_400Regular_Italic,
    'SpaceMono-Regular': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

  const { coords, locationName, loading: locLoading } = useLocation();
  const { data, loading: weatherLoading, error, refresh } = useWeather(coords);

  // Sync weather data to Android widget via SharedPreferences
  useEffect(() => {
    if (!data?.current || !coords || Platform.OS !== 'android') return;
    try {
      const w = data.current;
      const code = w.weatherCode || 0;
      const condition = WEATHER_CODES[code]?.label || 'Unknown';
      const hiTemp = data.daily?.[0]?.values?.temperatureMax ?? w.temperature + 2;
      const loTemp = data.daily?.[0]?.values?.temperatureMin ?? w.temperature - 2;

      NativeModules.AppConfig?.saveWidgetData(
        locationName || 'Unknown',
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
        coords.latitude,
        coords.longitude,
      );
    } catch (e) {
      // Widget sync is non-critical
    }
  }, [data, locationName, coords]);

  const scrollY = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [currentLayer, setCurrentLayer] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      const page = Math.round(event.contentOffset.y / SCREEN_HEIGHT);
      // Update current layer on JS thread
    },
  });

  const onScrollEnd = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
    setCurrentLayer(page);
  };

  const goToLayer = (index: number) => {
    scrollRef.current?.scrollTo({ y: index * SCREEN_HEIGHT, animated: true });
    setCurrentLayer(index);
  };

  if (!fontsLoaded) return null;

  if (locLoading || weatherLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <ActivityIndicator size="large" color={theme.colors.ink} />
        <Text style={styles.loadingText}>Reading the sky...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const highTemp = data?.daily?.[0]?.values?.temperatureMax;
  const lowTemp = data?.daily?.[0]?.values?.temperatureMin;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={currentLayer === 0 || currentLayer === 2 || currentLayer === 3 ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
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
        <View style={{ height: SCREEN_HEIGHT }}>
          <ErrorBoundary layerName="Now">
            <NowScreen
              weather={data?.current || null}
              locationName={locationName}
              highTemp={highTemp}
              lowTemp={lowTemp}
            />
          </ErrorBoundary>
        </View>

        {/* Layer 1: Atmosphere */}
        <View style={{ height: SCREEN_HEIGHT }}>
          <ErrorBoundary layerName="Atmosphere">
            <AtmosphereScreen weather={data?.current || null} />
          </ErrorBoundary>
        </View>

        {/* Layer 2: Hourly */}
        <View style={{ height: SCREEN_HEIGHT }}>
          <ErrorBoundary layerName="Hourly">
            <HourlyScreen
              hourly={data?.hourly || []}
              currentWind={data?.current || null}
            />
          </ErrorBoundary>
        </View>

        {/* Layer 3: 7-Day Forecast */}
        <View style={{ height: SCREEN_HEIGHT }}>
          <ErrorBoundary layerName="7-Day">
            <ForecastScreen daily={data?.daily || []} />
          </ErrorBoundary>
        </View>

        {/* Layer 4: Science */}
        <View style={{ height: SCREEN_HEIGHT }}>
          <ErrorBoundary layerName="Deep Data">
            <ScienceScreen
              weather={data?.current || null}
              today={data?.daily?.[0] || null}
            />
          </ErrorBoundary>
        </View>
      </Animated.ScrollView>

      {/* Dots navigation */}
      <View style={styles.dotsNav}>
        {LAYER_LABELS.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => goToLayer(i)}
            style={[
              styles.dot,
              currentLayer === i && styles.dotActive,
            ]}
          />
        ))}
      </View>

    </View>
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
    gap: 16,
  },
  loadingText: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 16,
    color: theme.colors.muted,
  },
  errorText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.accent,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: 2,
  },
  retryText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.ink,
  },
  dotsNav: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.muted,
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },

});
