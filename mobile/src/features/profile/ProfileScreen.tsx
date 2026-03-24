import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { createProfileRepository } from '../../api/profileRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { colors } from '../../theme/colors';
import type { UserProfile } from '../../types/domain';

const repository = createProfileRepository();

type RowProps = {
  label: string;
  value: string;
};

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    setError(null);

    try {
      const currentProfile = await repository.get();
      setProfile(currentProfile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Errore nel caricamento del profilo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <PageContainer>
      <SectionTitle title="Profilo" subtitle="Dati utente" />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Impossibile caricare il profilo</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              void loadProfile();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <View style={styles.card}>
          <Row label="Nome" value={profile.fullName} />
          <Row label="Email" value={profile.email} />
          <Row label="Azienda" value={profile.company} />
        </View>
      ) : (
        <Text style={styles.errorMessage}>Profilo non disponibile.</Text>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  row: {
    gap: 3
  },
  label: {
    color: colors.subtleText,
    fontSize: 12,
    textTransform: 'uppercase'
  },
  value: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  errorMessage: {
    color: colors.subtleText
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  retryText: {
    color: colors.surface,
    fontWeight: '600'
  }
});
