import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { StaticProfileRepository } from '../../api/profileRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { colors } from '../../theme/colors';
import type { UserProfile } from '../../types/domain';

const repository = new StaticProfileRepository();

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

  useEffect(() => {
    repository.get().then(setProfile);
  }, []);

  return (
    <PageContainer>
      <SectionTitle title="Profilo" subtitle="Dati utente" />
      {!profile ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.card}>
          <Row label="Nome" value={profile.fullName} />
          <Row label="Email" value={profile.email} />
          <Row label="Azienda" value={profile.company} />
        </View>
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
  }
});
