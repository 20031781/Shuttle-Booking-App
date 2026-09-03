import {Ionicons} from '@expo/vector-icons';
import {useRef, useState} from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

import {
    loginWithGoogle,
    loginWithPassword,
    type PasswordCredentials,
    registerWithPassword
} from '@/api/authSession';
import {ApiStatusBanner} from '@/components/ApiStatusBanner';
import {useDialog} from '@/components/DialogProvider';
import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {createGlobalStyles} from '@/theme/globalStyles';
import {useAppTheme} from '@/theme/theme';
import {getFriendlyErrorMessage} from '@/lib/errors';
import googleSignInService from '@/services/google-signin.service';
import {GoogleSignInConfigurationError} from '@/services/google-signin.types';

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

type LoginScreenProps = {
    forcedMessage?: string | null;
};

export function LoginScreen({forcedMessage = null}: LoginScreenProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const {showDialog} = useDialog();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const lastAutoFillChange = useRef({
        email: {time: 0, jump: false},
        password: {time: 0, jump: false}
    });

    function handleAutofillAwareChange(field: 'email' | 'password', value: string) {
        const previousValue = field === 'email' ? email : password;
        const now = Date.now();
        const jump = value.length - previousValue.length > 3;
        const counterpart = field === 'email' ? lastAutoFillChange.current.password : lastAutoFillChange.current.email;

        lastAutoFillChange.current[field] = {time: now, jump};

        if (jump && counterpart.jump && Math.abs(now - counterpart.time) < 800) {
            Keyboard.dismiss();
        }

        if (field === 'email') {
            setEmail(value);
            return;
        }

        setPassword(value);
    }

    async function submitWithPassword(action: (credentials: PasswordCredentials) => Promise<void>) {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !password) {
            setErrorMessage(t.auth.missingFields);
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);
        try {
            await action({email: normalizedEmail, password});
        } catch (error) {
            const message = getFriendlyErrorMessage(error, t.auth.loginFailed);
            setErrorMessage(message);
            showDialog({title: t.common.error, message});
        } finally {
            setSubmitting(false);
        }
    }

    async function handleGoogleLogin(forceAccountPicker = false) {
        if (submitting || isGoogleLoading) {
            return;
        }

        if (!googleSignInService.isAvailable) {
            setErrorMessage(t.auth.googleConfigMissing);
            return;
        }

        Keyboard.dismiss();
        setIsGoogleLoading(true);
        setErrorMessage(null);
        try {
            const idToken = await googleSignInService.signIn({forceAccountPicker});
            // Annullare il selettore Google è un'uscita intenzionale, non un errore.
            if (!idToken) {
                return;
            }

            await loginWithGoogle(idToken);
        } catch (error) {
            const fallbackMessage = error instanceof GoogleSignInConfigurationError
                ? t.auth.googleConfigMissing
                : t.auth.googleLoginFailed;
            const message = getFriendlyErrorMessage(error, fallbackMessage);
            setErrorMessage(message);
            showDialog({title: t.common.error, message});
        } finally {
            setIsGoogleLoading(false);
        }
    }

    const isBusy = submitting || isGoogleLoading;

    return <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ApiStatusBanner/>
            <View style={styles.hero}>
                <Text style={styles.heroBadge}>{t.auth.badge}</Text>
                <Text style={styles.heroTitle}>{t.auth.title}</Text>
                <Text style={styles.heroSubtitle}>{t.auth.subtitle}</Text>
            </View>

            <View style={[globalStyles.card, styles.formCard]}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.auth.emailLabel}</Text>
                    <TextInput
                        value={email}
                        onChangeText={value => handleAutofillAwareChange('email', value)}
                        placeholder={t.auth.emailPlaceholder}
                        placeholderTextColor={colors.mutedText}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType="username"
                        autoComplete="email"
                        importantForAutofill="yes"
                        blurOnSubmit={false}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.auth.passwordLabel}</Text>
                    <TextInput
                        ref={passwordInputRef}
                        value={password}
                        onChangeText={value => handleAutofillAwareChange('password', value)}
                        placeholder={t.auth.passwordPlaceholder}
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType={isSignUp ? 'newPassword' : 'password'}
                        autoComplete={isSignUp ? 'new-password' : 'password'}
                        importantForAutofill="yes"
                        returnKeyType="go"
                        onSubmitEditing={() =>
                            submitWithPassword(isSignUp ? registerWithPassword : loginWithPassword)
                        }
                        style={styles.input}
                    />
                </View>

                {forcedMessage ? <Text style={styles.infoText}>{forcedMessage}</Text> : null}
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => submitWithPassword(isSignUp ? registerWithPassword : loginWithPassword)}
                    style={[globalStyles.primaryButton, styles.primaryAction, isBusy && styles.disabledAction]}>
                    <Text style={globalStyles.primaryButtonText}>
                        {submitting ? t.auth.inProgress : isSignUp ? t.auth.signUp : t.auth.signIn}
                    </Text>
                </Pressable>

                {googleSignInService.isAvailable ? <>
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine}/>
                        <Text style={styles.dividerText}>{t.auth.orDivider}</Text>
                        <View style={styles.dividerLine}/>
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => void handleGoogleLogin()}
                        style={[globalStyles.outlineButton, styles.googleButton, isBusy && styles.disabledAction]}>
                        {isGoogleLoading
                            ? <ActivityIndicator color={colors.primary}/>
                            : <>
                                <Ionicons name="logo-google" size={18} color={colors.text}/>
                                <Text style={[globalStyles.outlineButtonText, styles.googleButtonText]}>
                                    {t.auth.googleButton}
                                </Text>
                            </>}
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => void handleGoogleLogin(true)}
                        style={styles.googleSwitchAccountButton}>
                        <Text style={[styles.googleSwitchAccountText, isBusy && styles.disabledAction]}>
                            {t.auth.googleUseAnotherAccount}
                        </Text>
                    </Pressable>
                </> : null}

                <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => {
                        setIsSignUp(current => !current);
                        setErrorMessage(null);
                    }}
                    style={[styles.switchModeButton, isBusy && styles.disabledAction]}>
                    <Text style={styles.switchModeText}>
                        {isSignUp ? t.auth.switchToSignIn : t.auth.switchToSignUp}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background
        },
        scrollContent: {
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
            gap: 16
        },
        hero: {
            gap: 6
        },
        heroBadge: {
            alignSelf: 'flex-start',
            color: colors.primary,
            fontWeight: '700',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.8
        },
        heroTitle: {
            color: colors.text,
            fontSize: 30,
            fontWeight: '700'
        },
        heroSubtitle: {
            color: colors.subtleText,
            fontSize: 15
        },
        formCard: {
            gap: 14
        },
        inputGroup: {
            gap: 6
        },
        inputLabel: {
            color: colors.subtleText,
            fontSize: 12,
            textTransform: 'uppercase'
        },
        input: {
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            color: colors.text,
            backgroundColor: colors.surface
        },
        errorText: {
            color: colors.danger,
            fontSize: 13
        },
        infoText: {
            color: colors.primary,
            fontSize: 13
        },
        primaryAction: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        googleButton: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8
        },
        googleButtonText: {
            fontWeight: '600'
        },
        dividerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 2
        },
        dividerLine: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border
        },
        dividerText: {
            color: colors.subtleText,
            fontSize: 12
        },
        googleSwitchAccountButton: {
            alignItems: 'center',
            paddingVertical: 2
        },
        googleSwitchAccountText: {
            color: colors.subtleText,
            fontSize: 12,
            textDecorationLine: 'underline'
        },
        switchModeButton: {
            alignItems: 'center',
            paddingVertical: 4
        },
        switchModeText: {
            color: colors.primary,
            fontWeight: '600'
        },
        disabledAction: {
            opacity: 0.55
        }
    });
