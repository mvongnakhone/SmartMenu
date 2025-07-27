import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>SmartMenu</Text>
          <TouchableOpacity style={styles.currencyButton}>
            <Ionicons name="globe-outline" size={24} color="white" />
            <Text style={styles.currencyText}>USD</Text>
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <View style={styles.cameraContent}>
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={80} color="white" />
            </View>
            <Text style={styles.cameraText}>Take a photo of a Thai menu</Text>
            <Text style={styles.cameraSubtext}>
              Position the menu within the frame and make sure the text is clearly visible
            </Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.galleryButton}>
            <MaterialIcons name="photo-library" size={28} color="white" />
          </TouchableOpacity>

          {/* CAMERA BUTTON */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => {
              navigation.navigate('Results');
            }}
          >
            <View style={styles.captureButtonInner}></View>
          </TouchableOpacity>

          <View style={styles.placeholder}></View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: '#3366FF',
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currencyText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContent: {
    alignItems: 'center',
    padding: 20,
  },
  cameraIconContainer: {
    marginBottom: 20,
  },
  cameraText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  cameraSubtext: {
    color: 'white',
    opacity: 0.7,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#000',
  },
  placeholder: {
    width: 60,
  },
});

export default HomeScreen;
