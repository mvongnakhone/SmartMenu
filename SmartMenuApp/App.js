import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { BoundingBoxProvider } from './src/context/BoundingBoxContext';
import { AIModelProvider } from './src/context/AIModelContext';
import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import VisionTestScreen from './src/screens/VisionTestScreen';
import MenuAccuracyTest from './src/tests/MenuAccuracyTest';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <BoundingBoxProvider>
          <AIModelProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Results" component={ResultsScreen} />
                <Stack.Screen name="VisionTest" component={VisionTestScreen} />
                <Stack.Screen 
                  name="MenuAccuracyTest"
                  component={MenuAccuracyTest}
                  options={{
                    headerShown: true,
                    title: 'Menu Accuracy Test',
                    headerStyle: {
                      backgroundColor: '#3366FF',
                    },
                    headerTintColor: '#fff',
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AIModelProvider>
        </BoundingBoxProvider>
      </CurrencyProvider>
    </SafeAreaProvider>
  );
}
