import React, { createContext, useState, useContext } from 'react';

// Create context
const AIModelContext = createContext();

// Context provider component
export const AIModelProvider = ({ children }) => {
  // Default to fast model
  const [useAccurateModel, setUseAccurateModel] = useState(false);

  // Toggle function
  const toggleAIModel = () => {
    setUseAccurateModel(prevState => !prevState);
  };

  // Context value
  const contextValue = {
    useAccurateModel,
    toggleAIModel
  };

  return (
    <AIModelContext.Provider value={contextValue}>
      {children}
    </AIModelContext.Provider>
  );
};

// Custom hook for using this context
export const useAIModel = () => {
  const context = useContext(AIModelContext);
  if (context === undefined) {
    throw new Error('useAIModel must be used within an AIModelProvider');
  }
  return context;
}; 