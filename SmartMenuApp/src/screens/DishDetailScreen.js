// src/screens/DishDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useCurrency } from '../context/CurrencyContext';

export default function DishDetailScreen({ route, navigation }) {
  const { dish } = route.params || {};
  const { currency, convertFromTHB, formatPrice } = useCurrency();
  if (!dish) return null;

  const converted = convertFromTHB(dish.priceTHB);
  const formatted = formatPrice(converted);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Header leftIconType="back" title="SmartMenu" onBack={() => navigation?.goBack?.()} />

      <SafeAreaView style={styles.safeArea} edges={['left','right','bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {!!dish.image && <Image source={dish.image} style={styles.image} />}

          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{dish.name}</Text>
              {!!dish.thaiName && <Text style={styles.thaiName}>{dish.thaiName}</Text>}
            </View>

            <View style={styles.priceRight}>
              <Text style={styles.converted}>{formatted}</Text>
              {currency !== 'THB' && <Text style={styles.original}>฿{dish.priceTHB}</Text>}
            </View>
          </View>

          {!!dish.description && <Text style={styles.description}>{dish.description}</Text>}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  safeArea: { flex: 1 },
  content: { padding: 16, paddingTop: 0 },
  image: { width: '100%', height: 260, borderRadius: 12, resizeMode: 'cover', marginTop: 10 },
  topRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 2, paddingRight: 12 },
  thaiName: { fontSize: 16, color: '#666' },
  priceRight: { alignItems: 'flex-end', minWidth: 110 },
  converted: { fontWeight: '800', fontSize: 18, color: '#22aa44' },
  original: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  description: { fontSize: 15, color: '#444', marginTop: 12, lineHeight: 22 },
});
