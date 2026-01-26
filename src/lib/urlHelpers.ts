export const getProductionUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_PUBLIC_URL) {
    return import.meta.env.VITE_PUBLIC_URL;
  }
  
  // Use the production domain
  const productionDomain = "naviqx.lovable.app";
  
  // In development, use current origin
  if (window.location.hostname === "localhost" || window.location.hostname.includes("lovableproject.com")) {
    return `https://${productionDomain}`;
  }
  
  return window.location.origin;
};
