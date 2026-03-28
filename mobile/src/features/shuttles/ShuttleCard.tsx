import {Pressable, StyleSheet, Text, View} from 'react-native';

import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';
import type {Shuttle} from '../../types/domain';

type ShuttleCardProps = {
    shuttle: Shuttle;
    bookingInProgress?: boolean;
    onBook?: (shuttle: Shuttle) => void;
};

export function ShuttleCard({shuttle, bookingInProgress = false, onBook}: ShuttleCardProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const noSeats = shuttle.seatsAvailable < 1;
    const lowSeats = shuttle.seatsAvailable > 0 && shuttle.seatsAvailable <= 3;
    const disabled = noSeats || bookingInProgress || !onBook;
    const seatsColor = noSeats ? colors.danger : lowSeats ? colors.warning : colors.success;

    return <View style={[globalStyles.card, styles.card]}>
        <View style={styles.headerRow}>
            <Text style={styles.route}>{shuttle.routeName}</Text>
            <View style={styles.seatBadge}>
                <Text style={[styles.seatBadgeText, {color: seatsColor}]}>{shuttle.seatsAvailable}</Text>
            </View>
        </View>
        <Text style={styles.meta}>
            {t.shuttles.departureLabel}: <Text style={styles.metaValue}>{shuttle.departureTime}</Text>
        </Text>
        <Text style={[styles.seats, {color: seatsColor}]}>
            {t.shuttles.seatsLabel}: {noSeats ? t.shuttles.full : shuttle.seatsAvailable}
        </Text>
        {onBook ? <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onBook(shuttle)}
            style={[globalStyles.primaryButton, styles.bookButton, disabled && styles.bookButtonDisabled]}>
            <Text style={globalStyles.primaryButtonText}>
                {bookingInProgress ? t.shuttles.bookingInProgress : noSeats ? t.shuttles.full : t.shuttles.book}
            </Text>
        </Pressable> : null}
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        card: {
            gap: 8
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
        },
        route: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 17,
            flex: 1
        },
        seatBadge: {
            minWidth: 28,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            alignItems: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border
        },
        seatBadgeText: {
            fontWeight: '700',
            fontSize: 12
        },
        meta: {
            color: colors.subtleText,
            fontSize: 14
        },
        metaValue: {
            color: colors.text,
            fontWeight: '600'
        },
        seats: {
            fontWeight: '600',
            fontSize: 14
        },
        bookButton: {
            minWidth: 124,
            justifyContent: 'center'
        },
        bookButtonDisabled: {
            opacity: 0.45
        }
    });
