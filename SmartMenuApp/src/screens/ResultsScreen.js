import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList as RNFlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const exchangeRates = {
  USD: 0.0282,
  GBP: 0.022,
  EUR: 0.0257,
  JPY: 4.47,
  CNY: 0.204,
  THB: 1,
};

const ResultsScreen = ({ route }) => {
  const navigation = useNavigation();

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

  const [currency, setCurrency] = useState('USD');
  const [modalVisible, setModalVisible] = useState(false);

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
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>SmartMenu</Text>
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="globe-outline" size={24} color="white" />
            <Text style={styles.currencyText}>{currency}</Text>
          </TouchableOpacity>
        </View>

        {/* Currency selector */}
        <Modal
          transparent
          animationType="fade"
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <RNFlatList
                data={Object.keys(exchangeRates)}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      setCurrency(item);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Dish list */}
        {translatedDishes.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3366FF" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: '#3366FF',
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currencyText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: 200,
  },
  option: {
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    color: '#3366FF',
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
  },
});

export default ResultsScreen;
