import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { detectText, getDetectedText } from '../services/VisionService';
import { parseMenuWithAI } from '../services/AIParsingService';
import { Image } from 'react-native';

// Static imports for test menu images
const TEST_MENU_IMAGES = {
  'ThaiMenu1': require('../../assets/test_menus/ThaiMenu1.jpg'),
  'ThaiMenu2': require('../../assets/test_menus/ThaiMenu2.jpg'),
  'ThaiMenu3': require('../../assets/test_menus/ThaiMenu3.jpg'),
  'ThaiMenu4': require('../../assets/test_menus/ThaiMenu4.jpg')
};

// Import expected parse data
// Note: Create these files in the src/tests/expected_parse directory
const EXPECTED_PARSE_DATA = {
  'ThaiMenu4': require('./expected_parse/ThaiMenu4.json')
};

/**
 * Compares the parsed menu items with the expected menu items
 * @param {Array} parsedItems - The parsed menu items from AI
 * @param {Array} expectedItems - The expected menu items from reference file
 * @returns {Object} - Scores for name, price, and overall accuracy
 */
export const compareMenuItems = (parsedItems, expectedItems) => {
  if (!parsedItems || !expectedItems) {
    return { nameScore: 0, priceScore: 0, overallScore: 0, details: [] };
  }

  // Try to parse the items if they're strings
  let parsedArray = parsedItems;
  let expectedArray = expectedItems;

  try {
    if (typeof parsedItems === 'string') {
      parsedArray = JSON.parse(parsedItems);
    }
    if (typeof expectedItems === 'string') {
      expectedArray = JSON.parse(expectedItems);
    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return { nameScore: 0, priceScore: 0, overallScore: 0, details: [] };
  }

  // Initialize counters
  let correctNames = 0;
  let correctPrices = 0;
  let exactMatches = 0;
  const totalExpected = expectedArray.length;
  const totalParsed = parsedArray.length;
  const details = [];

  // Create a copy of the parsed items to mark matches
  const parsedItemsCopy = [...parsedArray];
  const expectedItemsCopy = [...expectedArray];
  
  // First, match by name and then check if price is also correct
  for (let i = expectedItemsCopy.length - 1; i >= 0; i--) {
    const expected = expectedItemsCopy[i];
    let nameMatchFound = false;
    
    for (let j = parsedItemsCopy.length - 1; j >= 0; j--) {
      const parsed = parsedItemsCopy[j];
      
      if (parsed.name === expected.name) {
        // Name match found
        nameMatchFound = true;
        correctNames++;
        
        // Check if price also matches
        const priceMatches = parsed.price === expected.price;
        if (priceMatches) {
          correctPrices++;
          exactMatches++;
          
          details.push({
            expected,
            parsed,
            nameMatch: true,
            priceMatch: true,
            exactMatch: true
          });
        } else {
          details.push({
            expected,
            parsed,
            nameMatch: true,
            priceMatch: false,
            exactMatch: false
          });
        }
        
        // Remove matched items to avoid double counting
        expectedItemsCopy.splice(i, 1);
        parsedItemsCopy.splice(j, 1);
        break;
      }
    }
  }

  // Add remaining unmatched items to details
  expectedItemsCopy.forEach(expected => {
    details.push({
      expected,
      parsed: null,
      nameMatch: false,
      priceMatch: false,
      exactMatch: false
    });
  });

  parsedItemsCopy.forEach(parsed => {
    details.push({
      expected: null,
      parsed,
      nameMatch: false,
      priceMatch: false,
      exactMatch: false
    });
  });

  // Calculate scores as percentages
  const nameScore = totalExpected > 0 ? (correctNames / totalExpected) * 100 : 0;
  const priceScore = correctNames > 0 ? (correctPrices / correctNames) * 100 : 0; // Price accuracy among name matches
  const overallScore = totalExpected > 0 ? (exactMatches / totalExpected) * 100 : 0;

  return {
    nameScore: Math.round(nameScore * 10) / 10, // Round to 1 decimal place
    priceScore: Math.round(priceScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
    correctNames,
    correctPrices,
    exactMatches,
    totalExpected,
    totalParsed,
    details
  };
};

/**
 * Loads expected menu items from the imported data
 * @param {string} menuName - The name of the menu file (e.g., "ThaiMenu4")
 * @returns {Promise<Array>} - The expected menu items
 */
export const loadExpectedMenuItems = async (menuName) => {
  try {
    if (EXPECTED_PARSE_DATA[menuName]) {
      return EXPECTED_PARSE_DATA[menuName];
    }
    
    console.log(`Expected parse data not found for ${menuName}`);
    return null;
  } catch (error) {
    console.error(`Error loading expected menu items for ${menuName}:`, error);
    return null;
  }
};

/**
 * Main component for menu accuracy testing
 */
export default function MenuAccuracyTest() {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [availableMenus, setAvailableMenus] = useState([]);

  // Find available menus with expected parse files
  useEffect(() => {
    // Get menus that have expected parse data
    const available = Object.keys(EXPECTED_PARSE_DATA);
    setAvailableMenus(available);
  }, []);

  const runTest = async (menuName) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Get the menu image using the static mapping
      if (!TEST_MENU_IMAGES[menuName]) {
        throw new Error(`Menu image for ${menuName} not found`);
      }
      
      const menuImage = TEST_MENU_IMAGES[menuName];
      const assetInfo = Image.resolveAssetSource(menuImage);
      
      // Get image URI
      let imageUri;
      if (Platform.OS === 'ios') {
        const timestamp = new Date().getTime();
        const tempUri = `${FileSystem.cacheDirectory}temp_test_${menuName}_${timestamp}.jpg`;
        await FileSystem.downloadAsync(assetInfo.uri, tempUri);
        imageUri = tempUri;
      } else {
        imageUri = `${assetInfo.uri}?timestamp=${new Date().getTime()}`;
      }
      
      // Process the image
      console.log(`Testing menu accuracy for ${menuName}`);
      const visionResponse = await detectText(imageUri);
      const text = getDetectedText(visionResponse);
      
      if (text === "No text detected") {
        setError('No text was detected in the image');
        setLoading(false);
        return;
      }
      
      // Parse the menu text
      const parsed = await parseMenuWithAI(text);
      console.log('AI Parsed Result:', parsed);
      
      // Load expected menu items
      const expected = await loadExpectedMenuItems(menuName);
      if (!expected) {
        setError(`No expected parse file found for ${menuName}`);
        setLoading(false);
        return;
      }
      
      // Compare results
      const comparison = compareMenuItems(parsed, expected);
      setResults(comparison);
      
      console.log('Test Results:', comparison);
      
    } catch (err) {
      console.error('Error running menu test:', err);
      setError(`Error running test: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Menu Accuracy Test</Text>
      
      <View style={styles.menuSelector}>
        <Text style={styles.sectionTitle}>Select Menu to Test:</Text>
        <View style={styles.buttonGrid}>
          {availableMenus.map((menu) => (
            <Button
              key={menu}
              title={menu}
              onPress={() => setSelectedMenu(menu)}
              color={selectedMenu === menu ? '#007bff' : '#6c757d'}
            />
          ))}
        </View>
      </View>
      
      {selectedMenu && (
        <View style={styles.testControls}>
          <Button
            title={`Run Test on ${selectedMenu}`}
            onPress={() => runTest(selectedMenu)}
            disabled={loading}
          />
        </View>
      )}
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Running accuracy test...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          <View style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Name Accuracy:</Text>
              <Text style={styles.scoreValue}>{results.nameScore}%</Text>
              <Text style={styles.scoreDetail}>({results.correctNames}/{results.totalExpected})</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Price Accuracy:</Text>
              <Text style={styles.scoreValue}>{results.priceScore}%</Text>
              <Text style={styles.scoreDetail}>({results.correctPrices}/{results.totalExpected})</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Overall Accuracy:</Text>
              <Text style={[
                styles.scoreValue, 
                results.overallScore >= 80 ? styles.goodScore : 
                results.overallScore >= 50 ? styles.mediumScore : styles.badScore
              ]}>
                {results.overallScore}%
              </Text>
              <Text style={styles.scoreDetail}>({results.exactMatches}/{results.totalExpected})</Text>
            </View>
          </View>
          
          <Text style={styles.summaryText}>
            Parsed {results.totalParsed} items, expected {results.totalExpected} items.
          </Text>
          
          <Text style={styles.sectionSubtitle}>Detailed Results:</Text>
          {results.details.map((item, index) => (
            <View key={index} style={styles.detailItem}>
              {item.exactMatch ? (
                <Text style={styles.matchText}>✓ Exact Match: {item.expected.name} - {item.expected.price}</Text>
              ) : item.nameMatch && item.priceMatch ? (
                <Text style={styles.matchText}>✓ Match: {item.expected.name} - {item.expected.price}</Text>
              ) : item.nameMatch ? (
                <View>
                  <Text style={styles.partialMatchText}>~ Name Match Only:</Text>
                  <Text>Expected: {item.expected.name} - {item.expected.price}</Text>
                  <Text>Parsed: {item.parsed.name} - {item.parsed.price}</Text>
                </View>
              ) : item.priceMatch ? (
                <View>
                  <Text style={styles.partialMatchText}>~ Price Match Only:</Text>
                  <Text>Expected: {item.expected.name} - {item.expected.price}</Text>
                  <Text>Parsed: {item.parsed.name} - {item.parsed.price}</Text>
                </View>
              ) : item.expected && !item.parsed ? (
                <Text style={styles.missingText}>✗ Missing: {item.expected.name} - {item.expected.price}</Text>
              ) : !item.expected && item.parsed ? (
                <Text style={styles.extraText}>+ Extra: {item.parsed.name} - {item.parsed.price}</Text>
              ) : (
                <Text>Unknown comparison state</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f5f5f5' 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  menuSelector: {
    marginBottom: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10
  },
  testControls: {
    marginBottom: 20
  },
  loadingContainer: { 
    alignItems: 'center', 
    marginVertical: 16 
  },
  errorContainer: { 
    backgroundColor: '#ffeeee', 
    padding: 10, 
    borderRadius: 5, 
    marginBottom: 16 
  },
  errorText: { 
    color: 'red' 
  },
  resultsContainer: { 
    marginTop: 16, 
    padding: 10, 
    backgroundColor: '#fff', 
    borderRadius: 5, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5
  },
  scoreCard: {
    flexDirection: 'column',
    marginVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 10
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  scoreLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10
  },
  scoreDetail: {
    fontSize: 14,
    color: '#666'
  },
  goodScore: {
    color: 'green'
  },
  mediumScore: {
    color: 'orange'
  },
  badScore: {
    color: 'red'
  },
  summaryText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 15
  },
  detailItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  matchText: {
    color: 'green'
  },
  partialMatchText: {
    color: 'orange',
    fontWeight: '500'
  },
  missingText: {
    color: 'red'
  },
  extraText: {
    color: 'blue'
  }
}); 