import {useEffect, useRef} from 'react';
import {Animated, Easing, type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';

import type {AppThemeColors} from '../theme/colors';
import {useAppTheme} from '../theme/theme';

export type SkeletonVariant = 'pulse' | 'shimmer';

type SkeletonBlockProps = {
    style?: StyleProp<ViewStyle>;
    variant?: SkeletonVariant;
};

export function SkeletonBlock({style, variant = 'shimmer'}: SkeletonBlockProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const pulse = useRef(new Animated.Value(0.52)).current;
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (variant === 'pulse') {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, {toValue: 0.92, duration: 700, useNativeDriver: true}),
                    Animated.timing(pulse, {toValue: 0.52, duration: 700, useNativeDriver: true})
                ])
            );

            animation.start();
            return () => animation.stop();
        }

        shimmer.setValue(0);
        const animation = Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver: true
            })
        );

        animation.start();
        return () => animation.stop();
    }, [pulse, shimmer, variant]);

    if (variant === 'pulse') {
        return <Animated.View style={[styles.base, style, {opacity: pulse}]}/>;
    }

    return <View style={[styles.base, style]}>
        <Animated.View
            style={[
                styles.shimmerBand,
                {
                    transform: [
                        {
                            translateX: shimmer.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-160, 260]
                            })
                        }
                    ]
                }
            ]}
        />
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        base: {
            overflow: 'hidden',
            borderRadius: 8,
            backgroundColor: colors.skeletonBase
        },
        shimmerBand: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '42%',
            backgroundColor: colors.skeletonHighlight,
            opacity: 1
        }
    });
