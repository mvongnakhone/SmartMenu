import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { detectText, getDetectedText } from '../services/VisionService';
import * as FileSystem from 'expo-file-system';


export default function ManualVisionTest() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedText, setDetectedText] = useState("");
  const [error, setError] = useState(null);
  const [currentImageName, setCurrentImageName] = useState("");
  const [lastImageIndex, setLastImageIndex] = useState(-1); // Track the last used image index

  // Function to pick an image from gallery
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access media library is required!');
        return;
      }
      
      // Launch image picker with correct options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setDetectedText("");
        setError(null);
      }
    } catch (err) {
      setError(`Error picking image: ${err.message}`);
      console.error(err);
    }
  };

  // Function to use a test image from assets>test_menus
  const useTestImage = async () => {
    try {
      // For testing with menu images from test_menus directory
      // Get asset's local URI
      const testImages = [
        require('../../assets/test_menus/ThaiMenu1.jpg'),
        require('../../assets/test_menus/ThaiMenu2.jpg'),
        require('../../assets/test_menus/ThaiMenu3.jpg'),
        require('../../assets/test_menus/ThaiMenu4.jpg'),
      ];
      
      // Select a random test image that's different from the last one
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * testImages.length);
      } while (randomIndex === lastImageIndex && testImages.length > 1);
      
      // Update the last image index
      setLastImageIndex(randomIndex);
      
      const randomImage = testImages[randomIndex];
      if (!randomImage) {
        throw new Error('Failed to load test image');
      }
      
      const imageName = `ThaiMenu${randomIndex + 1}`;
      
      const assetInfo = Image.resolveAssetSource(randomImage);
      
      // For iOS, we need to handle the asset URI differently
      if (Platform.OS === 'ios') {
        // Create a temporary file with a unique name based on timestamp
        const timestamp = new Date().getTime();
        const tempUri = `${FileSystem.cacheDirectory}temp_menu_${randomIndex + 1}_${timestamp}.jpg`;
        
        // Copy the asset to the temp file
        await FileSystem.downloadAsync(assetInfo.uri, tempUri);
        setImage(tempUri);
      } else {
        // On Android, we can use the asset URI directly
        // Add a timestamp to force the Image component to update
        setImage(`${assetInfo.uri}?timestamp=${new Date().getTime()}`);
      }
      
      setDetectedText("");
      setError(null);
      setCurrentImageName(imageName);
      
      Alert.alert(imageName, 'Test menu image loaded successfully. Press "Process with Vision API" to detect text.');
    } catch (err) {
      setError(`Error using test image: ${err.message}`);
      console.error(err);
    }
  };

  // Function to process the selected image
  const processImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Processing image:', image);
      
      // Call the Vision API
      const visionResponse = await detectText(image);
      
      // Get detected text
      const text = getDetectedText(visionResponse);
      setDetectedText(text);
      
      if (text === "No text detected") {
        Alert.alert('No Text Found', 'No text was detected in the image. Try another image.');
      }
    } catch (err) {
      setError(`Error processing image: ${err.message}`);
      console.error('Vision API error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Pick Image" onPress={pickImage} />
        <Button title="Use Test Image" onPress={useTestImage} />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Process with Vision API" 
          onPress={processImage} 
          disabled={!image || loading} 
        />
      </View>
      
      {image && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: image }} 
            style={styles.image} 
            key={image} // Add key to force re-render
          />
          {currentImageName ? (
            <Text style={styles.imageNameText}>{currentImageName}</Text>
          ) : null}
          <Text style={styles.imagePathText}>{image}</Text>
        </View>
      )}
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing image...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {detectedText && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Detected Text:</Text>
          <Text style={styles.detectedText}>{detectedText}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  imageNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 5,
    textAlign: 'center',
  },
  imagePathText: {
    fontSize: 10,
    color: '#666',
    padding: 5,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
  },
  resultsContainer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detectedText: {
    fontSize: 16,
    lineHeight: 24,
  }
}); 