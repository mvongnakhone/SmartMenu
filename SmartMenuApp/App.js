// App.js
import React, { useEffect } from 'react';
import { StatusBar, Platform, UIManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 🧭 Screens (note the src/ prefix)
import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import DishDetailScreen from './src/screens/DishDetailScreen';

// Context
import { CurrencyProvider } from './src/context/CurrencyContext';

const Stack = createNativeStackNavigator();

export default function App() {
  // Enable LayoutAnimation on Android (for the expand/collapse animation)
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  return (
    <CurrencyProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </CurrencyProvider>
  );
}
