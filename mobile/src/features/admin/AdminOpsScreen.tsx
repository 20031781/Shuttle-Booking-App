import {useEffect, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';

import {
    type AdminComponentStatus,
    type AdminHealth,
    type AdminHealthStatus,
    type AdminOverview,
    createAdminOpsRepository
} from '../../api/adminOpsRepository';
import {PageContainer} from '../../components/PageContainer';
import {SectionTitle} from '../../components/SectionTitle';
import {SkeletonBlock} from '../../components/SkeletonBlock';
import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';

const adminOpsRepository = createAdminOpsRepository();
const skeletonRows = Array.from({length: 4}, (_, index) => `admin-skeleton-${index}`);

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

function getStatusColor(status: AdminHealthStatus, colors: AppThemeColors): string {
    switch (status) {
        case 'Healthy':
            return colors.success;
        case 'Degraded':
            return colors.warning;
        case 'Unhealthy':
            return colors.danger;
        case 'Disabled':
            return colors.mutedText;
        default:
            return colors.subtleText;
    }
}

function localizeStatus(status: AdminHealthStatus): string {
    switch (status) {
        case 'Healthy':
            return t.admin.status.healthy;
        case 'Degraded':
            return t.admin.status.degraded;
        case 'Unhealthy':
            return t.admin.status.unhealthy;
        case 'Disabled':
            return t.admin.status.disabled;
        default:
            return status;
    }
}

function AdminOpsSkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={styles.skeletonList}>
        {skeletonRows.map(rowId => <View key={rowId} style={[globalStyles.card, styles.card]}>
            <SkeletonBlock style={styles.skeletonTitle}/>
            <SkeletonBlock style={styles.skeletonValue}/>
            <SkeletonBlock style={styles.skeletonMeta}/>
        </View>)}
    </View>;
}

type MetricTileProps = {
    label: string;
    value: string;
    highlight?: 'normal' | 'success' | 'warning' | 'danger';
};

function MetricTile({label, value, highlight = 'normal'}: MetricTileProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    const valueStyle =
        highlight === 'success'
            ? styles.metricValueSuccess
            : highlight === 'warning'
                ? styles.metricValueWarning
                : highlight === 'danger'
                    ? styles.metricValueDanger
                    : styles.metricValue;

    return <View style={styles.metricTile}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={valueStyle}>{value}</Text>
    </View>;
}

type HealthItemProps = {
    component: AdminComponentStatus;
};

function HealthItem({component}: HealthItemProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const statusColor = getStatusColor(component.status, colors);

    return <View style={styles.healthRow}>
        <View style={styles.healthHeaderRow}>
            <Text style={styles.healthName}>{component.name}</Text>
            <Text style={[styles.healthStatus, {color: statusColor}]}>
                {localizeStatus(component.status)}
            </Text>
        </View>
        {component.details ? <Text style={styles.healthDetails}>{component.details}</Text> : null}
    </View>;
}

