-- Create tables for Payment Management System
-- Run this SQL in your Supabase SQL Editor

-- 1. Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
  billid bigint PRIMARY KEY,
  customerid bigint NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  reading_date date NOT NULL,
  previous_reading numeric NOT NULL DEFAULT 0,
  current_reading numeric NOT NULL,
  consumption numeric GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  water_charge numeric NOT NULL,
  penalty numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  due_date date NOT NULL,
  status text DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid', 'Overdue')),
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  created_by text,
  CONSTRAINT fk_customer FOREIGN KEY (customerid) REFERENCES customers(customerid) ON DELETE CASCADE
);

-- 2. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  paymentid bigserial PRIMARY KEY,
  reference_number text UNIQUE NOT NULL,
  billid bigint NOT NULL,
  customerid bigint NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  amount_paid numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Check', 'Online', 'GCash', 'PayMaya', 'Bank Transfer')),
  check_number text,
  bank_name text,
  transaction_reference text,
  change_amount numeric DEFAULT 0,
  received_by text NOT NULL,
  receipt_number text UNIQUE,
  payment_type text DEFAULT 'Regular' CHECK (payment_type IN ('Regular', 'Advance', 'Partial', 'Full')),
  status text DEFAULT 'Completed' CHECK (status IN ('Completed', 'Voided', 'Reversed', 'Pending')),
  void_reason text,
  voided_by text,
  voided_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_bill FOREIGN KEY (billid) REFERENCES bills(billid) ON DELETE CASCADE,
  CONSTRAINT fk_payment_customer FOREIGN KEY (customerid) REFERENCES customers(customerid) ON DELETE CASCADE
);

-- 3. Payment Adjustments Table
CREATE TABLE IF NOT EXISTS public.payment_adjustments (
  adjustmentid bigserial PRIMARY KEY,
  paymentid bigint NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('Void', 'Reversal', 'Correction')),
  original_amount numeric NOT NULL,
  adjusted_amount numeric NOT NULL,
  reason text NOT NULL,
  adjusted_by text NOT NULL,
  authorized_by text,
  adjustment_date timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT fk_adjustment_payment FOREIGN KEY (paymentid) REFERENCES payments(paymentid) ON DELETE CASCADE
);

-- 4. Payment Audit Log Table
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  logid bigserial PRIMARY KEY,
  paymentid bigint,
  action text NOT NULL CHECK (action IN ('Create', 'Update', 'Void', 'Reverse', 'View', 'Print')),
  user_name text NOT NULL,
  user_role text,
  action_timestamp timestamp with time zone DEFAULT now(),
  ip_address text,
  details jsonb,
  CONSTRAINT fk_log_payment FOREIGN KEY (paymentid) REFERENCES payments(paymentid) ON DELETE CASCADE
);

-- 5. Penalty Configuration Table
CREATE TABLE IF NOT EXISTS public.penalty_config (
  configid serial PRIMARY KEY,
  penalty_type text NOT NULL CHECK (penalty_type IN ('Fixed', 'Percentage', 'Daily')),
  penalty_rate numeric NOT NULL,
  grace_period_days integer DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_customerid ON public.bills(customerid);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_customerid ON public.payments(customerid);
CREATE INDEX IF NOT EXISTS idx_payments_billid ON public.payments(billid);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference_number);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);

CREATE INDEX IF NOT EXISTS idx_audit_log_payment ON public.payment_audit_log(paymentid);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.payment_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.payment_audit_log(user_name);

-- Enable Row Level Security
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_config ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.bills FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.payments FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.payment_adjustments FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.payment_audit_log FOR ALL USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.penalty_config FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.bills TO authenticated, anon;
GRANT ALL ON public.payments TO authenticated, anon;
GRANT ALL ON public.payment_adjustments TO authenticated, anon;
GRANT ALL ON public.payment_audit_log TO authenticated, anon;
GRANT ALL ON public.penalty_config TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Insert sample penalty configuration
INSERT INTO public.penalty_config (penalty_type, penalty_rate, grace_period_days, description, is_active) VALUES
('Percentage', 5.0, 5, '5% penalty after 5 days grace period', true),
('Fixed', 50.0, 0, 'Fixed ₱50 penalty on overdue bills', false),
('Daily', 2.0, 3, '₱2 per day penalty after 3 days', false);

