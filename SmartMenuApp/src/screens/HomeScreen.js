import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import Header from '../components/Header';
import { useBoundingBox } from '../context/BoundingBoxContext';
import { useAIModel } from '../context/AIModelContext';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const { boundingBoxEnabled } = useBoundingBox();
  const { useAccurateModel } = useAIModel();

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
      setRotationAngle(0);
      setPreviewMode(true);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleUsePhoto = async () => {
    if (photo) {
      try {
        // Only apply image manipulation when user chooses to use the photo
        let finalPhotoUri = photo.uri;
        
        // Apply rotation if needed
        if (rotationAngle !== 0) {
          const manipResult = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ rotate: rotationAngle }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalPhotoUri = manipResult.uri;
        }
        
        // Pass the final photo URI, bounding box enabled state, and AI model preference
        navigation.navigate('Results', { 
          photoUri: finalPhotoUri,
          useBoundingBox: boundingBoxEnabled,
          useAccurateModel: useAccurateModel
        });
      } catch (error) {
        console.error('Error processing final image:', error);
      }
    }
  };

  const handleRetake = () => {
    setPreviewMode(false);
    setPhoto(null);
    setRotationAngle(0);
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
            <Image 
              source={photo} 
              style={[
                styles.previewImage,
                { transform: [{ rotate: `${rotationAngle}deg` }] }
              ]}
            />
            
            {/* Rotation Slider */}
            <View style={styles.sliderContainer}>
              <MaterialIcons name="rotate-left" size={24} color="white" />
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={-45}
                  maximumValue={45}
                  step={0.5}
                  value={rotationAngle}
                  onValueChange={setRotationAngle}
                  minimumTrackTintColor="#3366FF"
                  maximumTrackTintColor="#FFFFFF"
                  thumbTintColor="#3366FF"
                />
                <Text style={styles.angleReadout}>{rotationAngle.toFixed(1)}°</Text>
              </View>
              <MaterialIcons name="rotate-right" size={24} color="white" />
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => setRotationAngle(0)}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
            
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
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef} />
            <View style={styles.mainContent}>
              <View style={styles.cameraOverlay}>
                {/* BoundingBoxToggle removed from here */}
              </View>
              <View style={styles.bottomSection}>
                <View style={styles.overlayInstructions}>
                  <Text style={styles.cameraText}>Position menu in frame</Text>
                  {/* BoundingBox status text removed from here */}
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
          </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingsOverlay: {
    marginTop: 16,
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
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
  boundingBoxStatus: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
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
    justifyContent: 'space-between',
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
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    position: 'relative',
  },
  sliderWrapper: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  slider: {
    flex: 1,
    height: 40,
    width: '100%',
  },
  angleReadout: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  resetButton: {
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
