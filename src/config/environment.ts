// Environment configuration for different deployment environments
export const getAuthRedirectUrl = (): string => {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    // Production: Use the domain without port
    return 'http://tumovilmargarita.com/auth/callback';
  } else {
    // Development: Use localhost with dynamic port
    return `${window.location.origin}/auth/callback`;
  }
};

export const getBaseUrl = (): string => {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    return 'http://tumovilmargarita.com';
  } else {
    return window.location.origin;
  }
};
