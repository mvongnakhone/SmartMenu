import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Image, PanResponder, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import Header from '../components/Header';
import { useBoundingBox } from '../context/BoundingBoxContext';
import { useAIModel } from '../context/AIModelContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;

const HomeScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropCoords, setCropCoords] = useState({
    x: 50,
    y: 100,
    width: SCREEN_WIDTH - 100,
    height: SCREEN_WIDTH,
  });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const { boundingBoxEnabled } = useBoundingBox();
  const { useAccurateModel } = useAIModel();

  // Get image dimensions when photo is set
  useEffect(() => {
    if (photo) {
      Image.getSize(photo.uri, (width, height) => {
        setImageSize({ width, height });
      });
    }
  }, [photo]);

  // Create pan responders for crop handles
  const createPanResponder = (handleType) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const { dx, dy } = gesture;
        
        setCropCoords(prev => {
          let newCoords = { ...prev };
          
          switch (handleType) {
            case 'topLeft':
              newCoords.x = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 100));
              newCoords.y = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 100));
              newCoords.width = Math.max(100, prev.width - dx);
              newCoords.height = Math.max(100, prev.height - dy);
              break;
            case 'topRight':
              newCoords.y = Math.max(0, Math.min(prev.y + dy, prev.y + prev.height - 100));
              newCoords.width = Math.max(100, prev.width + dx);
              newCoords.height = Math.max(100, prev.height - dy);
              break;
            case 'bottomLeft':
              newCoords.x = Math.max(0, Math.min(prev.x + dx, prev.x + prev.width - 100));
              newCoords.width = Math.max(100, prev.width - dx);
              newCoords.height = Math.max(100, prev.height + dy);
              break;
            case 'bottomRight':
              newCoords.width = Math.max(100, prev.width + dx);
              newCoords.height = Math.max(100, prev.height + dy);
              break;
            case 'move':
              newCoords.x = Math.max(0, Math.min(SCREEN_WIDTH - prev.width, prev.x + dx));
              newCoords.y = Math.max(0, Math.min(SCREEN_HEIGHT - prev.height, prev.y + dy));
              break;
          }
          
          return newCoords;
        });
      },
      onPanResponderRelease: () => { /* Handle release if needed */ }
    });
  };
  
  const topLeftResponder = createPanResponder('topLeft');
  const topRightResponder = createPanResponder('topRight');
  const bottomLeftResponder = createPanResponder('bottomLeft');
  const bottomRightResponder = createPanResponder('bottomRight');
  const moveResponder = createPanResponder('move');

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

  const handleGalleryPick = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
      
      // Launch the image picker with simplified options
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 1,
        allowsEditing: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Create a directory for temporary photos if it doesn't exist
        const tempDir = `${FileSystem.cacheDirectory}photos/`;
        const dirInfo = await FileSystem.getInfoAsync(tempDir);
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        }
        
        // Generate a unique filename
        const filename = `menu_${new Date().getTime()}.jpg`;
        const fileUri = `${tempDir}${filename}`;
        
        // Copy the selected photo to our app's cache directory
        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: fileUri
        });
        
        // Set the photo and enter preview mode
        setPhoto({ uri: fileUri });
        setRotationAngle(0);
        setPreviewMode(true);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      alert(`Could not load image: ${error.message}`);
    }
  };

  const resetCrop = () => {
    // Reset crop to default (full image)
    setCropCoords({
      x: 50,
      y: 100,
      width: SCREEN_WIDTH - 100,
      height: SCREEN_WIDTH,
    });
  };

  const toggleCropMode = () => {
    setIsCropMode(!isCropMode);
    // Remove the rotation reset
  };

  const handleUsePhoto = async () => {
    if (photo) {
      try {
        // Only apply image manipulation when user chooses to use the photo
        let finalPhotoUri = photo.uri;
        let actions = [];
        
        // Apply crop and rotation in the correct order for best results
        
        // Add rotation first if needed (better for cropping)
        if (rotationAngle !== 0) {
          actions.push({ rotate: rotationAngle });
        }
        
        // Add crop action if in crop mode
        if (isCropMode) {
          // Convert crop coordinates to original image scale
          const scaleX = imageSize.width / SCREEN_WIDTH;
          const scaleY = imageSize.height / SCREEN_HEIGHT;
          
          const originX = Math.floor(cropCoords.x * scaleX);
          const originY = Math.floor(cropCoords.y * scaleY);
          const cropWidth = Math.floor(cropCoords.width * scaleX);
          const cropHeight = Math.floor(cropCoords.height * scaleY);
          
          actions.push({
            crop: {
              originX,
              originY,
              width: cropWidth,
              height: cropHeight
            }
          });
        }
        
        // Apply manipulations if there are any
        if (actions.length > 0) {
          console.log('Applying image manipulations:', actions);
          const manipResult = await ImageManipulator.manipulateAsync(
            photo.uri,
            actions,
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
    setIsCropMode(false);
    resetCrop();
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
            <View style={styles.imageContainer}>
              <Image 
                source={photo} 
                style={[
                  styles.previewImage,
                  { transform: [{ rotate: `${rotationAngle}deg` }] }
                ]}
              />
              
              {/* Crop Overlay */}
              {isCropMode && (
                <View style={styles.cropOverlay}>
                  {/* Four dark rectangles to create the "outside" effect */}
                  {/* Top rectangle */}
                  <View style={[styles.cropShade, {
                    top: 0,
                    left: 0,
                    right: 0,
                    height: cropCoords.y
                  }]} />
                  
                  {/* Bottom rectangle */}
                  <View style={[styles.cropShade, {
                    top: cropCoords.y + cropCoords.height,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }]} />
                  
                  {/* Left rectangle */}
                  <View style={[styles.cropShade, {
                    top: cropCoords.y,
                    left: 0,
                    width: cropCoords.x,
                    height: cropCoords.height
                  }]} />
                  
                  {/* Right rectangle */}
                  <View style={[styles.cropShade, {
                    top: cropCoords.y,
                    left: cropCoords.x + cropCoords.width,
                    right: 0,
                    height: cropCoords.height
                  }]} />

                  {/* Crop Rectangle */}
                  <View 
                    style={[
                      styles.cropRect, 
                      {
                        left: cropCoords.x, 
                        top: cropCoords.y, 
                        width: cropCoords.width, 
                        height: cropCoords.height
                      }
                    ]}
                    {...moveResponder.panHandlers}
                  >
                    {/* Corner Handles */}
                    <View style={[styles.handle, styles.topLeftHandle]} {...topLeftResponder.panHandlers} />
                    <View style={[styles.handle, styles.topRightHandle]} {...topRightResponder.panHandlers} />
                    <View style={[styles.handle, styles.bottomLeftHandle]} {...bottomLeftResponder.panHandlers} />
                    <View style={[styles.handle, styles.bottomRightHandle]} {...bottomRightResponder.panHandlers} />
                  </View>
                </View>
              )}
            </View>
            
            {/* Edit Controls - Show either rotation or crop controls based on mode */}
            {!isCropMode ? (
              /* Rotation Slider */
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
            ) : (
              /* Crop Controls */
              <View style={styles.cropControlsContainer}>
                <TouchableOpacity 
                  style={styles.cropControlButton} 
                  onPress={resetCrop}
                >
                  <AntDesign name="reload1" size={20} color="white" />
                  <Text style={styles.cropControlText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Mode Toggle and Action Buttons */}
            <View style={styles.previewControls}>
              <TouchableOpacity 
                style={styles.previewButton} 
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={22} color="white" />
                <Text style={styles.previewButtonText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.previewButton, 
                  isCropMode ? styles.activeButton : null
                ]} 
                onPress={toggleCropMode}
              >
                <MaterialIcons 
                  name="crop" 
                  size={22} 
                  color="white" 
                />
                <Text style={styles.previewButtonText}>Crop</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.usePhotoButton]} 
                onPress={handleUsePhoto}
              >
                <Ionicons name="checkmark" size={22} color="white" />
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
                  <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryPick}>
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
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: IS_SMALL_DEVICE ? 10 : 15,
    paddingBottom: IS_SMALL_DEVICE ? 25 : 35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: '100%',
    marginBottom: 15,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: IS_SMALL_DEVICE ? 8 : 10,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    flex: 1,
    marginHorizontal: IS_SMALL_DEVICE ? 2 : 5,
  },
  usePhotoButton: {
    backgroundColor: '#3366FF',
  },
  previewButtonText: {
    color: 'white',
    fontSize: IS_SMALL_DEVICE ? 12 : 14,
    fontWeight: '600',
    marginLeft: IS_SMALL_DEVICE ? 3 : 5,
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
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Changed from rgba(0, 0, 0, 0.5) to transparent
  },
  cropShade: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker shade for outside areas
  },
  cropRect: {
    borderWidth: 2,
    borderColor: 'white',
    position: 'absolute',
  },
  handle: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    position: 'absolute',
  },
  topLeftHandle: {
    top: -10,
    left: -10,
  },
  topRightHandle: {
    top: -10,
    right: -10,
  },
  bottomLeftHandle: {
    bottom: -10,
    left: -10,
  },
  bottomRightHandle: {
    bottom: -10,
    right: -10,
  },
  cropControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  cropControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
  },
  cropControlText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeButton: {
    backgroundColor: '#3366FF', // Example active state color
  },
});

export default HomeScreen;
