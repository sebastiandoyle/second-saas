import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe('sk_test_51Q8VR9B49TXFmVNavDdqmuaBSIlHVcFQl4ShgtejeQ6OeN7PHkCvOFcHxVq1Jxl1kIGbjWLtQf4QIeeuRN8EG179006SnJtQ0W');
const supabase = createClient(
  'https://curiwktmwrrchlaadxza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cml3a3Rtd3JyY2hsYWFkeHphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTk3NTY2MiwiZXhwIjoyMDQ1NTUxNjYyfQ.RNgdwoYj0EV2lv7nTCI6C_LuMJIn15AznLrdHJYLurE'
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      'whsec_X8q7NBepvkzS9i4XT9WkMSmiUYp2SsWk'
    );
  } catch (error) {
    console.error('Error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Update subscription in Supabase
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: session.client_reference_id,
        stripe_subscription_id: session.subscription,
        status: 'active',
        price_id: 'price_1QEHePB49TXFmVNadT3YmfwZ',
      });

    if (error) {
      console.error('Error updating subscription:', error);
      return res.status(400).json({ error: 'Error updating subscription' });
    }
  }

  res.json({ received: true });
}