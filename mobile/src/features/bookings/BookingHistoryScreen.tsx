import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { createBookingRepository } from '../../api/bookingRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { SkeletonBlock } from '../../components/SkeletonBlock';
import { t } from '../../i18n';
import { colors } from '../../theme/colors';
import type { Booking } from '../../types/domain';

const bookingRepository = createBookingRepository();
const skeletonRows = Array.from({ length: 3 }, (_, index) => `booking-skeleton-${index}`);

function BookingHistorySkeleton() {
  return (
    <View style={styles.skeletonList}>
      {skeletonRows.map((rowId) => (
        <View key={rowId} style={styles.card}>
          <SkeletonBlock style={styles.skeletonTitle} />
          <SkeletonBlock style={styles.skeletonDate} />
          <SkeletonBlock style={styles.skeletonStatus} />
        </View>
      ))}
    </View>
  );
}

function formatDate(dateIso: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return dateIso;
  }

  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function BookingHistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBookings() {
    setError(null);

    try {
      const history = await bookingRepository.list();
      setBookings(history);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.bookings.historyLoadErrorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleCancel(booking: Booking) {
    setCancelingId(booking.id);
    setError(null);

    try {
      await bookingRepository.cancel(booking.id);
      await loadBookings();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.bookings.cancelErrorMessage);
    } finally {
      setCancelingId(null);
    }
  }

  useEffect(() => {
    void loadBookings();
  }, []);

  return (
    <PageContainer>
      <SectionTitle title={t.bookings.title} subtitle={t.bookings.subtitle} />
      {loading ? (
        <BookingHistorySkeleton />
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>{t.bookings.historyLoadErrorTitle}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRefreshing(true);
              void loadBookings();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryText}>{t.bookings.retry}</Text>
          </Pressable>
        </View>
      ) : bookings.length === 0 ? (
        <Text style={styles.emptyText}>{t.bookings.empty}</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.skeletonList}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadBookings();
          }}
          renderItem={({ item }) => {
            const canCancel = item.status === 'active';
            const inProgress = cancelingId === item.id;
            const statusLabel = canCancel ? t.bookings.statusActive : t.bookings.statusCanceled;

            return (
              <View style={styles.card}>
                <Text style={styles.title}>{item.shuttleName}</Text>
                <Text style={styles.date}>
                  {t.bookings.dateLabel}: {formatDate(item.date)}
                </Text>
                <Text style={[styles.status, canCancel ? styles.statusActive : styles.statusCanceled]}>
                  {t.bookings.statusLabel}: {statusLabel}
                </Text>
                {canCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={inProgress}
                    onPress={() => {
                      void handleCancel(item);
                    }}
                    style={[styles.cancelButton, inProgress && styles.cancelButtonDisabled]}>
                    <Text style={styles.cancelText}>{inProgress ? t.bookings.canceling : t.bookings.cancel}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  skeletonList: {
    gap: 10,
    paddingBottom: 24
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  skeletonTitle: {
    width: '72%',
    height: 18,
    borderRadius: 9
  },
  skeletonDate: {
    width: '45%',
    height: 14,
    borderRadius: 7
  },
  skeletonStatus: {
    width: '38%',
    height: 14,
    borderRadius: 7
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  },
  date: {
    color: colors.subtleText,
    fontSize: 14
  },
  status: {
    fontWeight: '600',
    fontSize: 13
  },
  statusActive: {
    color: colors.success
  },
  statusCanceled: {
    color: colors.subtleText
  },
  cancelButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  cancelButtonDisabled: {
    opacity: 0.5
  },
  cancelText: {
    color: colors.text,
    fontWeight: '600'
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
    color: colors.subtleText
  }
});
