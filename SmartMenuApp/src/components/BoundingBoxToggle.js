import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useBoundingBox } from '../context/BoundingBoxContext';
import { Ionicons } from '@expo/vector-icons';

const BoundingBoxToggle = ({ inMenu = false }) => {
  const { boundingBoxEnabled, toggleBoundingBox } = useBoundingBox();
  
  // Use different styles based on where the toggle is displayed
  const containerStyle = inMenu ? styles.menuContainer : styles.container;
  const labelStyle = inMenu ? styles.menuLabel : styles.label;
  const statusStyle = inMenu ? styles.menuStatus : styles.status;
  
  return (
    <View style={containerStyle}>
      <View style={styles.labelContainer}>
        {inMenu && <Ionicons name="grid-outline" size={24} color="#3366FF" style={styles.menuIcon} />}
        <Text style={labelStyle}>Bounding Box:</Text>
      </View>
      <View style={styles.rightContainer}>
        <Switch
          trackColor={{ false: "#767577", true: "#4caf50" }}
          thumbColor={boundingBoxEnabled ? "#8bc34a" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleBoundingBox}
          value={boundingBoxEnabled}
          style={styles.switch}
        />
        <Text style={statusStyle}>{boundingBoxEnabled ? 'ON' : 'OFF'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 5,
    width: '100%',
  },
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '60%', // Limit label width to leave space for the toggle
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 85, // Increased width to prevent overlap
    justifyContent: 'flex-end',
    marginLeft: 10, // Add margin to separate from label
  },
  label: {
    fontSize: 16,
    marginRight: 10,
    fontWeight: '500',
  },
  menuLabel: {
    fontSize: 14.5,
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginLeft: 5,
    fontWeight: 'bold',
    color: '#555'
  },
  menuStatus: {
    fontSize: 14.5,
    marginLeft: 5,
    color: '#555',
    width: 30, // Fixed width for ON/OFF text
  },
  menuIcon: {
    marginRight: 15,
  },
  switch: {
    transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], // Make switch slightly smaller
  }
});

export default BoundingBoxToggle; 