-- Insert sample bills
INSERT INTO public.bills (billid, customerid, billing_period_start, billing_period_end, reading_date, previous_reading, current_reading, water_charge, penalty, discount, total_amount, due_date, status, created_by) VALUES
(10001, 1001, '2024-09-01', '2024-09-30', '2024-09-30', 1000, 1150, 750.00, 0, 0, 750.00, '2024-10-15', 'Unpaid', 'Admin User'),
(10002, 1002, '2024-09-01', '2024-09-30', '2024-09-30', 800, 920, 600.00, 0, 30.00, 570.00, '2024-10-15', 'Unpaid', 'Admin User'),
(10003, 1003, '2024-09-01', '2024-09-30', '2024-09-30', 2000, 2300, 1500.00, 0, 0, 1500.00, '2024-10-15', 'Unpaid', 'Admin User'),
(10004, 1004, '2024-08-01', '2024-08-31', '2024-08-31', 500, 580, 400.00, 20.00, 40.00, 380.00, '2024-09-15', 'Overdue', 'Admin User'),
(10005, 1005, '2024-09-01', '2024-09-30', '2024-09-30', 3000, 3500, 2500.00, 0, 0, 2500.00, '2024-10-15', 'Unpaid', 'Admin User'),
(10006, 1006, '2024-08-01', '2024-08-31', '2024-08-31', 700, 830, 650.00, 0, 32.50, 617.50, '2024-09-15', 'Paid', 'Admin User'),
(10007, 1007, '2024-09-01', '2024-09-30', '2024-09-30', 1500, 1750, 1250.00, 0, 0, 1250.00, '2024-10-15', 'Partial', 'Admin User'),
(10008, 1008, '2024-09-01', '2024-09-30', '2024-09-30', 600, 735, 675.00, 0, 101.25, 573.75, '2024-10-15', 'Unpaid', 'Admin User');

-- Insert sample payment for paid bill
INSERT INTO public.payments (reference_number, billid, customerid, payment_date, amount_paid, payment_method, received_by, receipt_number, payment_type, status) VALUES
('PAY-2024-0001', 10006, 1006, '2024-09-10 10:30:00', 617.50, 'Cash', 'Admin User', 'RCP-0001', 'Full', 'Completed'),
('PAY-2024-0002', 10007, 1007, '2024-09-12 14:15:00', 500.00, 'GCash', 'Admin User', 'RCP-0002', 'Partial', 'Completed');

-- Update amount_paid for bills with payments
UPDATE public.bills SET amount_paid = 617.50 WHERE billid = 10006;
UPDATE public.bills SET amount_paid = 500.00 WHERE billid = 10007;

-- Function to generate reference number
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS text AS $$
DECLARE
  next_num integer;
  ref_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 'PAY-[0-9]{4}-([0-9]{4})') AS integer)), 0) + 1
  INTO next_num
  FROM payments
  WHERE reference_number LIKE 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
  
  ref_number := 'PAY-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
  RETURN ref_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate penalty
CREATE OR REPLACE FUNCTION calculate_penalty(bill_id bigint)
RETURNS numeric AS $$
DECLARE
  bill_due_date date;
  bill_total numeric;
  days_overdue integer;
  penalty_amount numeric := 0;
  penalty_rate numeric;
  grace_days integer;
BEGIN
  SELECT due_date, total_amount INTO bill_due_date, bill_total
  FROM bills WHERE billid = bill_id;
  
  SELECT penalty_rate, grace_period_days INTO penalty_rate, grace_days
  FROM penalty_config WHERE is_active = true LIMIT 1;
  
  days_overdue := CURRENT_DATE - bill_due_date - grace_days;
  
  IF days_overdue > 0 THEN
    penalty_amount := (bill_total * penalty_rate / 100);
  END IF;
  
  RETURN GREATEST(penalty_amount, 0);
END;
$$ LANGUAGE plpgsql;
