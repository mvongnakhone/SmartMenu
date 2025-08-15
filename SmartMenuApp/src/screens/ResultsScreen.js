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
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useCurrency } from '../context/CurrencyContext';

const ResultsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { currency, exchangeRates } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const photoUri = route?.params?.photoUri;


  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);


  useEffect(() => {
    if (photoUri) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [photoUri]);

  const toggleExpand = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const dishes = route?.params?.dishes || [
    {
      name: 'Pad Thai',
      thaiName: 'ผัดไทย',
      priceTHB: 120,
      image: require('../../assets/padthai.jpg'),
      description:
        'Stir-fried rice noodles with shrimp or chicken, tofu, bean sprouts, and crushed peanuts in a tangy tamarind sauce.',
    },
    {
      name: 'Tom Yum Soup',
      thaiName: 'ต้มยำกุ้ง',
      priceTHB: 150,
      image: require('../../assets/tomyum.jpg'),
      description:
        'Hot and sour broth scented with lemongrass, kaffir lime leaf, and galangal. Typically finished with shrimp and chilies.',
    },
    {
      name: 'Green Curry',
      thaiName: 'แกงเขียวหวาน',
      priceTHB: 130,
      image: require('../../assets/greencurry.jpg'),
      description:
        'Creamy coconut curry with green chili paste, Thai eggplant, bamboo shoots, and basil. Comforting, slightly sweet, and aromatic.',
    },
    {
      name: 'Mango Sticky Rice',
      thaiName: 'ข้าวเหนียวมะม่วง',
      priceTHB: 100,
      image: require('../../assets/mangorice.jpg'),
      description:
        'Sweet sticky rice in coconut milk served with ripe mango. A classic Thai dessert.',
    },
    {
      name: 'Som Tum (Papaya Salad)',
      thaiName: 'ส้มตำ',
      priceTHB: 90,
      image: require('../../assets/somtum.jpg'),
      description:
        'Shredded green papaya tossed with tomatoes, long beans, peanuts, and chilies in a punchy lime sauce dressing.',
    },
  ];

  const renderItem = ({ item, index }) => {
    const isExpanded = !!expandedItems[index];
    const rate = exchangeRates?.[currency] ?? 1;
    const convertedPrice = (item.priceTHB * rate).toFixed(2);

    return (
      // Entire card navigates to the detail screen
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('DishDetail', {
            dish: item,
            currency,
            convertedPrice,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${item.name}`}
      >
        {item.image && <Image source={item.image} style={styles.image} />}

        <View style={styles.detailsContainer}>
          <View style={styles.textGroup}>
            <Text style={styles.dishName}>{item.name}</Text>
            <Text style={styles.thaiName}>{item.thaiName}</Text>

            {isExpanded && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            {/* Keep "More info" to expand/collapse in place */}
            <TouchableOpacity
              style={styles.moreInfoRow}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.moreInfo}>
                {isExpanded ? 'Show less' : 'More info'}
              </Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#3366ff"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.priceGroup}>
            <Text style={styles.convertedPrice}>
              {currency} {convertedPrice}
            </Text>
            {currency !== 'THB' && (
              <Text style={styles.originalPrice}>฿{item.priceTHB}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Header leftIconType="back" />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3366FF" />
            <Text style={styles.loadingText}>Processing menu...</Text>
          </View>
        ) : (
          <FlatList
            data={dishes}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  safeArea: { flex: 1, paddingTop: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 },

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

  image: { width: '100%', height: 180, borderRadius: 8, resizeMode: 'cover' },

  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  textGroup: { flex: 1, paddingRight: 8 },

  dishName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  thaiName: { fontSize: 14, color: '#666', marginTop: 4 },

  description: { fontSize: 13, color: '#444', marginTop: 8, lineHeight: 18 },

  moreInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  moreInfo: { color: '#3366ff', fontSize: 14 },

  priceGroup: { alignItems: 'flex-end', justifyContent: 'center' },
  convertedPrice: { fontWeight: 'bold', fontSize: 16, color: '#22aa44' },
  originalPrice: { fontSize: 12, color: '#666', marginTop: 4 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
});

export default ResultsScreen;
