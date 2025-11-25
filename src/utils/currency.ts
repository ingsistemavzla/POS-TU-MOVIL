export const formatCurrency = (amount: number, currency: 'USD' | 'VES' = 'USD'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};

export const formatCompactCurrency = (amount: number, currency: 'USD' | 'VES' = 'USD'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  } else {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  }
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-VE').format(number);
};

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('es-VE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};
