import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import type { Shuttle } from '../../types/domain';

type ShuttleCardProps = {
  shuttle: Shuttle;
};

export function ShuttleCard({ shuttle }: ShuttleCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.route}>{shuttle.routeName}</Text>
      <Text style={styles.meta}>Partenza: {shuttle.departureTime}</Text>
      <Text style={styles.seats}>Posti disponibili: {shuttle.seatsAvailable}</Text>
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
    gap: 4
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
  }
});
