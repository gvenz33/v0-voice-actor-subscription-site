-- Payment instructions for invoice emails (Zelle, Venmo, PayPal, check/wire)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_zelle text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_venmo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_paypal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_other text;

COMMENT ON COLUMN public.profiles.payment_zelle IS 'Zelle email or mobile number shown on invoices';
COMMENT ON COLUMN public.profiles.payment_venmo IS 'Venmo @username shown on invoices';
COMMENT ON COLUMN public.profiles.payment_paypal IS 'PayPal.me link or email for invoice payments';
COMMENT ON COLUMN public.profiles.payment_other IS 'Check, wire, or other payment instructions for clients';
