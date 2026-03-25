import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createProfileRepository } from '../../api/profileRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { SkeletonBlock } from '../../components/SkeletonBlock';
import { t } from '../../i18n';
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

function ProfileSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock style={styles.skeletonLabel} />
        <SkeletonBlock style={styles.skeletonValueLong} />
      </View>
      <View style={styles.row}>
        <SkeletonBlock style={styles.skeletonLabel} />
        <SkeletonBlock style={styles.skeletonValueMedium} />
      </View>
      <View style={styles.row}>
        <SkeletonBlock style={styles.skeletonLabel} />
        <SkeletonBlock style={styles.skeletonValueShort} />
      </View>
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
      setError(requestError instanceof Error ? requestError.message : t.profile.loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  return (
    <PageContainer>
      <SectionTitle title={t.profile.title} subtitle={t.profile.subtitle} />
      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>{t.profile.loadErrorTitle}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              void loadProfile();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryText}>{t.profile.retry}</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <View style={styles.card}>
          <Row label={t.profile.labels.fullName} value={profile.fullName} />
          <Row label={t.profile.labels.email} value={profile.email} />
          <Row label={t.profile.labels.company} value={profile.company} />
        </View>
      ) : (
        <Text style={styles.errorMessage}>{t.profile.unavailable}</Text>
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
  skeletonLabel: {
    width: 64,
    height: 10,
    borderRadius: 5
  },
  skeletonValueLong: {
    width: '72%',
    height: 18,
    borderRadius: 9
  },
  skeletonValueMedium: {
    width: '58%',
    height: 18,
    borderRadius: 9
  },
  skeletonValueShort: {
    width: '40%',
    height: 18,
    borderRadius: 9
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
