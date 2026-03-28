import {useEffect, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

import {createBookingRepository} from '../../api/bookingRepository';
import {PageContainer} from '../../components/PageContainer';
import {SectionTitle} from '../../components/SectionTitle';
import {SkeletonBlock} from '../../components/SkeletonBlock';
import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';
import type {Booking} from '../../types/domain';

const bookingRepository = createBookingRepository();
const skeletonRows = Array.from({length: 3}, (_, index) => `booking-skeleton-${index}`);

function BookingHistorySkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={styles.skeletonList}>
        {skeletonRows.map(rowId => <View key={rowId} style={[globalStyles.card, styles.card]}>
            <SkeletonBlock style={styles.skeletonTitle}/>
            <SkeletonBlock style={styles.skeletonDate}/>
            <SkeletonBlock style={styles.skeletonStatus}/>
        </View>)}
    </View>;
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

type BookingSummaryProps = {
    activeCount: number;
    canceledCount: number;
};

function BookingSummary({activeCount, canceledCount}: BookingSummaryProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={[globalStyles.card, styles.summaryCard]}>
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t.bookings.summaryActive}</Text>
            <Text style={[styles.metricValue, styles.statusActive]}>{activeCount}</Text>
        </View>
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t.bookings.summaryCanceled}</Text>
            <Text style={[styles.metricValue, styles.statusCanceled]}>{canceledCount}</Text>
        </View>
    </View>;
}

export function BookingHistoryScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
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

    useEffect(() => void loadBookings(), []);

    const activeCount = bookings.filter(booking => booking.status === 'active').length;
    const canceledCount = bookings.filter(booking => booking.status === 'canceled').length;

    return <PageContainer>
        <SectionTitle title={t.bookings.title} subtitle={t.bookings.subtitle} badge={t.bookings.badge}/>
        {!loading && !error && bookings.length > 0 ?
            <BookingSummary activeCount={activeCount} canceledCount={canceledCount}/> : null}
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
                const canCancel = item.status === 'active';
                const inProgress = cancelingId === item.id;
                const statusLabel = canCancel ? t.bookings.statusActive : t.bookings.statusCanceled;

                return <View style={[globalStyles.card, styles.card]}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{item.shuttleName}</Text>
                        <View
                            style={[
                                styles.statusPill,
                                canCancel ? styles.statusPillActive : styles.statusPillCanceled
                            ]}>
                            <Text style={styles.statusPillText}>{statusLabel}</Text>
                        </View>
                    </View>
                    <Text style={styles.date}>
                        {t.bookings.dateLabel}: {formatDate(item.date)}
                    </Text>
                    <Text style={[styles.status, canCancel ? styles.statusActive : styles.statusCanceled]}>
                        {t.bookings.statusLabel}: {statusLabel}
                    </Text>
                    {canCancel ? <Pressable
                        accessibilityRole="button"
                        disabled={inProgress}
                        onPress={() => void handleCancel(item)}
                        style={[globalStyles.outlineButton, styles.cancelButton, inProgress && styles.cancelButtonDisabled]}>
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
        skeletonList: {
            gap: 10,
            paddingBottom: 24
        },
        card: {
            gap: 8
        },
        titleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
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
            fontSize: 16,
            flex: 1
        },
        statusPill: {
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4
        },
        statusPillActive: {
            backgroundColor: colors.primarySoft
        },
        statusPillCanceled: {
            backgroundColor: colors.surfaceSecondary
        },
        statusPillText: {
            color: colors.text,
            fontSize: 12,
            fontWeight: '600'
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
            color: colors.mutedText
        },
        cancelButton: {
            marginTop: 0
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
