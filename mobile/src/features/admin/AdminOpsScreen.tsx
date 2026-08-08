import {useCallback, useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {Ionicons} from '@expo/vector-icons';

import {
    type AdminHealth,
    type AdminHealthStatus,
    type AdminOverview,
    createAdminOpsRepository
} from '@/api/adminOpsRepository';
import {createManagerShuttleRepository} from '@/api/managerShuttleRepository';
import {useDialog} from '@/components/DialogProvider';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {SkeletonBlock} from '@/components/SkeletonBlock';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {ManagerShuttle} from '@/types/domain';
import {getFriendlyErrorMessage} from '@/lib/errors';

const adminOpsRepository = createAdminOpsRepository();
const shuttleRepository = createManagerShuttleRepository();
const skeletonRows = Array.from({length: 3}, (_, index) => `admin-skeleton-${index}`);

type ShuttleDraft = {
    selectedRouteName: string;
    meetingAt: Date;
};

type RoutePickerTarget = {
    kind: 'create' | 'edit';
    shuttleId?: string;
} | null;

type MeetingPickerTarget = {
    kind: 'create' | 'edit';
    shuttleId?: string;
} | null;

function localizeStatus(status: AdminHealthStatus): string {
    if (status === 'Healthy') return t.admin.status.healthy;
    if (status === 'Degraded') return t.admin.status.degraded;
    if (status === 'Unhealthy') return t.admin.status.unhealthy;
    return t.admin.status.disabled;
}

function getStatusColor(status: AdminHealthStatus, colors: AppThemeColors): string {
    if (status === 'Healthy') return colors.success;
    if (status === 'Degraded') return colors.warning;
    if (status === 'Unhealthy') return colors.danger;
    return colors.mutedText;
}

function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMeetingAt(date: Date): string {
    if (Number.isNaN(date.getTime())) return t.admin.invalidMeetingAt;

    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function toDraft(shuttle: ManagerShuttle): ShuttleDraft {
    const parsedDate = new Date(shuttle.meetingAtUtc);
    return {
        selectedRouteName: shuttle.name,
        meetingAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
    };
}

function toPercent(value: number): string {
    return `${value.toFixed(0)}%`;
}

function AdminOpsSkeleton() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);

    return <View style={styles.stack}>
        {skeletonRows.map(item => <View key={item} style={[globalStyles.card, styles.card]}>
            <SkeletonBlock style={styles.skeletonWide}/>
            <SkeletonBlock style={styles.skeletonShort}/>
        </View>)}
    </View>;
}

