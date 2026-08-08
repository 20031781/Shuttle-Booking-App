import {useEffect, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import {createBookingRepository} from '@/api/bookingRepository';
import {useDialog} from '@/components/DialogProvider';
import {PageContainer} from '@/components/PageContainer';
import {SkeletonBlock} from '@/components/SkeletonBlock';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {Booking} from '@/types/domain';
import {getFriendlyErrorMessage} from '@/lib/errors';

const bookingRepository = createBookingRepository();
const skeletonRows = Array.from({length: 3}, (_, index) => `booking-skeleton-${index}`);

function BookingHistorySkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={styles.skeletonList}>
        {skeletonRows.map(rowId => <View key={rowId} style={[globalStyles.card, styles.card]}>
            <SkeletonBlock style={styles.skeletonLineWide}/>
            <SkeletonBlock style={styles.skeletonLineMedium}/>
        </View>)}
    </View>;
}

function formatMeeting(dateIso: string): string {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
        return dateIso;
    }

    const datePart = date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
    const timePart = date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${datePart} · ${timePart}`;
}

type BookingSummaryProps = {
    activeCount: number;
    canceledCount: number;
    isAurora: boolean;
};

function BookingSummary({activeCount, canceledCount, isAurora}: BookingSummaryProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <View style={styles.summaryCard}>
        <View style={[styles.metricCard, isAurora ? styles.metricCardAurora : styles.metricCardDefault]}>
            <Text style={styles.metricLabel}>{t.bookings.summaryActive}</Text>
            <Text style={[styles.metricValue, styles.metricActive]}>{activeCount}</Text>
        </View>
        <View style={[styles.metricCard, isAurora ? styles.metricCardAurora : styles.metricCardDefault]}>
            <Text style={styles.metricLabel}>{t.bookings.summaryCanceled}</Text>
            <Text style={[styles.metricValue, styles.metricCanceled]}>{canceledCount}</Text>
        </View>
    </View>;
}

export function BookingHistoryScreen() {
    const {colors, mode} = useAppTheme();
    const isAurora = mode === 'aurora';
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const {showDialog} = useDialog();

    async function loadBookings() {
        setError(null);

        try {
            const history = await bookingRepository.list();
            setBookings(history);
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.bookings.historyLoadErrorMessage));
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
            setError(getFriendlyErrorMessage(requestError, t.bookings.cancelErrorMessage));
        } finally {
            setCancelingId(null);
        }
    }

    function confirmCancel(booking: Booking) {
        showDialog({
            title: t.bookings.confirmCancelTitle,
            message: t.bookings.confirmCancelMessage(booking.shuttleName),
            actions: [
                {label: t.bookings.confirmCancelDismiss, variant: 'ghost'},
                {
                    label: t.bookings.confirmCancelAction,
                    variant: 'danger',
                    onPress: () => void handleCancel(booking)
                }
            ]
        });
    }

    useEffect(() => void loadBookings(), []);

    const activeCount = bookings.filter(booking => booking.status === 'active').length;
    const canceledCount = bookings.filter(booking => booking.status === 'canceled').length;

    return <PageContainer>
        <View style={[styles.headerCard, isAurora ? styles.headerCardAurora : styles.headerCardDefault]}>
            <Text style={[styles.headerBadge, isAurora && styles.headerBadgeAurora]}>{t.bookings.badge}</Text>
            <Text style={styles.headerTitle}>{t.bookings.title}</Text>
            <Text style={styles.headerSubtitle}>{t.bookings.subtitle}</Text>
        </View>
        {!loading && !error && bookings.length > 0 ? <BookingSummary
            activeCount={activeCount}
            canceledCount={canceledCount}
            isAurora={isAurora}
        /> : null}
        {loading ? <BookingHistorySkeleton/> : error ? <View style={[globalStyles.card, styles.card]}>
            <Text style={styles.errorTitle}>{t.bookings.historyLoadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => {
                    setRefreshing(true);
                    void loadBookings();
                }}
                style={globalStyles.primaryButton}>
                <Text style={globalStyles.primaryButtonText}>{t.bookings.retry}</Text>
            </Pressable>
        </View> : bookings.length === 0 ? <View style={[globalStyles.card, styles.emptyState]}>
            <Text style={styles.emptyTitle}>{t.bookings.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.bookings.empty}</Text>
        </View> : <FlatList
            data={bookings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.skeletonList}
            refreshing={refreshing}
            onRefresh={() => {
                setRefreshing(true);
                void loadBookings();
            }}
            renderItem={({item}) => {
                const isActive = item.status === 'active';
                const inProgress = cancelingId === item.id;

                return <View style={[
                    globalStyles.card,
                    styles.card,
                    isActive
                        ? isAurora
                            ? styles.cardActiveAurora
                            : styles.cardActive
                        : styles.cardInactive
                ]}>
                    <View style={styles.titleRow}>
                        <Text
                            style={[
                                styles.routeName,
                                !isActive && styles.routeNameInactive
                            ]}>
                            {item.shuttleName}
                        </Text>
                        {isActive ? <View style={[styles.activeBadge, isAurora && styles.activeBadgeAurora]}>
                            <Text style={styles.activeBadgeText}>{t.bookings.statusActive}</Text>
                        </View> : <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>{t.bookings.statusCanceled}</Text>
                        </View>}
                    </View>
                    <View style={styles.meetingRow}>
                        <Ionicons
                            name="calendar-clear-outline"
                            size={13}
                            color={isActive ? colors.subtleText : colors.mutedText}
                        />
                        <Text style={[styles.meetingLine, !isActive && styles.meetingLineInactive]}>
                            {formatMeeting(item.date)}
                        </Text>
                    </View>
                    {isActive ? <Pressable
                        accessibilityRole="button"
                        disabled={inProgress}
                        onPress={() => confirmCancel(item)}
                        style={[
                            globalStyles.outlineButton,
                            styles.cancelButton,
                            isAurora && styles.cancelButtonAurora,
                            inProgress && styles.cancelButtonDisabled
                        ]}>
                        <Text style={globalStyles.outlineButtonText}>
                            {inProgress ? t.bookings.canceling : t.bookings.cancel}
                        </Text>
                    </Pressable> : null}
                </View>;
            }}
        />}
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        headerCard: {
            borderRadius: 22,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 2
        },
        headerCardDefault: {
            backgroundColor: colors.backgroundAccent,
            borderColor: colors.border
        },
        headerCardAurora: {
            backgroundColor: 'rgba(8, 24, 42, 0.86)',
            borderColor: 'rgba(0, 201, 122, 0.26)'
        },
        headerBadge: {
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase'
        },
        headerBadgeAurora: {
            color: '#00d18a',
            letterSpacing: 1
        },
        headerTitle: {
            fontSize: 34,
            fontWeight: '800',
            color: colors.text
        },
        headerSubtitle: {
            color: colors.subtleText,
            fontSize: 14
        },
        summaryCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10
        },
        metricCard: {
            flex: 1,
            borderRadius: 16,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 4
        },
        metricCardDefault: {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border
        },
        metricCardAurora: {
            backgroundColor: 'rgba(16, 46, 71, 0.6)',
            borderColor: 'rgba(112, 168, 219, 0.3)'
        },
        metricLabel: {
            color: colors.subtleText,
            fontSize: 12
        },
        metricValue: {
            color: colors.text,
            fontSize: 28,
            fontWeight: '800'
        },
        metricActive: {
            color: colors.success
        },
        metricCanceled: {
            color: colors.text
        },
        skeletonList: {
            gap: 10,
            paddingBottom: 24
        },
        card: {
            gap: 10,
            borderWidth: 1
        },
        cardActive: {
            borderColor: colors.success,
            backgroundColor: colors.primarySoft
        },
        cardActiveAurora: {
            borderColor: 'rgba(0, 209, 138, 0.55)',
            backgroundColor: 'rgba(9, 38, 58, 0.82)'
        },
        cardInactive: {
            borderColor: colors.borderStrong,
            backgroundColor: colors.surfaceSecondary
        },
        titleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
        },
        skeletonLineWide: {
            width: '78%',
            height: 16,
            borderRadius: 9
        },
        skeletonLineMedium: {
            width: '56%',
            height: 14,
            borderRadius: 7
        },
        routeName: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 23,
            flex: 1
        },
        routeNameInactive: {
            color: colors.mutedText,
            textDecorationLine: 'line-through'
        },
        meetingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
        },
        meetingLine: {
            color: colors.subtleText,
            fontSize: 15
        },
        meetingLineInactive: {
            color: colors.mutedText
        },
        activeBadge: {
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.success
        },
        activeBadgeAurora: {
            backgroundColor: 'rgba(0, 201, 122, 0.15)',
            borderColor: 'rgba(0, 201, 122, 0.45)'
        },
        activeBadgeText: {
            color: colors.success,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase'
        },
        inactiveBadge: {
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: colors.backgroundAccent,
            borderWidth: 1,
            borderColor: colors.border
        },
        inactiveBadgeText: {
            color: colors.mutedText,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase'
        },
        cancelButton: {
            marginTop: 2
        },
        cancelButtonAurora: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
        },
        cancelButtonDisabled: {
            opacity: 0.5
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
            color: colors.subtleText
        }
    });
