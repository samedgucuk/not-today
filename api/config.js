// Public runtime configuration. These two values are intentionally PUBLIC and not secrets.
// Never add SUPABASE_SECRET_KEY / service_role or other credentials to this endpoint.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).json({
    url: process.env.SUPABASE_URL || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
}
