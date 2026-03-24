import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { createShuttleRepository } from '../../api/shuttleRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { colors } from '../../theme/colors';
import type { Shuttle } from '../../types/domain';
import { ShuttleCard } from './ShuttleCard';

const repository = createShuttleRepository();

export function ShuttleListScreen() {
  const [items, setItems] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadShuttles() {
    setError(null);

    try {
      const shuttles = await repository.list();
      setItems(shuttles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Errore nel caricamento degli shuttle.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadShuttles();
  }, []);

  return (
    <PageContainer>
      <SectionTitle title="Shuttle" subtitle="Corse disponibili oggi" />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Impossibile caricare le corse</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRefreshing(true);
              void loadShuttles();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>Nessuna corsa disponibile.</Text>
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => <ShuttleCard shuttle={item} />}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Text style={styles.separator}> </Text>}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadShuttles();
          }}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24
  },
  separator: {
    height: 10
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  errorTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  },
  errorMessage: {
    color: colors.subtleText
  },
  retryButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  retryText: {
    color: colors.surface,
    fontWeight: '600'
  },
  emptyText: {
    color: colors.subtleText,
    fontSize: 15
  }
});
