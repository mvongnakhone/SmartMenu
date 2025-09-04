import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useCurrency } from '../context/CurrencyContext';
import { useBoundingBox } from '../context/BoundingBoxContext';
import { useAIModel } from '../context/AIModelContext';
import BoundingBoxToggle from '../components/BoundingBoxToggle';
import { detectText, getDetectedText } from '../services/VisionService.ts';
import { translateText } from '../services/TranslationService.ts';
import { parseMenuWithAI } from '../services/AIParsingService.ts';
import { matchAndEnrichMenuItems } from '../services/MenuMatchService.ts';

// Processing steps
const STEPS = {
  IDLE: 'idle',
  OCR: 'ocr',
  PARSING: 'parsing',
  TRANSLATION: 'translation',
  ENRICHMENT: 'enrichment',
  COMPLETE: 'complete',
  ERROR: 'error'
};

const ResultsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { currency, exchangeRates } = useCurrency();
  const { boundingBoxEnabled } = useBoundingBox();
  const { useAccurateModel } = useAIModel();
  
  // State for the processing pipeline
  const [currentStep, setCurrentStep] = useState(STEPS.IDLE);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [rawOcrText, setRawOcrText] = useState('');
  
  // Get photo URI and bounding box setting from route params
  const photoUri = route?.params?.photoUri;
  // Get showBoundingBox from route params if available, otherwise use context value
  const showBoundingBox = route?.params?.useBoundingBox !== undefined 
    ? route.params.useBoundingBox 
    : boundingBoxEnabled;

  // Process the image through the full pipeline
  useEffect(() => {
    const processImage = async () => {
      if (!photoUri) {
        setError('No photo provided');
        setCurrentStep(STEPS.ERROR);
        return;
      }

      try {
        // Step 1: OCR
        setCurrentStep(STEPS.OCR);
        console.log('Starting OCR processing...');
        console.log(`Processing image with bounding box: ${showBoundingBox ? 'enabled' : 'disabled'}`);
        
        const visionResponse = await detectText(photoUri, showBoundingBox);
        const detectedText = getDetectedText(visionResponse, showBoundingBox);
        
        if (!detectedText || detectedText === 'No text detected') {
          setError('No text was detected in the image');
          setCurrentStep(STEPS.ERROR);
          return;
        }
        
        setRawOcrText(detectedText);
        console.log('OCR text detected:', detectedText);
        
        // Step 2: Parsing with AI
        setCurrentStep(STEPS.PARSING);
        console.log(`Parsing menu text with ${useAccurateModel ? 'accurate' : 'fast'} model...`);
        
        const parsedMenu = await parseMenuWithAI(detectedText, useAccurateModel);
        
        if (!parsedMenu || parsedMenu === 'No text to parse' || parsedMenu.includes('failed')) {
          setError('Failed to parse menu items');
          setCurrentStep(STEPS.ERROR);
          return;
        }
        
        let parsedItems;
        try {
          // Parse if it's a string, otherwise use as is
          parsedItems = typeof parsedMenu === 'string' ? JSON.parse(parsedMenu) : parsedMenu;
          
          if (!Array.isArray(parsedItems)) {
            throw new Error('Parsed result is not an array');
          }
        } catch (parseError) {
          console.error('Error parsing menu items:', parseError);
          setError('Failed to parse menu JSON');
          setCurrentStep(STEPS.ERROR);
          return;
        }
        
        console.log('Successfully parsed menu items:', parsedItems.length);
        
        // Step 3: Translation - explicitly call translation service
        setCurrentStep(STEPS.TRANSLATION);
        console.log('Translating menu items to English...');
        
        let translatedItems;
        try {
          translatedItems = await translateText(parsedItems, 'en');
          
          if (translatedItems === 'Translation failed') {
            console.error('Translation service returned error');
            // Continue with untranslated items rather than failing
            translatedItems = parsedItems.map(item => ({
              name: item.name || '',
              thaiName: item.name || '',
              price: item.price
            }));
          }
          
          console.log('Successfully translated menu items:', translatedItems.length);
        } catch (translationError) {
          console.error('Translation error:', translationError);
          // Fall back to parsed items if translation fails
          translatedItems = parsedItems.map(item => ({
            name: item.name || '',
            thaiName: item.name || '',
            price: item.price
          }));
        }
        
        // Step 4: Enrichment with additional data
        setCurrentStep(STEPS.ENRICHMENT);
        console.log('Enriching menu items with additional data...');
        
        const enrichedItems = matchAndEnrichMenuItems(translatedItems);
        
        // Convert to the format needed for display
        const processedItems = enrichedItems.map(item => ({
          name: (item.name || item.matchedEnglishName || 'Unknown Item').toString(),
          thaiName: item.thaiName ? item.thaiName.toString() : 
                    item.matchedThaiScript ? item.matchedThaiScript.toString() : 
                    item.matchedThaiName ? item.matchedThaiName.toString() : '',
          priceTHB: typeof item.price === 'number' ? item.price : 
                    typeof item.price === 'string' ? parseFloat(item.price) || 0 : 0,
          description: item.description ? item.description.toString() : '',
          imageUrl: item.imageUrl ? item.imageUrl.toString() : '',
          // Use a local placeholder image if no image URL is available
          image: require('../../assets/placeholder.jpg'),
          category: item.category ? item.category.toString() : '',
          region: item.region ? item.region.toString() : '',
          matchSource: item.matchSource ? item.matchSource.toString() : '',
          matchConfidence: item.matchConfidence
        }));
        
        console.log('Menu processing complete!', processedItems.length);
        setMenuItems(processedItems);
        setCurrentStep(STEPS.COMPLETE);
      } catch (err) {
        console.error('Error in menu processing pipeline:', err);
        setError(`Processing error: ${err.message}`);
        setCurrentStep(STEPS.ERROR);
      }
    };

    if (photoUri) {
      processImage();
    }
  }, [photoUri, showBoundingBox, useAccurateModel]);

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getProcessingMessage = () => {
    switch (currentStep) {
      case STEPS.OCR:
        return 'Detecting text in image...';
      case STEPS.PARSING:
        return 'Parsing menu items...';
      case STEPS.TRANSLATION:
        return 'Translating menu content...';
      case STEPS.ENRICHMENT:
        return 'Enriching with dish information...';
      case STEPS.ERROR:
        return `Error: ${error}`;
      default:
        return 'Processing menu...';
    }
  };

  // Loading indicator while processing
  const renderLoading = () => (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#3366FF" />
      <Text style={styles.loadingText}>{getProcessingMessage()}</Text>
      {currentStep === STEPS.ERROR && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryText}>Try another photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      {/* Use item's image URL if available, otherwise use local placeholder */}
      {item.imageUrl ? (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.image} 
          defaultSource={require('../../assets/placeholder.jpg')}
        />
      ) : (
        <Image 
          source={item.image} 
          style={styles.image} 
        />
      )}
      <View style={styles.detailsContainer}>
        <View style={styles.textGroup}>
          <Text style={styles.dishName}>{item.name}</Text>
          {!!item.thaiName && <Text style={styles.thaiName}>{item.thaiName}</Text>}
          <TouchableOpacity style={styles.moreInfoRow} onPress={() => toggleExpand(index)}>
            <Text style={styles.moreInfo}>More info</Text>
            <Ionicons
              name={expandedItems[index] ? "chevron-up" : "chevron-down"}
              size={16}
              color="#3366ff"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.priceGroup}>
          <Text style={styles.convertedPrice}>
            {!item.priceTHB || item.priceTHB === 0 ? 
              "Price Unknown" : 
              currency + " " + (item.priceTHB * (exchangeRates[currency] || 1)).toFixed(2)
            }
          </Text>
          {currency !== 'THB' && !!item.priceTHB && item.priceTHB !== 0 && (
            <Text style={styles.originalPrice}>{"฿" + item.priceTHB}</Text>
          )}
        </View>
      </View>
      {expandedItems[index] && (
        <View style={styles.expandedContent}>
          <Text style={styles.description}>{item.description || "No description available."}</Text>
          {!!item.category && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
          )}
          {!!item.region && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.region}</Text>
            </View>
          )}
          {!!item.matchSource && (
            <Text style={styles.sourceText}>Source: {item.matchSource} {item.matchConfidence ? `(${(item.matchConfidence * 100).toFixed(0)}% match)` : ''}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header Component */}
      <Header leftIconType="back" />

      <View style={styles.contentContainer}>
        {/* Loading state or content */}
        {currentStep !== STEPS.COMPLETE ? (
          renderLoading()
        ) : (
          menuItems.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No menu items found</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.retryText}>Try another photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={menuItems}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 0, // Remove top padding
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8, // Reduced top padding
    paddingBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  textGroup: {
    flex: 1,
    paddingRight: 8,
  },
  dishName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  thaiName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  moreInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  moreInfo: {
    color: '#3366ff',
    fontSize: 14,
  },
  priceGroup: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  convertedPrice: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#22aa44',
  },
  originalPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f0f5ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  tagText: {
    color: '#3366ff',
    fontSize: 12,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3366ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default ResultsScreen;
