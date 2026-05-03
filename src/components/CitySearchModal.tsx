import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../utils/theme';
import { GeocodingResult } from '../types/weather';
import { searchCities } from '../services/weatherApi';
import { sw, ms } from '../utils/responsive';

interface CitySearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: GeocodingResult) => void;
}

export function CitySearchModal({ visible, onClose, onSelect }: CitySearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const cities = await searchCities(text);
    setResults(cities);
    setLoading(false);
  }, []);

  const handleSelect = useCallback((city: GeocodingResult) => {
    onSelect(city);
    setQuery('');
    setResults([]);
  }, [onSelect]);

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Search City</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter city name..."
              placeholderTextColor={theme.colors.muted}
              value={query}
              onChangeText={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={theme.colors.accent} style={styles.spinner} />}
          </View>

          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultRow} onPress={() => handleSelect(item)}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultDetail}>
                  {item.state ? `${item.state}, ` : ''}{item.country}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length >= 2 && !loading ? (
                <Text style={styles.emptyText}>No cities found</Text>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sw(24),
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: theme.fonts.serifBold,
    fontSize: ms(18),
    color: theme.colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,14,12,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: theme.colors.ink,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: sw(24),
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.faint,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    color: theme.colors.ink,
    paddingVertical: 12,
  },
  spinner: {
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: sw(24),
  },
  resultRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.faint,
  },
  resultName: {
    fontFamily: theme.fonts.serifBold,
    fontSize: 15,
    color: theme.colors.ink,
  },
  resultDetail: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 20,
  },
});
