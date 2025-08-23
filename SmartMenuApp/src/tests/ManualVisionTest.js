import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { detectText, getDetectedText } from '../services/VisionService';
import { translateText } from '../services/TranslationService';
import { parseMenuWithAI } from '../services/AIParsingService';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

export default function ManualVisionTest() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedText, setDetectedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [parsedText, setParsedText] = useState(""); 
  const [error, setError] = useState(null);
  const [currentImageName, setCurrentImageName] = useState("");
  const [lastImageIndex, setLastImageIndex] = useState(-1);
  const navigation = useNavigation();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setDetectedText("");
        setTranslatedText("");
        setParsedText("");
        setError(null);
      }
    } catch (err) {
      setError(`Error picking image: ${err.message}`);
      console.error(err);
    }
  };

  const useTestImage = async () => {
    try {
      const testImages = [
        require('../../assets/test_menus/ThaiMenu1.jpg'),
        require('../../assets/test_menus/ThaiMenu2.jpg'),
        require('../../assets/test_menus/ThaiMenu3.jpg'),
        require('../../assets/test_menus/ThaiMenu4.jpg'),
      ];

      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * testImages.length);
      } while (randomIndex === lastImageIndex && testImages.length > 1);

      setLastImageIndex(randomIndex);
      const randomImage = testImages[randomIndex];
      const imageName = `ThaiMenu${randomIndex + 1}`;
      const assetInfo = Image.resolveAssetSource(randomImage);

      if (Platform.OS === 'ios') {
        const timestamp = new Date().getTime();
        const tempUri = `${FileSystem.cacheDirectory}temp_menu_${randomIndex + 1}_${timestamp}.jpg`;
        await FileSystem.downloadAsync(assetInfo.uri, tempUri);
        setImage(tempUri);
      } else {
        setImage(`${assetInfo.uri}?timestamp=${new Date().getTime()}`);
      }

      setDetectedText("");
      setTranslatedText("");
      setParsedText(""); 
      setError(null);
      setCurrentImageName(imageName);

      Alert.alert(imageName, 'Test menu image loaded. Press "Process" to detect text.');
    } catch (err) {
      setError(`Error using test image: ${err.message}`);
      console.error(err);
    }
  };

  const processImage = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setDetectedText("");
    setTranslatedText("");
    setParsedText("");

    try {
      console.log('Processing image:', image);
      const visionResponse = await detectText(image);
      const text = getDetectedText(visionResponse);
      setDetectedText(text);

      if (text === "No text detected") {
        Alert.alert('No Text Found', 'No text was detected in the image.');
      } else {
        
        const parsed = await parseMenuWithAI(text);
        setParsedText(parsed);
        
        // Display AI parsed results in terminal with each item on a single line
        console.log('\n=== AI PARSED RESPONSE ===');
        if (Array.isArray(parsed)) {
          let formattedOutput = "[\n";
          parsed.forEach((item, index) => {
            formattedOutput += `  ${JSON.stringify(item)}${index < parsed.length - 1 ? ',' : ''}\n`;
          });
          formattedOutput += "]";
          console.log(formattedOutput);
        } else {
          console.log(parsed);
        }
        console.log('=========================\n');

        // Translate the parsed menu items
        const translated = await translateText(parsed);
        setTranslatedText(translated);
        
        // Display translated text in terminal
        console.log('\n=== TRANSLATED TEXT ===');
        if (Array.isArray(translated)) {
          let formattedOutput = "[\n";
          translated.forEach((item, index) => {
            formattedOutput += `  ${JSON.stringify(item)}${index < translated.length - 1 ? ',' : ''}\n`;
          });
          formattedOutput += "]";
          console.log(formattedOutput);
        } else {
          console.log(translated);
        }
        console.log('======================\n');

      }
    } catch (err) {
      setError(`Error processing image: ${err.message}`);
      console.error('Vision/Translation/Parsing error:', err);
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
      
      <View style={styles.buttonContainer}>
        <Button
          title="Run Accuracy Test"
          onPress={() => navigation.navigate('MenuAccuracyTest')}
          color="#28a745"
        />
      </View>

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} key={image} />
          {currentImageName && <Text style={styles.imageNameText}>{currentImageName}</Text>}
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
          <Text style={styles.sectionTitle}>Detected Text (Thai):</Text>
          <Text style={styles.detectedText}>{detectedText}</Text>

          {translatedText ? (
            <>
              <Text style={styles.sectionTitle}>Translated Text (English):</Text>
              <Text style={styles.detectedText}>
                {Array.isArray(translatedText) 
                  ? "[\n" + translatedText.map((item, index) => 
                      `  ${JSON.stringify(item)}${index < translatedText.length - 1 ? ',' : ''}`
                    ).join("\n") + "\n]"
                  : translatedText}
              </Text>
            </>
          ) : null}
          
          {parsedText ? (
            <>
              <Text style={styles.sectionTitle}>AI-Parsed Menu:</Text>
              <Text style={styles.parsedText}>
                {Array.isArray(parsedText) 
                  ? "[\n" + parsedText.map((item, index) => 
                      `  ${JSON.stringify(item)}${index < parsedText.length - 1 ? ',' : ''}`
                    ).join("\n") + "\n]"
                  : typeof parsedText === 'object'
                    ? JSON.stringify(parsedText)
                    : parsedText}
              </Text>
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  image: { width: '100%', height: 300, resizeMode: 'contain' },
  imageNameText: { fontSize: 16, fontWeight: 'bold', color: '#333', padding: 5, textAlign: 'center' },
  imagePathText: { fontSize: 10, color: '#666', padding: 5, textAlign: 'center' },
  loadingContainer: { alignItems: 'center', marginVertical: 16 },
  errorContainer: { backgroundColor: '#ffeeee', padding: 10, borderRadius: 5, marginBottom: 16 },
  errorText: { color: 'red' },
  resultsContainer: { marginTop: 16, padding: 10, backgroundColor: '#fff', borderRadius: 5, borderWidth: 1, borderColor: '#ddd' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  detectedText: { fontSize: 16, lineHeight: 24 },
  parsedText: { fontSize: 16, lineHeight: 24, color: '#0066cc', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
