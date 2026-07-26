import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppSessionProvider } from './context/AppSessionContext';
import { useAppSession } from './context/AppSessionContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { RootNavigator } from './navigation/RootNavigator';
import { BootScreen } from './screens/BootScreen';

function AppContent() {
  const { booting } = useAppSession();
  return (
    <>
      {booting ? <BootScreen /> : <RootNavigator />}
      <StatusBar barStyle="dark-content" />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <AppSessionProvider>
            <AppContent />
          </AppSessionProvider>
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
