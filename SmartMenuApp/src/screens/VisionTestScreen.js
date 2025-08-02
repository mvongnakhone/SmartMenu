import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ManualVisionTest from '../tests/ManualVisionTest';

/**
 * Screen for testing the Google Cloud Vision API
 */
const VisionTestScreen = () => {
  return (
    <View style={styles.container}>
      <Header leftIconType="back" title="Vision API Test" />
      <SafeAreaView style={styles.content} edges={['bottom', 'left', 'right']}>
        <ManualVisionTest />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  }
});

export default VisionTestScreen; 