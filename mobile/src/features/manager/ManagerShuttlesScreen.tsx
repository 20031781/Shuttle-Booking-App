import {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import {createManagerShuttleRepository} from '@/api/managerShuttleRepository';
import {useDialog} from '@/components/DialogProvider';
import {PageContainer} from '@/components/PageContainer';
import {SectionTitle} from '@/components/SectionTitle';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import type {ManagerShuttle} from '@/types/domain';
import {getFriendlyErrorMessage} from '@/lib/errors';

const managerRepository = createManagerShuttleRepository();

type ShuttleDraft = {
    name: string;
    capacity: string;
    meetingDate: string;
    meetingTime: string;
};

function parseCapacity(value: string): number | null {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        return null;
    }

    return parsed;
}

function toDateInputValue(meetingAtUtc: string): string {
    const date = new Date(meetingAtUtc);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toTimeInputValue(meetingAtUtc: string): string {
    const date = new Date(meetingAtUtc);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function parseMeetingAtUtc(datePart: string, timePart: string): string | null {
    const normalizedDate = datePart.trim();
    const normalizedTime = timePart.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) || !/^\d{2}:\d{2}$/.test(normalizedTime)) {
        return null;
    }

    const parsed = new Date(`${normalizedDate}T${normalizedTime}:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
}

export function ManagerShuttlesScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [shuttles, setShuttles] = useState<ManagerShuttle[]>([]);
    const [drafts, setDrafts] = useState<Record<string, ShuttleDraft>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createName, setCreateName] = useState('');
    const [createCapacity, setCreateCapacity] = useState('');
    const [createMeetingDate, setCreateMeetingDate] = useState('');
    const [createMeetingTime, setCreateMeetingTime] = useState('');
    const [creating, setCreating] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const {showDialog} = useDialog();

    async function loadShuttles() {
        setError(null);

        try {
            const items = await managerRepository.list();
            const nextDrafts: Record<string, ShuttleDraft> = {};
            items.forEach(item => {
                nextDrafts[item.id] = {
                    name: item.name,
                    capacity: String(item.capacity),
                    meetingDate: toDateInputValue(item.meetingAtUtc),
                    meetingTime: toTimeInputValue(item.meetingAtUtc)
                };
            });
            setShuttles(items);
            setDrafts(nextDrafts);
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.manager.loadErrorMessage));
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        const normalizedName = createName.trim();
        if (!normalizedName) {
            setError(t.manager.validationName);
            return;
        }

        const capacity = parseCapacity(createCapacity);
        if (!capacity) {
            setError(t.manager.validationCapacity);
            return;
        }

        const meetingAtUtc = parseMeetingAtUtc(createMeetingDate, createMeetingTime);
        if (!meetingAtUtc) {
            setError(t.manager.validationMeetingAt);
            return;
        }

        setCreating(true);
        setError(null);

        try {
            await managerRepository.create(normalizedName, capacity, meetingAtUtc);
            setCreateName('');
            setCreateCapacity('');
            setCreateMeetingDate('');
            setCreateMeetingTime('');
            await loadShuttles();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.manager.createErrorMessage));
        } finally {
            setCreating(false);
        }
    }

    async function handleSave(id: string) {
        const draft = drafts[id];
        if (!draft) {
            return;
        }

        const normalizedName = draft.name.trim();
        if (!normalizedName) {
            setError(t.manager.validationName);
            return;
        }

        const capacity = parseCapacity(draft.capacity);
        if (!capacity) {
            setError(t.manager.validationCapacity);
            return;
        }

        const meetingAtUtc = parseMeetingAtUtc(draft.meetingDate, draft.meetingTime);
        if (!meetingAtUtc) {
            setError(t.manager.validationMeetingAt);
            return;
        }

        setSavingId(id);
        setError(null);
        try {
            await managerRepository.update(id, normalizedName, capacity, meetingAtUtc);
            await loadShuttles();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.manager.saveErrorMessage));
        } finally {
            setSavingId(null);
        }
    }

    function confirmDelete(shuttle: ManagerShuttle) {
        showDialog({
            title: t.manager.deleteConfirmTitle,
            message: t.manager.deleteConfirmMessage(shuttle.name),
            actions: [
                {label: t.manager.deleteConfirmDismiss, variant: 'ghost'},
                {
                    label: t.manager.deleteConfirmAction,
                    variant: 'danger',
                    onPress: () => void handleDelete(shuttle)
                }
            ]
        });
    }

    async function handleDelete(shuttle: ManagerShuttle) {
        setDeletingId(shuttle.id);
        setError(null);

        try {
            await managerRepository.delete(shuttle.id);
            await loadShuttles();
        } catch (requestError) {
            setError(getFriendlyErrorMessage(requestError, t.manager.deleteErrorMessage));
        } finally {
            setDeletingId(null);
        }
    }

    useEffect(() => void loadShuttles(), []);

    return <PageContainer>
        <SectionTitle title={t.manager.title} subtitle={t.manager.subtitle} badge={t.manager.badge}/>

        {error ? <View style={[globalStyles.card, styles.errorCard]}>
            <Text style={styles.errorTitle}>{t.manager.loadErrorTitle}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => void loadShuttles()}
                style={globalStyles.primaryButton}>
                <Text style={globalStyles.primaryButtonText}>{t.manager.retry}</Text>
            </Pressable>
        </View> : null}

        <View style={[globalStyles.card, styles.createCard]}>
            <Text style={styles.cardTitle}>{t.manager.createTitle}</Text>
            <TextInput
                value={createName}
                onChangeText={setCreateName}
                placeholder={t.manager.placeholderName}
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
            />
            <TextInput
                value={createCapacity}
                onChangeText={setCreateCapacity}
                placeholder={t.manager.placeholderCapacity}
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TextInput
                value={createMeetingDate}
                onChangeText={setCreateMeetingDate}
                placeholder={t.manager.placeholderMeetingDate}
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TextInput
                value={createMeetingTime}
                onChangeText={setCreateMeetingTime}
                placeholder={t.manager.placeholderMeetingTime}
                placeholderTextColor={colors.mutedText}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <Pressable
                accessibilityRole="button"
                disabled={creating}
                onPress={() => void handleCreate()}
                style={[globalStyles.primaryButton, styles.fullWidthButton, creating && styles.disabledButton]}>
                <Text style={globalStyles.primaryButtonText}>
                    {creating ? t.manager.createInProgress : t.manager.createAction}
                </Text>
            </Pressable>
        </View>

        {loading ? <View style={[globalStyles.card, styles.emptyState]}>
            <Text style={styles.emptyText}>{t.profileCompletion.loading}</Text>
        </View> : <ScrollView contentContainerStyle={styles.listContent}>
            {shuttles.length === 0 ? <View style={[globalStyles.card, styles.emptyState]}>
                <Text style={styles.emptyTitle}>{t.manager.emptyTitle}</Text>
                <Text style={styles.emptyText}>{t.manager.empty}</Text>
            </View> : shuttles.map(shuttle => {
                const draft = drafts[shuttle.id] ?? {
                    name: shuttle.name,
                    capacity: String(shuttle.capacity),
                    meetingDate: toDateInputValue(shuttle.meetingAtUtc),
                    meetingTime: toTimeInputValue(shuttle.meetingAtUtc)
                };
                const saving = savingId === shuttle.id;
                const deleting = deletingId === shuttle.id;

                return <View key={shuttle.id} style={[globalStyles.card, styles.shuttleCard]}>
                    <Text style={styles.cardTitle}>#{shuttle.id}</Text>
                    <TextInput
                        value={draft.name}
                        onChangeText={value =>
                            setDrafts(previous => ({
                                ...previous,
                                [shuttle.id]: {
                                    ...(previous[shuttle.id] ?? draft),
                                    name: value
                                }
                            }))}
                        placeholder={t.manager.placeholderName}
                        placeholderTextColor={colors.mutedText}
                        style={styles.input}
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                    <TextInput
                        value={draft.capacity}
                        onChangeText={value =>
                            setDrafts(previous => ({
                                ...previous,
                                [shuttle.id]: {
                                    ...(previous[shuttle.id] ?? draft),
                                    capacity: value
                                }
                            }))}
                        placeholder={t.manager.placeholderCapacity}
                        placeholderTextColor={colors.mutedText}
                        style={styles.input}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        value={draft.meetingDate}
                        onChangeText={value =>
                            setDrafts(previous => ({
                                ...previous,
                                [shuttle.id]: {
                                    ...(previous[shuttle.id] ?? draft),
                                    meetingDate: value
                                }
                            }))}
                        placeholder={t.manager.placeholderMeetingDate}
                        placeholderTextColor={colors.mutedText}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        value={draft.meetingTime}
                        onChangeText={value =>
                            setDrafts(previous => ({
                                ...previous,
                                [shuttle.id]: {
                                    ...(previous[shuttle.id] ?? draft),
                                    meetingTime: value
                                }
                            }))}
                        placeholder={t.manager.placeholderMeetingTime}
                        placeholderTextColor={colors.mutedText}
                        style={styles.input}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <View style={styles.actionRow}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={saving || deleting}
                            onPress={() => void handleSave(shuttle.id)}
                            style={[
                                globalStyles.primaryButton,
                                styles.rowButton,
                                (saving || deleting) && styles.disabledButton
                            ]}>
                            <Text style={globalStyles.primaryButtonText}>
                                {saving ? t.manager.saveInProgress : t.manager.saveAction}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            disabled={saving || deleting}
                            onPress={() => confirmDelete(shuttle)}
                            style={[
                                globalStyles.outlineButton,
                                styles.rowButton,
                                styles.dangerButton,
                                (saving || deleting) && styles.disabledButton
                            ]}>
                            <Text style={styles.dangerButtonText}>
                                {deleting ? t.manager.deleteInProgress : t.manager.deleteAction}
                            </Text>
                        </Pressable>
                    </View>
                </View>;
            })}
        </ScrollView>}

    </PageContainer>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        createCard: {
            gap: 10
        },
        cardTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15
        },
        input: {
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            backgroundColor: colors.surface
        },
        fullWidthButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        listContent: {
            gap: 10,
            paddingBottom: 24
        },
        shuttleCard: {
            gap: 10
        },
        actionRow: {
            flexDirection: 'row',
            gap: 8
        },
        rowButton: {
            flex: 1,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        dangerButton: {
            borderColor: colors.danger
        },
        dangerButtonText: {
            color: colors.danger,
            fontWeight: '600'
        },
        disabledButton: {
            opacity: 0.5
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
        },
        errorCard: {
            gap: 8
        },
        errorTitle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 16
        },
        errorMessage: {
            color: colors.subtleText
        }
    });
