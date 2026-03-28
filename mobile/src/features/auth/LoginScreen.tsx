import {Ionicons} from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {useEffect, useRef, useState} from 'react';
import {
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
} from '../../api/authSession';
import {apiConfig} from '../../api/config';
import {t} from '../../i18n';
import type {AppThemeColors} from '../../theme/colors';
import {createGlobalStyles} from '../../theme/globalStyles';
import {useAppTheme} from '../../theme/theme';

WebBrowser.maybeCompleteAuthSession();

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function LoginScreen() {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const globalStyles = createGlobalStyles(colors);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [pendingGoogleEmail, setPendingGoogleEmail] = useState<string | null>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const lastAutoFillChange = useRef({
        email: {time: 0, jump: false},
        password: {time: 0, jump: false}
    });

    const hasGoogleConfig = Boolean(
        Platform.select({
            android: apiConfig.googleAndroidClientId || apiConfig.googleExpoClientId,
            ios: apiConfig.googleIosClientId || apiConfig.googleExpoClientId,
            web: apiConfig.googleWebClientId,
            default: ''
        })
    );
    const fallbackClientId = 'missing-google-client-id.apps.googleusercontent.com';
    const resolvedAndroidClientId =
        apiConfig.googleAndroidClientId || apiConfig.googleExpoClientId || fallbackClientId;
    const resolvedIosClientId =
        apiConfig.googleIosClientId || apiConfig.googleExpoClientId || fallbackClientId;
    const resolvedWebClientId = apiConfig.googleWebClientId || fallbackClientId;

    const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
        clientId: apiConfig.googleExpoClientId || resolvedWebClientId,
        androidClientId: resolvedAndroidClientId,
        iosClientId: resolvedIosClientId,
        webClientId: resolvedWebClientId,
        scopes: ['openid', 'profile', 'email'],
        selectAccount: true,
        responseType: 'id_token'
    });

    useEffect(() => {
        if (!googleResponse || googleResponse.type !== 'success') {
            if (googleResponse?.type === 'error') {
                setErrorMessage(t.auth.googleLoginFailed);
            }
            return;
        }

        const idToken = googleResponse.params.id_token;
        if (!idToken || !pendingGoogleEmail) {
            setErrorMessage(t.auth.googleTokenMissingInResponse);
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);

        void loginWithGoogle(pendingGoogleEmail, idToken)
            .catch(error => setErrorMessage(error instanceof Error ? error.message : t.auth.loginFailed))
            .finally(() => setSubmitting(false));
    }, [googleResponse, pendingGoogleEmail]);

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
            setErrorMessage(error instanceof Error ? error.message : t.auth.loginFailed);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleGoogleLogin() {
        if (!hasGoogleConfig) {
            setErrorMessage(t.auth.googleConfigMissing);
            return;
        }

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            setErrorMessage(t.auth.emailRequiredForGoogle);
            return;
        }

        if (!googleRequest) {
            setErrorMessage(t.auth.googleUnavailable);
            return;
        }

        setPendingGoogleEmail(normalizedEmail);
        setErrorMessage(null);
        await promptGoogleAsync();
    }

    return <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Pressable
                    disabled={submitting}
                    onPress={() => submitWithPassword(isSignUp ? registerWithPassword : loginWithPassword)}
                    style={[globalStyles.primaryButton, styles.primaryAction, submitting && styles.disabledAction]}>
                    <Text style={globalStyles.primaryButtonText}>
                        {submitting ? t.auth.inProgress : isSignUp ? t.auth.signUp : t.auth.signIn}
                    </Text>
                </Pressable>

                <Pressable
                    disabled={submitting}
                    onPress={handleGoogleLogin}
                    style={[styles.googleButton, submitting && styles.disabledAction]}>
                    <Ionicons name="logo-google" size={18} color={colors.text}/>
                    <Text style={styles.googleButtonText}>{t.auth.googleButton}</Text>
                </Pressable>

                <Pressable
                    disabled={submitting}
                    onPress={() => {
                        setIsSignUp(current => !current);
                        setErrorMessage(null);
                    }}
                    style={styles.switchModeButton}>
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
        primaryAction: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center'
        },
        googleButton: {
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            backgroundColor: colors.surfaceSecondary
        },
        googleButtonText: {
            color: colors.text,
            fontWeight: '600'
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
