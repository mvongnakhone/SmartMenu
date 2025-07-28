import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const handleCapture = () => {
    navigation.navigate('Results');
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3366FF" />
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions not granted yet
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3366FF" />
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.noPermissionText}>We need your permission to show the camera</Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

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
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraContent}>
              <View style={styles.overlayInstructions}>
                <Text style={styles.cameraText}>Position menu in frame</Text>
              </View>
            </View>
          </CameraView>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.galleryButton}>
            <MaterialIcons name="photo-library" size={28} color="white" />
          </TouchableOpacity>

          {/* CAMERA BUTTON */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
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
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
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
  },
  cameraContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayInstructions: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 15,
  },
  cameraText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    paddingBottom: 20,
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
    borderWidth: 3,
    borderColor: 'white',
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
  noPermissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  permissionButton: {
    backgroundColor: '#3366FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
