import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCurrency, exchangeRates } from '../context/CurrencyContext';

const Header = ({ leftIconType = 'menu' }) => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const { currency, setCurrency } = useCurrency();

  const handleLeftIconPress = () => {
    if (leftIconType === 'back') {
      navigation.goBack();
    }
    // Menu icon doesn't have any action for now
  };

  const handleCurrencyPress = () => {
    setModalVisible(true);
  };

  const handleCurrencySelect = (selectedCurrency) => {
    setModalVisible(false);
    setCurrency(selectedCurrency);
  };

  return (
    <>
      {/* Black bar for status bar space */}
      <View style={styles.statusBarBackground} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.leftButton} onPress={handleLeftIconPress}>
          <Ionicons 
            name={leftIconType === 'back' ? 'arrow-back' : 'menu'} 
            size={28} 
            color="white" 
          />
        </TouchableOpacity>
        <Text style={styles.title}>SmartMenu</Text>
        <TouchableOpacity style={styles.currencyButton} onPress={handleCurrencyPress}>
          <Ionicons name="globe-outline" size={24} color="white" />
          <Text style={styles.currencyText}>{currency}</Text>
        </TouchableOpacity>
      </View>

      {/* Currency selector modal */}
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
            <FlatList
              data={Object.keys(exchangeRates)}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleCurrencySelect(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  statusBarBackground: {
    backgroundColor: 'black',
    height: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    width: '100%',
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: '#3366FF',
    zIndex: 10,
  },
  leftButton: {
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
});

export default Header; 