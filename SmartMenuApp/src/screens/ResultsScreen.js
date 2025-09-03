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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useCurrency } from '../context/CurrencyContext';
import { useBoundingBox } from '../context/BoundingBoxContext';
import { useAIModel } from '../context/AIModelContext';
import BoundingBoxToggle from '../components/BoundingBoxToggle';

const ResultsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { currency, exchangeRates } = useCurrency();
  const { boundingBoxEnabled } = useBoundingBox();
  const { useAccurateModel } = useAIModel();
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const photoUri = route?.params?.photoUri;
  // Get showBoundingBox from route params if available, otherwise use context value
  const showBoundingBox = route?.params?.useBoundingBox !== undefined 
    ? route.params.useBoundingBox 
    : boundingBoxEnabled;

  // This would be where we'd process the image with Google Cloud Vision API
  useEffect(() => {
    if (photoUri) {
      setLoading(true);
      // Simulate API call delay
      const timer = setTimeout(() => {
        setLoading(false);
        
        console.log(`Processing image with bounding box: ${showBoundingBox ? 'enabled' : 'disabled'}`);
        console.log(`Using ${useAccurateModel ? 'accurate' : 'fast'} AI model`);
        
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [photoUri, showBoundingBox, useAccurateModel]);

  const translatedDishes = route?.params?.translatedDishes || [
    {
      name: 'Pad Thai',
      thaiName: 'ผัดไทย',
      priceTHB: 120,
      image: require('../../assets/padthai.jpg'),
      description: 'Stir-fried rice noodles with eggs, tofu, bean sprouts, and peanuts. A popular Thai street food.',
    },
    {
      name: 'Tom Yum Soup',
      thaiName: 'ต้มยำกุ้ง',
      priceTHB: 150,
      image: require('../../assets/tomyum.jpg'),
      description: 'Hot and sour soup with shrimp, lemongrass, galangal, and kaffir lime leaves. Known for its distinct spicy and aromatic flavors.',
    },
    {
      name: 'Green Curry',
      thaiName: 'แกงเขียวหวาน',
      priceTHB: 130,
      image: require('../../assets/greencurry.jpg'),
      description: 'Thai curry made with green curry paste, coconut milk, meat, and vegetables. Slightly sweet with a moderate spice level.',
    },
    {
      name: 'Mango Sticky Rice',
      thaiName: 'ข้าวเหนียวมะม่วง',
      priceTHB: 100,
      image: require('../../assets/mangorice.jpg'),
      description: 'Traditional Thai dessert made with glutinous rice, fresh mango, and coconut milk. Sweet and refreshing.',
    },
    {
      name: 'Som Tum (Papaya Salad)',
      thaiName: 'ส้มตำ',
      priceTHB: 90,
      image: require('../../assets/somtum.jpg'),
      description: 'Spicy salad made from shredded unripe papaya, tomatoes, chili, lime, and fish sauce. Fresh, crunchy, and intensely flavorful.',
    },
  ];

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      {item.image && <Image source={item.image} style={styles.image} />}
      <View style={styles.detailsContainer}>
        <View style={styles.textGroup}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.thaiName}>{item.thaiName}</Text>
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
            {currency} {(item.priceTHB * exchangeRates[currency]).toFixed(2)}
          </Text>
          {currency !== 'THB' && (
            <Text style={styles.originalPrice}>฿{item.priceTHB}</Text>
          )}
        </View>
      </View>
      {expandedItems[index] && (
        <View style={styles.expandedContent}>
          <Text style={styles.description}>{item.description || "No description available."}</Text>
          <View style={styles.ingredientTags}>
            {item.ingredients && item.ingredients.map((ingredient, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{ingredient}</Text>
              </View>
            ))}
          </View>
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
        {/* Dish list */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3366FF" />
            <Text style={styles.loadingText}>Processing menu...</Text>
          </View>
        ) : (
          <FlatList
            data={translatedDishes}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
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
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f0f5ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 6,
  },
  tagText: {
    color: '#3366ff',
    fontSize: 12,
  }
});

export default ResultsScreen;
