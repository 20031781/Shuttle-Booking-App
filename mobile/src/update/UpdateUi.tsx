import {Pressable, StyleSheet, Text, View} from 'react-native';

import {t} from '../i18n';
import type {AppThemeColors} from '../theme/colors';
import {useAppTheme} from '../theme/theme';
import {UpdateCheckResult} from './UpdateChecker';

type UpdateUiProps = {
    updateResult: UpdateCheckResult | null;
    onUpdateNow: (updateUrl: string) => void;
};

export function UpdateUi({updateResult, onUpdateNow}: UpdateUiProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    if (!updateResult || updateResult.requirement === 'upToDate') {
        return null;
    }

    const handleUpdateNow = () => {
        if (updateResult.config.updateUrl) {
            onUpdateNow(updateResult.config.updateUrl);
        }
    };

    const hasUpdateTarget = Boolean(updateResult.config.updateUrl);

    if (updateResult.requirement === 'required') {
        return <View style={styles.blockingOverlay}>
            <View style={styles.blockingCard}>
                <Text style={styles.blockingTitle}>{t.updates.requiredTitle}</Text>
                <Text style={styles.blockingBody}>{t.updates.requiredBody}</Text>
                {!hasUpdateTarget ? <Text style={styles.helperText}>{t.updates.missingUpdateTarget}</Text> : null}
                {hasUpdateTarget ?
                    <Pressable onPress={handleUpdateNow} style={styles.primaryButton} accessibilityRole="button">
                        <Text style={styles.primaryButtonText}>{t.updates.updateNow}</Text>
                    </Pressable> : null}
            </View>
        </View>;
    }

    return <View style={styles.banner}>
        <Text style={styles.bannerText}>{t.updates.optionalMessage}</Text>
        {hasUpdateTarget ? <Pressable onPress={handleUpdateNow} style={styles.bannerButton} accessibilityRole="button">
            <Text style={styles.bannerButtonText}>{t.updates.updateNow}</Text>
        </Pressable> : null}
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        blockingOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(5, 10, 22, 0.62)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            zIndex: 90
        },
        blockingCard: {
            width: '100%',
            maxWidth: 420,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surfaceElevated,
            padding: 20,
            gap: 10
        },
        blockingTitle: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '700'
        },
        blockingBody: {
            color: colors.subtleText,
            fontSize: 14,
            lineHeight: 20
        },
        helperText: {
            color: colors.warning,
            fontSize: 13
        },
        primaryButton: {
            marginTop: 4,
            borderRadius: 12,
            backgroundColor: colors.primary,
            minHeight: 42,
            alignItems: 'center',
            justifyContent: 'center'
        },
        primaryButtonText: {
            color: colors.onPrimary,
            fontWeight: '700'
        },
        banner: {
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 20,
            zIndex: 70,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surfaceElevated,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 12
        },
        bannerText: {
            flex: 1,
            color: colors.text,
            fontSize: 13
        },
        bannerButton: {
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6
        },
        bannerButtonText: {
            color: colors.text,
            fontWeight: '600',
            fontSize: 12
        }
    });
