import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import Header from '../components/Header';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    
    try {
      // Take picture
      const capturedPhoto = await cameraRef.current.takePictureAsync();
      
      // Create a directory for temporary photos if it doesn't exist
      const tempDir = `${FileSystem.cacheDirectory}photos/`;
      const dirInfo = await FileSystem.getInfoAsync(tempDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      }
      
      // Generate a unique filename
      const filename = `menu_${new Date().getTime()}.jpg`;
      const fileUri = `${tempDir}${filename}`;
      
      // Copy the photo to our app's cache directory
      await FileSystem.copyAsync({
        from: capturedPhoto.uri,
        to: fileUri
      });
      
      // Set the photo and enter preview mode
      setPhoto({ uri: fileUri });
      setPreviewMode(true);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleUsePhoto = () => {
    if (photo) {
      navigation.navigate('Results', { photoUri: photo.uri });
    }
  };

  const handleRetake = () => {
    setPreviewMode(false);
    setPhoto(null);
  };

  if (!permission) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.safeArea}>
            <Text style={styles.loadingText}>Loading camera...</Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.safeArea}>
            <Text style={styles.noPermissionText}>We need your permission to show the camera</Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header Component */}
      <Header leftIconType="menu" />

      {/* Camera View or Preview */}
      <View style={styles.cameraWrapper}>
        {previewMode ? (
          <View style={styles.previewContainer}>
            <Image source={photo} style={styles.previewImage} />
            <View style={styles.previewControls}>
              <TouchableOpacity 
                style={styles.previewButton} 
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={24} color="white" />
                <Text style={styles.previewButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.previewButton, styles.usePhotoButton]} 
                onPress={handleUsePhoto}
              >
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.previewButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.mainContent}>
              <View style={styles.cameraContainer} />
              <View style={styles.bottomSection}>
                <View style={styles.overlayInstructions}>
                  <Text style={styles.cameraText}>Position menu in frame</Text>
                </View>

                <View style={styles.controlsContainer}>
                  <TouchableOpacity style={styles.galleryButton}>
                    <MaterialIcons name="photo-library" size={28} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.captureButton}
                    onPress={handleCapture}
                  >
                    <View style={styles.captureButtonInner}></View>
                  </TouchableOpacity>
                  <View style={styles.placeholder}></View>
                </View>
              </View>
            </View>
          </CameraView>
        )}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraContainer: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    minWidth: 120,
  },
  usePhotoButton: {
    backgroundColor: '#3366FF',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HomeScreen;
