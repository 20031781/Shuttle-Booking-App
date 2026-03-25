import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { AppNavigator, type AppSection } from './src/features/navigation/AppNavigator';

export default function App() {
  const [section, setSection] = useState<AppSection>('shuttle');

  return (
    <>
      <AppNavigator section={section} onSectionChange={setSection} />
      <StatusBar style="dark" />
    </>
  );
}
