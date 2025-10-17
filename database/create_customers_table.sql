-- Create customers table for Water Billing System
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE public.customers (
  customerid bigint NOT NULL,
  name text NOT NULL,
  type text NULL,
  barangay text NULL,
  discount numeric NULL,
  date_added date NULL DEFAULT CURRENT_DATE,
  remarks text NULL,
  credit_balance numeric NULL,
  status text NULL DEFAULT 'Active',
  disconnection_date date NULL,
  added_by text NULL,
  disconnected_by text NULL,
  CONSTRAINT customers_pkey PRIMARY KEY (customerid)
) TABLESPACE pg_default;

-- Add some sample data for testing
INSERT INTO public.customers (customerid, name, type, barangay, discount, status, added_by) VALUES
(1001, 'Juan Dela Cruz', 'Residential', 'Poblacion', 0, 'Active', 'Admin User'),
(1002, 'Maria Santos', 'Residential', 'Barangay 1', 5, 'Active', 'Admin User'),
(1003, 'Pedro Tolentino', 'Commercial', 'Poblacion', 0, 'Active', 'Admin User'),
(1004, 'Ana Garcia', 'Residential', 'Barangay 2', 10, 'Disconnected', 'Admin User'),
(1005, 'Roberto Martinez', 'Industrial', 'Barangay 3', 0, 'Active', 'Admin User'),
(1006, 'Carmen Rodriguez', 'Residential', 'Poblacion', 5, 'Active', 'Admin User'),
(1007, 'Miguel Reyes', 'Commercial', 'Barangay 1', 0, 'Active', 'Admin User'),
(1008, 'Sofia Hernandez', 'Residential', 'Barangay 2', 15, 'Active', 'Admin User'),
(1009, 'Carlos Mendoza', 'Government', 'Poblacion', 20, 'Active', 'Admin User'),
(1010, 'Elena Villanueva', 'Residential', 'Barangay 3', 0, 'Disconnected', 'Admin User');

-- Create indexes for better performance
CREATE INDEX idx_customers_name ON public.customers USING btree (name);
CREATE INDEX idx_customers_status ON public.customers USING btree (status);
CREATE INDEX idx_customers_barangay ON public.customers USING btree (barangay);
CREATE INDEX idx_customers_type ON public.customers USING btree (type);
CREATE INDEX idx_customers_date_added ON public.customers USING btree (date_added);

-- Enable Row Level Security (optional, for better security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.customers
FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions to authenticated users
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO anon;
