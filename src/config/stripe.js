import Stripe from 'stripe';
import env from './env.js';

let client = null;

// Returns a Stripe client, or null when no STRIPE_SECRET_KEY is configured.
export const getStripe = () => {
  if (!env.stripeSecretKey) return null;
  if (!client) client = new Stripe(env.stripeSecretKey);
  return client;
};
