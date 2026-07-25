import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppSessionProvider } from './context/AppSessionContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { RootNavigator } from './navigation/RootNavigator';
import { BootScreen } from './screens/BootScreen';

export default function App() {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <AppSessionProvider>
            {booting ? <BootScreen /> : <RootNavigator />}
            <StatusBar barStyle="dark-content" />
          </AppSessionProvider>
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
