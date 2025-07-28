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

const ResultsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { currency, exchangeRates } = useCurrency();
  const [loading, setLoading] = useState(false);
  const photoUri = route?.params?.photoUri;

  // This would be where we'd process the image with Google Cloud Vision API
  useEffect(() => {
    if (photoUri) {
      setLoading(true);
      // Simulate API call delay
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [photoUri]);

  const translatedDishes = route?.params?.translatedDishes || [
    {
      name: 'Pad Thai',
      thaiName: 'ผัดไทย',
      priceTHB: 120,
      image: require('../../assets/padthai.jpg'),
    },
    {
      name: 'Tom Yum Soup',
      thaiName: 'ต้มยำกุ้ง',
      priceTHB: 150,
      image: require('../../assets/tomyum.jpg'),
    },
    {
      name: 'Green Curry',
      thaiName: 'แกงเขียวหวาน',
      priceTHB: 130,
      image: require('../../assets/greencurry.jpg'),
    },
    {
      name: 'Mango Sticky Rice',
      thaiName: 'ข้าวเหนียวมะม่วง',
      priceTHB: 100,
      image: require('../../assets/mangorice.jpg'),
    },
    {
      name: 'Som Tum (Papaya Salad)',
      thaiName: 'ส้มตำ',
      priceTHB: 90,
      image: require('../../assets/somtum.jpg'),
    },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.image && <Image source={item.image} style={styles.image} />}
      <View style={styles.detailsContainer}>
        <View style={styles.textGroup}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.thaiName}>{item.thaiName}</Text>
          <TouchableOpacity style={styles.moreInfoRow}>
            <Text style={styles.moreInfo}>More info</Text>
            <Ionicons
              name="chevron-down"
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
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header Component */}
      <Header leftIconType="back" />

      <SafeAreaView style={styles.safeArea}>
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
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  safeArea: {
    flex: 1,
  },
  list: {
    padding: 16,
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
  }
});

export default ResultsScreen;
