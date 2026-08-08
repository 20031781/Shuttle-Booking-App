import {createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';

export type DialogActionVariant = 'primary' | 'danger' | 'ghost';

export type DialogAction = {
    label: string;
    variant?: DialogActionVariant;
    onPress?: () => void;
};

export type DialogOptions = {
    title: string;
    message?: string;
    actions?: DialogAction[];
};

type DialogContextValue = {
    showDialog: (options: DialogOptions) => void;
    dismiss: () => void;
};

const DialogContext = createContext<DialogContextValue>({
    showDialog: () => undefined,
    dismiss: () => undefined
});

export function DialogProvider({children}: PropsWithChildren) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [dialog, setDialog] = useState<DialogOptions | null>(null);

    const dismiss = useCallback(() => setDialog(null), []);
    const showDialog = useCallback((options: DialogOptions) => setDialog(options), []);
    const contextValue = useMemo(() => ({showDialog, dismiss}), [showDialog, dismiss]);

    const actions: DialogAction[] = dialog?.actions?.length
        ? dialog.actions
        : [{label: t.common.ok, variant: 'primary'}];

    return <DialogContext.Provider value={contextValue}>
        {children}
        <Modal
            transparent
            visible={dialog !== null}
            animationType="fade"
            onRequestClose={dismiss}>
            <Pressable style={styles.backdrop} onPress={dismiss}>
                <Pressable style={[globalStyles.card, styles.card]} onPress={() => undefined}>
                    {dialog ? <>
                        <Text style={styles.title}>{dialog.title}</Text>
                        {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
                        <View style={styles.actions}>
                            {actions.map((action, index) => {
                                const isDanger = action.variant === 'danger';
                                const isGhost = action.variant === 'ghost';

                                return <Pressable
                                    key={`${action.label}-${index}`}
                                    accessibilityRole="button"
                                    onPress={() => {
                                        dismiss();
                                        action.onPress?.();
                                    }}
                                    style={[
                                        isGhost ? globalStyles.outlineButton : globalStyles.primaryButton,
                                        styles.actionButton,
                                        isDanger && styles.actionDanger
                                    ]}>
                                    <Text
                                        style={isGhost ? globalStyles.outlineButtonText : globalStyles.primaryButtonText}>
                                        {action.label}
                                    </Text>
                                </Pressable>;
                            })}
                        </View>
                    </> : null}
                </Pressable>
            </Pressable>
        </Modal>
    </DialogContext.Provider>;
}

export function useDialog(): DialogContextValue {
    return useContext(DialogContext);
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(15, 18, 22, 0.45)',
            justifyContent: 'center',
            paddingHorizontal: 20
        },
        card: {
            gap: 12
        },
        title: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 17
        },
        message: {
            color: colors.subtleText
        },
        actions: {
            flexDirection: 'row',
            gap: 8
        },
        actionButton: {
            flex: 1,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        actionDanger: {
            backgroundColor: colors.danger,
            borderColor: colors.danger
        }
    });
