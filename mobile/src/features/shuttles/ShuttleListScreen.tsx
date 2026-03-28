import {useEffect, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

import {createBookingRepository} from '../../api/bookingRepository';
import {createShuttleRepository} from '../../api/shuttleRepository';
import {PageContainer} from '../../components/PageContainer';
import {SectionTitle} from '../../components/SectionTitle';
import {SkeletonBlock} from '../../components/SkeletonBlock';
import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';
import type {Shuttle} from '../../types/domain';
import {ShuttleCard} from './ShuttleCard';

const shuttleRepository = createShuttleRepository();
const bookingRepository = createBookingRepository();
const skeletonCards = Array.from({length: 3}, (_, index) => `skeleton-${index}`);
const realtimeRefreshIntervalMs = 15_000;
const lowAvailabilityThreshold = 3;

function ShuttleListSkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={styles.skeletonList}>
        {skeletonCards.map(item => <View key={item} style={[globalStyles.card, styles.skeletonCard]}>
            <SkeletonBlock style={styles.skeletonRoute}/>
            <SkeletonBlock style={styles.skeletonMeta}/>
            <SkeletonBlock style={styles.skeletonSeats}/>
        </View>)}
    </View>;
}

type ShuttleSummaryProps = {
    totalRoutes: number;
    totalSeats: number;
    lowAvailability: number;
};

function ShuttleSummary({totalRoutes, totalSeats, lowAvailability}: ShuttleSummaryProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={[globalStyles.card, styles.summaryCard]}>
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t.shuttles.summaryRoutes}</Text>
            <Text style={styles.metricValue}>{totalRoutes}</Text>
        </View>
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t.shuttles.summarySeats}</Text>
            <Text style={styles.metricValue}>{totalSeats}</Text>
        </View>
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t.shuttles.summaryLowAvailability}</Text>
            <Text style={[styles.metricValue, styles.metricWarning]}>{lowAvailability}</Text>
        </View>
    </View>;
}

export function ShuttleListScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
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

    useEffect(() => void loadShuttles(), []);

    useEffect(() => {
        if (loading || refreshing || bookingInProgressId) {
            return;
        }

        const intervalId = setInterval(() => void loadShuttles(), realtimeRefreshIntervalMs);

        return () => clearInterval(intervalId);
    }, [loading, refreshing, bookingInProgressId]);

    const totalRoutes = items.length;
    const totalSeats = items.reduce((sum, item) => sum + item.seatsAvailable, 0);
    const lowAvailability = items.filter(
        item => item.seatsAvailable > 0 && item.seatsAvailable <= lowAvailabilityThreshold
    ).length;

    return <PageContainer>
        <SectionTitle title={t.shuttles.title} subtitle={t.shuttles.subtitle} badge={t.shuttles.badge}/>
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {!loading && !error && items.length > 0 ? <ShuttleSummary
            totalRoutes={totalRoutes}
            totalSeats={totalSeats}
            lowAvailability={lowAvailability}
        /> : null}
        {loading ? <ShuttleListSkeleton/> : error ? <View style={[globalStyles.card, styles.errorBox]}>
            <Text style={styles.errorTitle}>{t.shuttles.loadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => {
                    setRefreshing(true);
                    void loadShuttles();
                }}
                style={globalStyles.primaryButton}>
                <Text style={globalStyles.primaryButtonText}>{t.shuttles.retry}</Text>
            </Pressable>
        </View> : items.length === 0 ? <View style={[globalStyles.card, styles.emptyState]}>
            <Text style={styles.emptyTitle}>{t.shuttles.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.shuttles.empty}</Text>
        </View> : <FlatList
            data={items}
            renderItem={({item}) => <ShuttleCard
                shuttle={item}
                bookingInProgress={bookingInProgressId === item.id}
                onBook={handleBook}
            />}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator}/>}
            contentContainerStyle={styles.list}
            refreshing={refreshing}
            onRefresh={() => {
                setRefreshing(true);
                void loadShuttles();
            }}
        />}
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        list: {
            paddingBottom: 24
        },
        summaryCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8
        },
        metric: {
            flex: 1,
            gap: 4
        },
        metricLabel: {
            color: colors.subtleText,
            fontSize: 12
        },
        metricValue: {
            color: colors.text,
            fontSize: 22,
            fontWeight: '700'
        },
        metricWarning: {
            color: colors.warning
        },
        skeletonList: {
            gap: 10
        },
        skeletonCard: {
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
        emptyState: {
            gap: 6
        },
        emptyTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 16
        },
        emptyText: {
            color: colors.subtleText,
            fontSize: 15
        }
    });
