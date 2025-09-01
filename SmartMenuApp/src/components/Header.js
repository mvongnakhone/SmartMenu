import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCurrency, exchangeRates } from '../context/CurrencyContext';
import BoundingBoxToggle from './BoundingBoxToggle';

const Header = ({ leftIconType = 'menu', title = 'SmartMenu' }) => {
  const navigation = useNavigation();
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const { currency, setCurrency } = useCurrency();

  const handleLeftIconPress = () => {
    if (leftIconType === 'back') {
      navigation.goBack();
    } else {
      // Show menu when hamburger icon is pressed
      setMenuModalVisible(true);
    }
  };

  const handleCurrencyPress = () => {
    setCurrencyModalVisible(true);
  };

  const handleCurrencySelect = (selectedCurrency) => {
    setCurrencyModalVisible(false);
    setCurrency(selectedCurrency);
  };

  const handleMenuItemPress = (screenName) => {
    setMenuModalVisible(false);
    navigation.navigate(screenName);
  };

  const menuItems = [
    {
      id: 'vision_test',
      title: 'Vision API Test',
      icon: 'eye-outline',
      screen: 'VisionTest'
    },
    // Add more menu items here as needed
  ];

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
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.currencyButton} onPress={handleCurrencyPress}>
          <Ionicons name="globe-outline" size={24} color="white" />
          <Text style={styles.currencyText}>{currency}</Text>
        </TouchableOpacity>
      </View>

      {/* Menu modal */}
      <Modal
        transparent
        animationType="fade"
        visible={menuModalVisible}
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContainer}>
            {/* First menu item */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('VisionTest')}
            >
              <Ionicons name="eye-outline" size={24} color="#3366FF" style={styles.menuIcon} />
              <Text style={styles.menuText}>Vision API Test</Text>
            </TouchableOpacity>
            
            {/* Bounding Box Toggle - styled to match menu items */}
            <BoundingBoxToggle inMenu={true} />
            
            {/* Other menu items */}
            <FlatList
              data={menuItems.slice(1)} // Skip first item as we manually added it
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item.screen)}
                >
                  <Ionicons name={item.icon} size={24} color="#3366FF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Currency selector modal */}
      <Modal
        transparent
        animationType="fade"
        visible={currencyModalVisible}
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.currencyModalOverlay}
          onPress={() => setCurrencyModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.currencyModalContainer}>
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  currencyModalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: 280,
    marginTop: 100,
    marginLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currencyModalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 14.5,
    color: '#333',
  },
  boundingBoxToggleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  option: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#3366FF',
  },
});

export default Header; 