export function AdminOpsScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [health, setHealth] = useState<AdminHealth | null>(null);
    const [shuttles, setShuttles] = useState<ManagerShuttle[]>([]);
    const [drafts, setDrafts] = useState<Record<string, ShuttleDraft>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createDraft, setCreateDraft] = useState<ShuttleDraft>({
        selectedRouteName: '',
        meetingAt: new Date(Date.now() + 60 * 60_000)
    });
    const [creating, setCreating] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const {showDialog} = useDialog();
    const [routePickerTarget, setRoutePickerTarget] = useState<RoutePickerTarget>(null);
    const [meetingPickerTarget, setMeetingPickerTarget] = useState<MeetingPickerTarget>(null);
    const [meetingPickerValue, setMeetingPickerValue] = useState<Date>(new Date());

    const routeOptions = useMemo(() => {
        const namesFromShuttles = shuttles.map(shuttle => shuttle.name);
        const namesFromOverview = overview?.shuttles.map(item => item.shuttleName) ?? [];
        return Array.from(new Set([...namesFromShuttles, ...namesFromOverview])).sort((left, right) =>
            left.localeCompare(right, 'it-IT'));
    }, [overview, shuttles]);

    const loadAll = useCallback(async () => {
        setError(null);

        try {
            const [nextOverview, nextHealth, nextShuttles] = await Promise.all([
                adminOpsRepository.getOverview(),
                adminOpsRepository.getHealth(),
                shuttleRepository.list()
            ]);

            setOverview(nextOverview);
            setHealth(nextHealth);
            setShuttles(nextShuttles);

            const nextDrafts: Record<string, ShuttleDraft> = {};
            nextShuttles.forEach(shuttle => {
                nextDrafts[shuttle.id] = toDraft(shuttle);
            });
            setDrafts(nextDrafts);

            const firstShuttle = nextShuttles[0];
            if (firstShuttle) {
                setCreateDraft(previous =>
                    previous.selectedRouteName ? previous : {
                        ...previous,
                        selectedRouteName: firstShuttle.name
                    });
            }
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.admin.loadErrorMessage));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => void loadAll(), [loadAll]);

    function resolveTemplateCapacity(routeName: string, fallbackShuttleId?: string): number | null {
        const byName = shuttles.find(shuttle => shuttle.name === routeName);
        if (byName) {
            return byName.capacity;
        }

        if (fallbackShuttleId) {
            const byId = shuttles.find(shuttle => shuttle.id === fallbackShuttleId);
            if (byId) {
                return byId.capacity;
            }
        }

        return null;
    }

    async function createShuttle() {
        const routeName = createDraft.selectedRouteName.trim();
        if (!routeName) {
            setError(t.admin.validationRouteRequired);
            return;
        }

        const templateCapacity = resolveTemplateCapacity(routeName);
        if (!templateCapacity) {
            setError(t.admin.validationRouteTemplateMissing);
            return;
        }

        setCreating(true);
        setError(null);

        try {
            await shuttleRepository.create(routeName, templateCapacity, createDraft.meetingAt.toISOString());
            setCreateDraft({
                selectedRouteName: routeName,
                meetingAt: new Date(Date.now() + 60 * 60_000)
            });
            await loadAll();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.admin.createShuttleErrorMessage));
        } finally {
            setCreating(false);
        }
    }

    async function saveShuttle(shuttleId: string) {
        const draft = drafts[shuttleId];
        if (!draft) {
            return;
        }

        const routeName = draft.selectedRouteName.trim();
        if (!routeName) {
            setError(t.admin.validationRouteRequired);
            return;
        }

        const templateCapacity = resolveTemplateCapacity(routeName, shuttleId);
        if (!templateCapacity) {
            setError(t.admin.validationRouteTemplateMissing);
            return;
        }

        setSavingId(shuttleId);
        setError(null);
        try {
            await shuttleRepository.update(shuttleId, routeName, templateCapacity, draft.meetingAt.toISOString());
            await loadAll();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.admin.saveShuttleErrorMessage));
        } finally {
            setSavingId(null);
        }
    }

    function confirmDeleteShuttle(shuttle: ManagerShuttle) {
        showDialog({
            title: t.admin.deleteConfirmTitle,
            message: t.admin.deleteConfirmMessage(shuttle.name),
            actions: [
                {label: t.admin.deleteConfirmDismiss, variant: 'ghost'},
                {
                    label: t.admin.deleteConfirmAction,
                    variant: 'danger',
                    onPress: () => void deleteShuttle(shuttle)
                }
            ]
        });
    }

    async function deleteShuttle(shuttle: ManagerShuttle) {
        setError(null);
        try {
            await shuttleRepository.delete(shuttle.id);
            await loadAll();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.admin.deleteShuttleErrorMessage));
        }
    }

    function openMeetingPicker(target: MeetingPickerTarget) {
        if (!target) {
            return;
        }

        const initialDate = target.kind === 'create'
            ? createDraft.meetingAt
            : drafts[target.shuttleId ?? '']?.meetingAt ?? new Date();

        setMeetingPickerValue(initialDate);
        setMeetingPickerTarget(target);
    }

    function onMeetingPickerChange(_: DateTimePickerEvent, selectedDate?: Date) {
        if (selectedDate) {
            setMeetingPickerValue(selectedDate);
        }
    }

    function confirmMeetingPicker() {
        if (!meetingPickerTarget) {
            return;
        }

        if (meetingPickerTarget.kind === 'create') {
            setCreateDraft(previous => ({
                ...previous,
                meetingAt: meetingPickerValue
            }));
        } else if (meetingPickerTarget.shuttleId) {
            const shuttleId = meetingPickerTarget.shuttleId;
            setDrafts(previous => ({
                ...previous,
                [shuttleId]: {
                    ...(previous[shuttleId] ?? {
                        selectedRouteName: '',
                        meetingAt: new Date()
                    }),
                    meetingAt: meetingPickerValue
                }
            }));
        }

        setMeetingPickerTarget(null);
    }

    function applyRouteSelection(routeName: string) {
        if (!routePickerTarget) {
            return;
        }

        if (routePickerTarget.kind === 'create') {
            setCreateDraft(previous => ({
                ...previous,
                selectedRouteName: routeName
            }));
        } else if (routePickerTarget.shuttleId) {
            const shuttleId = routePickerTarget.shuttleId;
            setDrafts(previous => ({
                ...previous,
                [shuttleId]: {
                    ...(previous[shuttleId] ?? {
                        selectedRouteName: routeName,
                        meetingAt: new Date()
                    }),
                    selectedRouteName: routeName
                }
            }));
        }

        setRoutePickerTarget(null);
    }

    if (loading) {
        return <PageContainer>
            <SectionTitle title={t.admin.title} subtitle={t.admin.subtitle} badge={t.admin.badge}/>
            <AdminOpsSkeleton/>
        </PageContainer>;
    }

    return <PageContainer>
        <SectionTitle title={t.admin.title} subtitle={t.admin.subtitle} badge={t.admin.badge}/>

        <ScrollView
            contentContainerStyle={styles.stack}
            refreshControl={<RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                    setRefreshing(true);
                    void loadAll();
                }}/>}
        >
            {error ? <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.errorTitle}>{t.admin.loadErrorTitle}</Text>
                <Text style={styles.errorMessage}>{error}</Text>
            </View> : null}

            {overview ? <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.operationsTitle}</Text>
                <View style={styles.kpiRow}>
                    <Text style={styles.kpiLabel}>{t.admin.metrics.totalUsers}</Text>
                    <Text style={styles.kpiValue}>{overview.totalUsers}</Text>
                </View>
                <View style={styles.kpiRow}>
                    <Text style={styles.kpiLabel}>{t.admin.metrics.totalShuttles}</Text>
                    <Text style={styles.kpiValue}>{overview.totalShuttles}</Text>
                </View>
                <View style={styles.kpiRow}>
                    <Text style={styles.kpiLabel}>{t.admin.metrics.activeBookings}</Text>
                    <Text style={styles.kpiValue}>{overview.activeBookings}</Text>
                </View>
                <Text style={styles.metaLine}>
                    {t.admin.generatedAtLabel}: {formatTimestamp(overview.generatedAtUtc)}
                </Text>
            </View> : null}

            {health ? <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.healthTitle}</Text>
                {health.components.map(component => <View key={component.name} style={styles.healthRow}>
                    <Text style={styles.healthName}>{component.name}</Text>
                    <Text style={[styles.healthStatus, {color: getStatusColor(component.status, colors)}]}>
                        {localizeStatus(component.status)}
                    </Text>
                </View>)}
            </View> : null}

            {overview ? <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.shuttleLoadTitle}</Text>
                {overview.shuttles.length === 0 ? <Text style={styles.metaLine}>{t.admin.emptyShuttles}</Text> :
                    overview.shuttles.map(item => <View key={item.shuttleId} style={styles.shuttleLoadRow}>
                        <View style={styles.shuttleLoadMain}>
                            <Text style={styles.shuttleLoadName}>{item.shuttleName}</Text>
                            <Text style={styles.metaLine}>
                                {t.admin.metrics.activeBookings}: {item.activeBookings}
                            </Text>
                        </View>
                        <Text style={styles.shuttleLoadPercent}>{toPercent(item.occupancyPercent)}</Text>
                    </View>)}
            </View> : null}

            <View style={[globalStyles.card, styles.card]}>
                <Text style={styles.cardTitle}>{t.admin.shuttleManagementTitle}</Text>
                <Text style={styles.metaLine}>{t.admin.shuttleManagementSubtitle}</Text>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => setRoutePickerTarget({kind: 'create'})}
                    style={styles.selectorButton}>
                    <Ionicons name="git-branch-outline" size={16} color={colors.subtleText}/>
                    <Text style={styles.selectorButtonText}>
                        {createDraft.selectedRouteName || t.admin.selectRoutePlaceholder}
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => openMeetingPicker({kind: 'create'})}
                    style={styles.selectorButton}>
                    <Ionicons name="calendar-outline" size={16} color={colors.subtleText}/>
                    <Text style={styles.selectorButtonText}>{formatMeetingAt(createDraft.meetingAt)}</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    disabled={creating}
                    onPress={() => void createShuttle()}
                    style={[globalStyles.primaryButton, styles.fullWidthButton, creating && styles.disabledButton]}>
                    <Text style={globalStyles.primaryButtonText}>
                        {creating ? t.admin.createInProgress : t.admin.createAction}
                    </Text>
                </Pressable>
            </View>

            {shuttles.map(shuttle => {
                const draft = drafts[shuttle.id] ?? toDraft(shuttle);
                const saving = savingId === shuttle.id;

                return <View key={shuttle.id} style={[globalStyles.card, styles.card, styles.shuttleCard]}>
                    <Text style={styles.shuttleTitle}>{draft.selectedRouteName || shuttle.name}</Text>
                    <Text style={styles.metaLine}>{t.admin.meetingAtLabel} {formatMeetingAt(draft.meetingAt)}</Text>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setRoutePickerTarget({kind: 'edit', shuttleId: shuttle.id})}
                        style={styles.selectorButton}>
                        <Ionicons name="swap-horizontal-outline" size={16} color={colors.subtleText}/>
                        <Text style={styles.selectorButtonText}>{draft.selectedRouteName}</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => openMeetingPicker({kind: 'edit', shuttleId: shuttle.id})}
                        style={styles.selectorButton}>
                        <Ionicons name="time-outline" size={16} color={colors.subtleText}/>
                        <Text style={styles.selectorButtonText}>{formatMeetingAt(draft.meetingAt)}</Text>
                    </Pressable>

                    <View style={styles.row}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={saving}
                            onPress={() => void saveShuttle(shuttle.id)}
                            style={[globalStyles.primaryButton, styles.halfButton, saving && styles.disabledButton]}>
                            <Text style={globalStyles.primaryButtonText}>
                                {saving ? t.admin.saveInProgress : t.admin.saveAction}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            disabled={saving}
                            onPress={() => confirmDeleteShuttle(shuttle)}
                            style={[
                                globalStyles.outlineButton,
                                styles.halfButton,
                                styles.dangerButton,
                                saving && styles.disabledButton
                            ]}>
                            <Text style={styles.dangerButtonText}>{t.admin.deleteAction}</Text>
                        </Pressable>
                    </View>
                </View>;
            })}
        </ScrollView>

        <Modal
            transparent
            visible={routePickerTarget !== null}
            onRequestClose={() => setRoutePickerTarget(null)}
            animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={[globalStyles.card, styles.modalCard]}>
                    <Text style={styles.cardTitle}>{t.admin.selectRouteTitle}</Text>
                    <View style={styles.routeList}>
                        {routeOptions.length === 0 ? <Text style={styles.metaLine}>{t.admin.noRouteTemplates}</Text> :
                            routeOptions.map(route => <Pressable
                                key={route}
                                accessibilityRole="button"
                                onPress={() => applyRouteSelection(route)}
                                style={styles.routeChip}>
                                <Text style={styles.routeChipText}>{route}</Text>
                            </Pressable>)}
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setRoutePickerTarget(null)}
                        style={[globalStyles.outlineButton, styles.fullWidthButton]}>
                        <Text style={globalStyles.outlineButtonText}>{t.admin.closeSelector}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>

        <Modal
            transparent
            visible={meetingPickerTarget !== null}
            onRequestClose={() => setMeetingPickerTarget(null)}
            animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={[globalStyles.card, styles.modalCard]}>
                    <Text style={styles.cardTitle}>{t.admin.selectMeetingTitle}</Text>
                    <View style={styles.pickerBox}>
                        <DateTimePicker
                            value={meetingPickerValue}
                            mode="date"
                            display="spinner"
                            onChange={onMeetingPickerChange}
                        />
                        <DateTimePicker
                            value={meetingPickerValue}
                            mode="time"
                            is24Hour
                            display="spinner"
                            onChange={onMeetingPickerChange}
                        />
                    </View>
                    <View style={styles.row}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setMeetingPickerTarget(null)}
                            style={[globalStyles.outlineButton, styles.halfButton]}>
                            <Text style={globalStyles.outlineButtonText}>{t.admin.closeSelector}</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            onPress={confirmMeetingPicker}
                            style={[globalStyles.primaryButton, styles.halfButton]}>
                            <Text style={globalStyles.primaryButtonText}>{t.admin.confirmMeeting}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        stack: {
            gap: 10,
            paddingBottom: 24
        },
        card: {
            gap: 8
        },
        cardTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 16
        },
        errorTitle: {
            color: colors.danger,
            fontWeight: '700',
            fontSize: 15
        },
        errorMessage: {
            color: colors.subtleText
        },
        kpiRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        kpiLabel: {
            color: colors.subtleText,
            fontSize: 13
        },
        kpiValue: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15
        },
        metaLine: {
            color: colors.subtleText,
            fontSize: 13
        },
        healthRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        healthName: {
            color: colors.text,
            fontWeight: '600'
        },
        healthStatus: {
            fontWeight: '700',
            fontSize: 13
        },
        shuttleLoadRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border
        },
        shuttleLoadMain: {
            flex: 1,
            gap: 2
        },
        shuttleLoadName: {
            color: colors.text,
            fontWeight: '700'
        },
        shuttleLoadPercent: {
            color: colors.primary,
            fontWeight: '700'
        },
        selectorButton: {
            minHeight: 44,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
        },
        selectorButtonText: {
            color: colors.text,
            fontWeight: '600',
            fontSize: 14
        },
        fullWidthButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        row: {
            flexDirection: 'row',
            gap: 8
        },
        halfButton: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
        },
        shuttleCard: {
            backgroundColor: colors.surfaceSecondary
        },
        shuttleTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15
        },
        dangerButton: {
            borderColor: colors.danger
        },
        dangerButtonText: {
            color: colors.danger,
            fontWeight: '600'
        },
        disabledButton: {
            opacity: 0.55
        },
        modalBackdrop: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            backgroundColor: 'rgba(15,18,22,0.45)'
        },
        modalCard: {
            gap: 12
        },
        routeList: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8
        },
        routeChip: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.primarySoft,
            paddingHorizontal: 12,
            paddingVertical: 8
        },
        routeChipText: {
            color: colors.primary,
            fontWeight: '700'
        },
        pickerBox: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.surface
        },
        skeletonWide: {
            width: '65%',
            height: 16,
            borderRadius: 8
        },
        skeletonShort: {
            width: '40%',
            height: 14,
            borderRadius: 7
        }
    });
