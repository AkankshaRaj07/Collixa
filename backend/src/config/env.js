import dotenv from 'dotenv';
dotenv.config();

// Helper to clean environment variables (removes whitespace and accidental quotes)
const cleanEnv = (val) => {
  if (!val) return val;
  return val.trim().replace(/^["']|["']$/g, '');
};

export const config = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: cleanEnv(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: cleanEnv(process.env.SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),

  // JWT
  JWT_SECRET: cleanEnv(process.env.JWT_SECRET) || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // Email Configuration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'gmail',
  EMAIL_USER: cleanEnv(process.env.EMAIL_USER),
  EMAIL_PASSWORD: cleanEnv(process.env.EMAIL_PASSWORD),
  EMAIL_FROM: cleanEnv(process.env.EMAIL_FROM),
  
  // SMTP Configuration
  SMTP_HOST: cleanEnv(process.env.SMTP_HOST),
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: cleanEnv(process.env.SMTP_USER),
  SMTP_PASSWORD: cleanEnv(process.env.SMTP_PASSWORD),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',

  // SendGrid Configuration
  SENDGRID_API_KEY: cleanEnv(process.env.SENDGRID_API_KEY),


  // CORS
  FRONTEND_URL: cleanEnv(process.env.FRONTEND_URL) || 'http://localhost:3001',

  // Stripe
  STRIPE_SECRET_KEY: cleanEnv(process.env.STRIPE_SECRET_KEY),
  STRIPE_PUBLISHABLE_KEY: cleanEnv(process.env.STRIPE_PUBLISHABLE_KEY),
  STRIPE_WEBHOOK_SECRET: cleanEnv(process.env.STRIPE_WEBHOOK_SECRET),

  // Google Gemini AI
  GEMINI_API_KEY: cleanEnv(process.env.GEMINI_API_KEY),
};

// Validate required env vars
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
requiredEnvVars.forEach((envVar) => {
  if (!config[envVar]) {
    console.warn(`⚠️  Missing environment variable: ${envVar}`);
  }
});

export default config;
