import React, { createContext, useState, useContext } from 'react';

// Create the currency context
const CurrencyContext = createContext();

// Exchange rates for currency conversion
export const exchangeRates = {
  USD: 0.031,
  GBP: 0.023,
  EUR: 0.027,
  JPY: 4.49,
  CNY: 0.22,
  THB: 1,
};

// Currency symbols
export const currencySymbols = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
  THB: '฿',
};

// Provider component that wraps your app and makes currency object available to any
// child component that calls useCurrency().
export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  // The value that will be given to the context
  const currencyValue = {
    currency,
    setCurrency,
    exchangeRates,
    currencySymbols
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