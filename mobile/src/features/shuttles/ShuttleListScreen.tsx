import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';

import { StaticShuttleRepository } from '../../api/shuttleRepository';
import { PageContainer } from '../../components/PageContainer';
import { SectionTitle } from '../../components/SectionTitle';
import { colors } from '../../theme/colors';
import type { Shuttle } from '../../types/domain';
import { ShuttleCard } from './ShuttleCard';

const repository = new StaticShuttleRepository();

export function ShuttleListScreen() {
  const [items, setItems] = useState<Shuttle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repository
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer>
      <SectionTitle title="Shuttle" subtitle="Corse disponibili oggi" />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => <ShuttleCard shuttle={item} />}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Text style={styles.separator}> </Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24
  },
  separator: {
    height: 10
  }
});
