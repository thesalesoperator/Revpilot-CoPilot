-- Add sales practice context fields to profiles table
-- These fields allow users to customize AI personas for their specific product/service

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_company_description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_product_description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_value_proposition text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS practice_target_customers text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.practice_company_description IS 'Description of what the user''s company does';
COMMENT ON COLUMN profiles.practice_product_description IS 'Description of the product/service the user sells';
COMMENT ON COLUMN profiles.practice_value_proposition IS 'Key benefits and value proposition of the product';
COMMENT ON COLUMN profiles.practice_target_customers IS 'Description of ideal customers/target market';
