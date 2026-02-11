interface Config {
  API_URL: string;
  SHOPIFY_REDIRECT_URL: string;
}

const config: Config = {
  API_URL: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
  SHOPIFY_REDIRECT_URL: import.meta.env.VITE_SHOPIFY_REDIRECT_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
};

export default config;
