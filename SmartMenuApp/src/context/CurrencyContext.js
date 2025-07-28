import React, { createContext, useState, useContext } from 'react';

// Create the currency context
const CurrencyContext = createContext();

// Exchange rates for currency conversion
export const exchangeRates = {
  USD: 0.0282,
  GBP: 0.022,
  EUR: 0.0257,
  JPY: 4.47,
  CNY: 0.204,
  THB: 1,
};

// Provider component that wraps your app and makes currency object available to any
// child component that calls useCurrency().
export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  // The value that will be given to the context
  const currencyValue = {
    currency,
    setCurrency,
    exchangeRates
  };

  return (
    <CurrencyContext.Provider value={currencyValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook that shorthands the context
export const useCurrency = () => {
  return useContext(CurrencyContext);
}; 