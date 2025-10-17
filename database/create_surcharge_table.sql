-- Create surcharge_settings table for Water Billing System
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.surcharge_settings (
  id serial NOT NULL,
  due_day integer NOT NULL,
  first_surcharge_percent numeric NOT NULL,
  second_surcharge_percent numeric NOT NULL,
  constraint surcharge_settings_pkey primary key (id)
) TABLESPACE pg_default;

-- Insert default surcharge configuration
-- Due day 10 of the month, 10% first surcharge, 15% second surcharge
INSERT INTO public.surcharge_settings (due_day, first_surcharge_percent, second_surcharge_percent) 
VALUES (10, 10.0, 15.0);

-- Grant permissions
GRANT ALL ON public.surcharge_settings TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Enable Row Level Security
ALTER TABLE public.surcharge_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Enable read access for all users" ON public.surcharge_settings
FOR SELECT USING (true);
