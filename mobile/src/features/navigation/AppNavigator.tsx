import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { colors } from '../../theme/colors';
import { BookingHistoryScreen } from '../bookings/BookingHistoryScreen';
import { ProfileScreen } from '../profile/ProfileScreen';
import { ShuttleListScreen } from '../shuttles/ShuttleListScreen';

export type AppSection = 'shuttle' | 'bookings' | 'profile';

type AppNavigatorProps = {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
};

function TabButton({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function AppNavigator({ section, onSectionChange }: AppNavigatorProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        {section === 'shuttle' ? (
          <ShuttleListScreen />
        ) : section === 'bookings' ? (
          <BookingHistoryScreen />
        ) : (
          <ProfileScreen />
        )}
      </View>
      <View style={styles.tabs}>
        <TabButton
          label={t.app.sections.shuttle}
          active={section === 'shuttle'}
          onPress={() => onSectionChange('shuttle')}
        />
        <TabButton
          label={t.app.sections.bookings}
          active={section === 'bookings'}
          onPress={() => onSectionChange('bookings')}
        />
        <TabButton
          label={t.app.sections.profile}
          active={section === 'profile'}
          onPress={() => onSectionChange('profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#eef0ff'
  },
  tabText: {
    color: colors.subtleText,
    fontWeight: '600'
  },
  tabTextActive: {
    color: colors.primary
  }
});
