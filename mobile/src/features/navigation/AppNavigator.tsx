import type {ComponentProps} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {type BottomTabBarProps, createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {AdminOpsScreen} from '@/features/admin/AdminOpsScreen';
import {BookingHistoryScreen} from '@/features/bookings/BookingHistoryScreen';
import {ManagerShuttlesScreen} from '@/features/manager/ManagerShuttlesScreen';
import {ShuttleListScreen} from '@/features/shuttles/ShuttleListScreen';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';
import {ProfileStack} from './ProfileStack';
import type {AppSection, AppTabParamList} from './routes';

export type {AppSection} from './routes';

const Tab = createBottomTabNavigator<AppTabParamList>();

type AppNavigatorProps = {
    showAdmin: boolean;
    showManager: boolean;
};

type TabIcons = {
    iconName: ComponentProps<typeof Ionicons>['name'];
    activeIconName: ComponentProps<typeof Ionicons>['name'];
};

const tabIcons: Record<AppSection, TabIcons> = {
    shuttle: {iconName: 'car-sport-outline', activeIconName: 'car-sport'},
    bookings: {iconName: 'calendar-clear-outline', activeIconName: 'calendar-clear'},
    admin: {iconName: 'analytics-outline', activeIconName: 'analytics'},
    manager: {iconName: 'construct-outline', activeIconName: 'construct'},
    profile: {iconName: 'person-outline', activeIconName: 'person'}
};

const tabLabels: Record<AppSection, string> = {
    shuttle: t.app.sections.shuttle,
    bookings: t.app.sections.bookings,
    admin: t.app.sections.admin,
    manager: t.app.sections.manager,
    profile: t.app.sections.profile
};

/** Tab bar custom: mantiene esattamente l'aspetto della versione precedente. */
function AppTabBar({state, navigation}: BottomTabBarProps) {
    const {colors, mode} = useAppTheme();
    const isAurora = mode === 'aurora';
    const styles = createStyles(colors);
    const insets = useSafeAreaInsets();

    return <View style={[styles.tabHost, isAurora && styles.tabHostAurora, {paddingBottom: Math.max(insets.bottom, 12)}]}>
        <View style={[styles.tabs, isAurora && styles.tabsAurora]}>
            {state.routes.map((route, index) => {
                const section = route.name as AppSection;
                const active = state.index === index;
                const icons = tabIcons[section];

                return <Pressable
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={active ? {selected: true} : {}}
                    accessibilityLabel={tabLabels[section]}
                    style={[
                        styles.tab,
                        active && styles.tabActive,
                        isAurora && styles.tabAurora,
                        active && isAurora && styles.tabActiveAurora
                    ]}
                    onPress={() => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true
                        });

                        if (!active && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    }}>
                    <Ionicons
                        name={active ? icons.activeIconName : icons.iconName}
                        size={20}
                        color={active ? colors.tabIconActive : colors.tabIconInactive}
                    />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{tabLabels[section]}</Text>
                </Pressable>;
            })}
        </View>
    </View>;
}

export function AppNavigator({showAdmin, showManager}: AppNavigatorProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <View style={styles.wrapper}>
        <Tab.Navigator
            tabBar={props => <AppTabBar {...props}/>}
            screenOptions={{headerShown: false, sceneStyle: styles.scene}}>
            <Tab.Screen name="shuttle" component={ShuttleListScreen}/>
            <Tab.Screen name="bookings" component={BookingHistoryScreen}/>
            {showAdmin ? <Tab.Screen name="admin" component={AdminOpsScreen}/> : null}
            {showManager ? <Tab.Screen name="manager" component={ManagerShuttlesScreen}/> : null}
            <Tab.Screen name="profile">
                {() => <ProfileStack isAdmin={showAdmin}/>}
            </Tab.Screen>
        </Tab.Navigator>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        wrapper: {
            flex: 1,
            backgroundColor: colors.background
        },
        scene: {
            backgroundColor: colors.background
        },
        tabHost: {
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingTop: 6
        },
        tabHostAurora: {
            backgroundColor: 'transparent'
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
        tabsAurora: {
            borderColor: 'rgba(117, 174, 218, 0.28)',
            backgroundColor: 'rgba(10, 29, 50, 0.88)'
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
        tabAurora: {
            borderWidth: 1,
            borderColor: 'transparent'
        },
        tabActiveAurora: {
            borderColor: 'rgba(0, 201, 122, 0.32)',
            backgroundColor: 'rgba(0, 201, 122, 0.11)'
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
