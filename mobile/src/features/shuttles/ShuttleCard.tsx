import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { colors } from '../../theme/colors';
import type { Shuttle } from '../../types/domain';

type ShuttleCardProps = {
  shuttle: Shuttle;
  bookingInProgress?: boolean;
  onBook?: (shuttle: Shuttle) => void;
};

export function ShuttleCard({ shuttle, bookingInProgress = false, onBook }: ShuttleCardProps) {
  const noSeats = shuttle.seatsAvailable < 1;
  const disabled = noSeats || bookingInProgress || !onBook;

  return (
    <View style={styles.card}>
      <Text style={styles.route}>{shuttle.routeName}</Text>
      <Text style={styles.meta}>
        {t.shuttles.departureLabel}: {shuttle.departureTime}
      </Text>
      <Text style={styles.seats}>
        {t.shuttles.seatsLabel}: {shuttle.seatsAvailable}
      </Text>
      {onBook ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onBook(shuttle)}
          style={[styles.bookButton, disabled && styles.bookButtonDisabled]}>
          <Text style={styles.bookButtonText}>
            {bookingInProgress ? t.shuttles.bookingInProgress : noSeats ? t.shuttles.full : t.shuttles.book}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6
  },
  route: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  },
  meta: {
    color: colors.subtleText,
    fontSize: 14
  },
  seats: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 14
  },
  bookButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bookButtonDisabled: {
    opacity: 0.45
  },
  bookButtonText: {
    color: colors.surface,
    fontWeight: '700'
  }
});
