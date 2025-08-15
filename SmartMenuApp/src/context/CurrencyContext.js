// src/context/CurrencyContext.js
import React, { createContext, useState, useContext, useMemo } from 'react';

const CurrencyContext = createContext();

export const exchangeRates = {
  USD: 0.03083,
  GBP: 0.02297,
  EUR: 0.02645,
  JPY: 4.53,
  CNY: 0.22210,
  THB: 1
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  const value = useMemo(() => {
    const convertFromTHB = (thb) => {
      const rate = exchangeRates[currency] ?? 1;
      const val = thb * rate;

      // Keep whole yen
      return currency === 'JPY' ? Math.round(val) : Number(val.toFixed(2));
    };

    const formatPrice = (amount) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: currency === 'JPY' ? 0 : 2,
          minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(amount);
      } catch {
        const dp = currency === 'JPY' ? 0 : 2;
        return `${currency} ${amount.toFixed(dp)}`;
      }
    };

    const displayFromTHB = (thb) => formatPrice(convertFromTHB(thb));

    return {
      currency,
      setCurrency,
      exchangeRates,
      convertFromTHB,
      formatPrice,
      displayFromTHB,
    };
  }, [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
