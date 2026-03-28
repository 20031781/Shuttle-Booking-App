import type {ComponentProps} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {useAppTheme} from '../../theme/theme';
import {AdminOpsScreen} from '../admin/AdminOpsScreen';
import {BookingHistoryScreen} from '../bookings/BookingHistoryScreen';
import {ProfileScreen} from '../profile/ProfileScreen';
import {ShuttleListScreen} from '../shuttles/ShuttleListScreen';

export type AppSection = 'shuttle' | 'bookings' | 'admin' | 'profile';

type AppNavigatorProps = {
    section: AppSection;
    onSectionChange: (section: AppSection) => void;
};

type TabItem = {
    section: AppSection;
    label: string;
    iconName: ComponentProps<typeof Ionicons>['name'];
    activeIconName: ComponentProps<typeof Ionicons>['name'];
};

export function AppNavigator({section, onSectionChange}: AppNavigatorProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();

    const tabs: TabItem[] = [
        {
            section: 'shuttle',
            label: t.app.sections.shuttle,
            iconName: 'car-sport-outline',
            activeIconName: 'car-sport'
        },
        {
            section: 'bookings',
            label: t.app.sections.bookings,
            iconName: 'calendar-clear-outline',
            activeIconName: 'calendar-clear'
        },
        {
            section: 'admin',
            label: t.app.sections.admin,
            iconName: 'analytics-outline',
            activeIconName: 'analytics'
        },
        {
            section: 'profile',
            label: t.app.sections.profile,
            iconName: 'person-outline',
            activeIconName: 'person'
        }
    ];

    function renderTabButton(tab: TabItem) {
        const active = section === tab.section;

        return <Pressable
            key={tab.section}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSectionChange(tab.section)}>
            <Ionicons
                name={active ? tab.activeIconName : tab.iconName}
                size={20}
                color={active ? colors.tabIconActive : colors.tabIconInactive}
            />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
        </Pressable>;
    }

    return <View style={styles.wrapper}>
        <View style={styles.content}>
            {section === 'shuttle' ? <ShuttleListScreen/> : section === 'bookings' ?
                <BookingHistoryScreen/> : section === 'admin' ? <AdminOpsScreen/> : <ProfileScreen/>}
        </View>
        <View style={[styles.tabHost, {paddingBottom: Math.max(insets.bottom, 12)}]}>
            <View style={styles.tabs}>{tabs.map(renderTabButton)}</View>
        </View>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        wrapper: {
            flex: 1,
            backgroundColor: colors.background
        },
        content: {
            flex: 1,
            paddingBottom: 6
        },
        tabHost: {
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingTop: 6
        },
        tabs: {
            flexDirection: 'row',
            gap: 6,
            borderWidth: 1,
            borderColor: colors.tabBarBorder,
            backgroundColor: colors.tabBarBackground,
            borderRadius: 22,
            padding: 6
        },
        tab: {
            flex: 1,
            minHeight: 58,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2
        },
        tabActive: {
            backgroundColor: colors.primarySoft
        },
        tabText: {
            color: colors.tabIconInactive,
            fontSize: 12,
            fontWeight: '600'
        },
        tabTextActive: {
            color: colors.tabIconActive
        }
    });
