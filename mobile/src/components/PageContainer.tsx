import type {PropsWithChildren} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';

export function PageContainer({children}: PropsWithChildren) {
    const {colors, mode} = useAppTheme();
    const styles = createStyles(colors);

    return <SafeAreaView style={styles.safeArea}>
        {mode === 'aurora' ? <>
            <View pointerEvents="none" style={styles.auroraGlowTop}/>
            <View pointerEvents="none" style={styles.auroraGlowBottom}/>
        </> : null}
        <View style={styles.content}>{children}</View>
    </SafeAreaView>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: colors.background
        },
        auroraGlowTop: {
            position: 'absolute',
            top: -80,
            left: -70,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: 'rgba(0, 201, 122, 0.12)'
        },
        auroraGlowBottom: {
            position: 'absolute',
            bottom: -90,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: 'rgba(59, 130, 246, 0.12)'
        },
        content: {
            flex: 1,
            paddingHorizontal: 18,
            paddingTop: 12,
            gap: 16,
            zIndex: 1
        }
    });