export function AdminOpsScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [health, setHealth] = useState<AdminHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadAdminData() {
        setError(null);

        try {
            const [nextOverview, nextHealth] = await Promise.all([
                adminOpsRepository.getOverview(),
                adminOpsRepository.getHealth()
            ]);
            setOverview(nextOverview);
            setHealth(nextHealth);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t.admin.loadErrorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => void loadAdminData(), []);

    const sortedShuttles = [...(overview?.shuttles ?? [])].sort(
        (left, right) => right.occupancyPercent - left.occupancyPercent
    );

    return <PageContainer>
        <SectionTitle title={t.admin.title} subtitle={t.admin.subtitle} badge={t.admin.badge}/>
        {loading ? <AdminOpsSkeleton/> : error ? <View style={[globalStyles.card, styles.card]}>
            <Text style={styles.errorTitle}>{t.admin.loadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => {
                    setRefreshing(true);
                    void loadAdminData();
                }}
                style={globalStyles.primaryButton}>
                <Text style={globalStyles.primaryButtonText}>{t.admin.retry}</Text>
            </Pressable>
        </View> : overview && health ? <ScrollView
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        void loadAdminData();
                    }}
                />
            }
            contentContainerStyle={styles.scrollContent}>
            <View style={[globalStyles.card, styles.card, styles.metricsGrid]}>
                <MetricTile label={t.admin.metrics.totalUsers} value={String(overview.totalUsers)}/>
                <MetricTile label={t.admin.metrics.totalShuttles} value={String(overview.totalShuttles)}/>
                <MetricTile
                    label={t.admin.metrics.activeBookings}
                    value={String(overview.activeBookings)}
                    highlight="success"
                />
                <MetricTile
                    label={t.admin.metrics.occupancy}
                    value={formatPercent(overview.occupancyPercent)}
                    highlight={overview.occupancyPercent >= 90 ? 'danger' : 'warning'}
                />
            </View>

            <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.operationsTitle}</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.admin.metrics.bookingsCreated}</Text>
                    <Text style={styles.detailValue}>{overview.bookingsCreated}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.admin.metrics.canceledBookings}</Text>
                    <Text style={styles.detailValue}>{overview.canceledBookings}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.admin.metrics.cancellationRate}</Text>
                    <Text style={styles.detailValue}>{formatPercent(overview.cancellationRatePercent)}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t.admin.metrics.seatsAvailable}</Text>
                    <Text style={styles.detailValue}>{overview.seatsAvailable}</Text>
                </View>
                <Text style={styles.metaText}>
                    {t.admin.generatedAtLabel}: {formatTimestamp(overview.generatedAtUtc)}
                </Text>
            </View>

            <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.healthTitle}</Text>
                <View style={styles.healthOverviewRow}>
                    <Text style={styles.detailLabel}>{t.admin.metrics.overallStatus}</Text>
                    <Text
                        style={[
                            styles.healthOverallStatus,
                            {color: getStatusColor(health.overallStatus, colors)}
                        ]}>
                        {localizeStatus(health.overallStatus)}
                    </Text>
                </View>
                {health.components.map((component) => <HealthItem key={component.name} component={component}/>)}
                <Text style={styles.metaText}>
                    {t.admin.checkedAtLabel}: {formatTimestamp(health.checkedAtUtc)}
                </Text>
            </View>

            <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.shuttleLoadTitle}</Text>
                {sortedShuttles.length === 0 ?
                    <Text style={styles.emptyText}>{t.admin.emptyShuttles}</Text> : sortedShuttles.map((item) => (
                        <View key={item.shuttleId} style={styles.shuttleRow}>
                            <View style={styles.shuttleMeta}>
                                <Text style={styles.shuttleName}>{item.shuttleName}</Text>
                                <Text style={styles.shuttleDetails}>
                                    {item.activeBookings}/{item.capacity} · {t.admin.metrics.seatsAvailable}:{' '}
                                    {item.seatsAvailable}
                                </Text>
                            </View>
                            <Text style={styles.shuttleOccupancy}>{formatPercent(item.occupancyPercent)}</Text>
                        </View>
                    ))}
            </View>
        </ScrollView> : <Text style={styles.emptyText}>{t.admin.empty}</Text>}
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        scrollContent: {
            gap: 10,
            paddingBottom: 24
        },
        skeletonList: {
            gap: 10
        },
        card: {
            gap: 10
        },
        metricsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8
        },
        metricTile: {
            minWidth: '47%',
            flexGrow: 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 9,
            backgroundColor: colors.surfaceSecondary,
            gap: 2
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
        metricValueSuccess: {
            color: colors.success,
            fontSize: 22,
            fontWeight: '700'
        },
        metricValueWarning: {
            color: colors.warning,
            fontSize: 22,
            fontWeight: '700'
        },
        metricValueDanger: {
            color: colors.danger,
            fontSize: 22,
            fontWeight: '700'
        },
        cardTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700'
        },
        detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        detailLabel: {
            color: colors.subtleText,
            fontSize: 13
        },
        detailValue: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15
        },
        metaText: {
            color: colors.mutedText,
            fontSize: 12,
            marginTop: 2
        },
        healthOverviewRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        healthOverallStatus: {
            fontWeight: '700',
            fontSize: 14
        },
        healthRow: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surfaceSecondary,
            padding: 10,
            gap: 2
        },
        healthHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        healthName: {
            color: colors.text,
            fontWeight: '700',
            textTransform: 'capitalize'
        },
        healthStatus: {
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase'
        },
        healthDetails: {
            color: colors.subtleText,
            fontSize: 12
        },
        shuttleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surfaceSecondary,
            paddingHorizontal: 10,
            paddingVertical: 9,
            gap: 10
        },
        shuttleMeta: {
            flex: 1,
            gap: 2
        },
        shuttleName: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 14
        },
        shuttleDetails: {
            color: colors.subtleText,
            fontSize: 12
        },
        shuttleOccupancy: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 14
        },
        skeletonTitle: {
            width: '55%',
            height: 15,
            borderRadius: 8
        },
        skeletonValue: {
            width: '40%',
            height: 23,
            borderRadius: 10
        },
        skeletonMeta: {
            width: '66%',
            height: 12,
            borderRadius: 6
        },
        errorTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 16
        },
        errorMessage: {
            color: colors.subtleText
        },
        emptyText: {
            color: colors.subtleText
        }
    });
