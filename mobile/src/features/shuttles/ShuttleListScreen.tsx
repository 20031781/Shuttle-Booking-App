import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { createBookingRepository } from '../../api/bookingRepository';
import { createShuttleRepository } from '../../api/shuttleRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { SkeletonBlock } from '../../components/SkeletonBlock';
import { t } from '../../i18n';
import { colors } from '../../theme/colors';
import type { Shuttle } from '../../types/domain';
import { ShuttleCard } from './ShuttleCard';

const shuttleRepository = createShuttleRepository();
const bookingRepository = createBookingRepository();
const skeletonCards = Array.from({ length: 3 }, (_, index) => `skeleton-${index}`);
const realtimeRefreshIntervalMs = 15_000;

function ShuttleListSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {skeletonCards.map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <SkeletonBlock style={styles.skeletonRoute} />
          <SkeletonBlock style={styles.skeletonMeta} />
          <SkeletonBlock style={styles.skeletonSeats} />
        </View>
      ))}
    </View>
  );
}

export function ShuttleListScreen() {
  const [items, setItems] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingInProgressId, setBookingInProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadShuttles() {
    setError(null);

    try {
      const shuttles = await shuttleRepository.list();
      setItems(shuttles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.shuttles.loadErrorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleBook(shuttle: Shuttle) {
    setNotice(null);
    setError(null);
    setBookingInProgressId(shuttle.id);

    try {
      const booking = await bookingRepository.create(shuttle.id);
      setNotice(t.shuttles.bookingConfirmed(shuttle.routeName, booking.seatsRemaining ?? shuttle.seatsAvailable));
      await loadShuttles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.shuttles.bookingErrorMessage);
    } finally {
      setBookingInProgressId(null);
    }
  }

  useEffect(() => {
    void loadShuttles();
  }, []);

  useEffect(() => {
    if (loading || refreshing || bookingInProgressId) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadShuttles();
    }, realtimeRefreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [loading, refreshing, bookingInProgressId]);

  return (
    <PageContainer>
      <SectionTitle title={t.shuttles.title} subtitle={t.shuttles.subtitle} />
      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
      {loading ? (
        <ShuttleListSkeleton />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t.shuttles.loadErrorTitle}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRefreshing(true);
              void loadShuttles();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryText}>{t.shuttles.retry}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>{t.shuttles.empty}</Text>
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <ShuttleCard
              shuttle={item}
              bookingInProgress={bookingInProgressId === item.id}
              onBook={handleBook}
            />
          )}
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
  skeletonList: {
    gap: 10
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  skeletonRoute: {
    width: '78%',
    height: 18,
    borderRadius: 9
  },
  skeletonMeta: {
    width: '52%',
    height: 14,
    borderRadius: 7
  },
  skeletonSeats: {
    width: '43%',
    height: 14,
    borderRadius: 7
  },
  separator: {
    height: 10
  },
  noticeText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600'
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
