import React, { createContext, useState, useContext } from 'react';

// Create context
const BoundingBoxContext = createContext();

// Context provider component
export const BoundingBoxProvider = ({ children }) => {
  // Default to disabled
  const [boundingBoxEnabled, setBoundingBoxEnabled] = useState(false);

  // Toggle function
  const toggleBoundingBox = () => {
    setBoundingBoxEnabled(prevState => !prevState);
  };

  // Context value
  const contextValue = {
    boundingBoxEnabled,
    toggleBoundingBox
  };

  return (
    <BoundingBoxContext.Provider value={contextValue}>
      {children}
    </BoundingBoxContext.Provider>
  );
};

// Custom hook for using this context
export const useBoundingBox = () => {
  const context = useContext(BoundingBoxContext);
  if (context === undefined) {
    throw new Error('useBoundingBox must be used within a BoundingBoxProvider');
  }
  return context;
}; 