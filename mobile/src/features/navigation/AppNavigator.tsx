import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { ProfileScreen } from '../profile/ProfileScreen';
import { ShuttleListScreen } from '../shuttles/ShuttleListScreen';

export type AppSection = 'Shuttle' | 'Profilo';

type AppNavigatorProps = {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
};

function TabButton({
  title,
  active,
  onPress
}: {
  title: AppSection;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}

export function AppNavigator({ section, onSectionChange }: AppNavigatorProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>{section === 'Shuttle' ? <ShuttleListScreen /> : <ProfileScreen />}</View>
      <View style={styles.tabs}>
        <TabButton title="Shuttle" active={section === 'Shuttle'} onPress={() => onSectionChange('Shuttle')} />
        <TabButton title="Profilo" active={section === 'Profilo'} onPress={() => onSectionChange('Profilo')} />
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
    paddingVertical: 14,
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
