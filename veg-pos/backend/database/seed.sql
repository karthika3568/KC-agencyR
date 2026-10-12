SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------
INSERT INTO users (name, username, password_hash, role, active) VALUES
('Admin', 'admin', '$2y$10$6x4ggV7/XCtwaax5qeD0je7A1S.TLoSNmGzFQFbGujdJwCPMzt1U6', 'admin', 1);
-- Seeded password: Admin@123 — rotate before real use.

-- ---------------------------------------------------------------
-- Payment methods
-- ---------------------------------------------------------------
INSERT INTO payment_methods (name_ta, name_en, is_default, active, sort_order) VALUES
('கடன்', 'Credit', 1, 1, 1),
('பணம்', 'Cash', 0, 1, 2),
('UPI', 'UPI', 0, 1, 3),
('நெட் பேங்கிங்', 'Net Banking', 0, 1, 4);

-- ---------------------------------------------------------------
-- Bill number sequences
-- ---------------------------------------------------------------
INSERT INTO bill_sequences (series_key, prefix, next_number) VALUES
('LOCAL-NORMAL', 'L-', 1),
('DISTANT-NORMAL', 'D-', 1),
('LOCAL-COMMISSION', 'LC-', 1),
('DISTANT-COMMISSION', 'DC-', 1),
('QUICK', 'QS-', 1);

-- ---------------------------------------------------------------
-- Items — 40+ common vegetables (Tamil Nadu wholesale market) + 2 charge items
-- ---------------------------------------------------------------
INSERT INTO items (name_ta, name_en, code, unit, default_rate, is_charge_item, active) VALUES
('தக்காளி', 'Tomato', 'A', 'kg', 20.00, 0, 1),
('வெண்டைக்காய்', 'Ladies Finger', 'B', 'kg', 30.00, 0, 1),
('மிளகாய்', 'Chilli', 'C', 'kg', 40.00, 0, 1),
('பச்சை மிளகாய்', 'Green Chilli', 'D', 'kg', 35.00, 0, 1),
('கருவேப்பிலை', 'Curry Leaves', 'E', 'kg', 60.00, 0, 1),
('மாங்காய்', 'Raw Mango', 'F', 'kg', 25.00, 0, 1),
('வரி கத்தரி', 'Striped Brinjal', 'G', 'kg', 25.00, 0, 1),
('கத்தரிக்காய்', 'Brinjal', 'H', 'kg', 25.00, 0, 1),
('வெங்காயம்', 'Onion', 'I', 'kg', 28.00, 0, 1),
('கொத்து வெங்காயம்', 'Spring Onion', 'J', 'kg', 30.00, 0, 1),
('உருளைக்கிழங்கு', 'Potato', 'K', 'kg', 22.00, 0, 1),
('கேரட்', 'Carrot', 'L', 'kg', 35.00, 0, 1),
('பீன்ஸ்', 'Beans', 'M', 'kg', 40.00, 0, 1),
('முருங்கைக்காய்', 'Drumstick', 'N', 'kg', 45.00, 0, 1),
('முருங்கை இலை', 'Drumstick Leaves', 'O', 'kg', 20.00, 0, 1),
('அவரைக்காய்', 'Avarai Beans', 'P', 'kg', 32.00, 0, 1),
('பாகற்காய்', 'Bitter Gourd', 'Q', 'kg', 30.00, 0, 1),
('புடலங்காய்', 'Ridge Gourd', 'R', 'kg', 25.00, 0, 1),
('பீர்க்கங்காய்', 'Snake Gourd', 'S', 'kg', 25.00, 0, 1),
('சுரைக்காய்', 'Bottle Gourd', 'T', 'kg', 20.00, 0, 1),
('பூசணிக்காய்', 'Pumpkin', 'U', 'kg', 18.00, 0, 1),
('வெள்ளைப்பூசணி', 'Ash Gourd', 'V', 'kg', 18.00, 0, 1),
('வெள்ளரிக்காய்', 'Cucumber', 'W', 'kg', 20.00, 0, 1),
('கோவைக்காய்', 'Ivy Gourd', 'X', 'kg', 30.00, 0, 1),
('கொத்தவரங்காய்', 'Cluster Beans', 'Y', 'kg', 35.00, 0, 1),
('முள்ளங்கி', 'Radish', 'Z', 'kg', 20.00, 0, 1),
('பீட்ரூட்', 'Beetroot', 'AA', 'kg', 30.00, 0, 1),
('காலிஃபிளவர்', 'Cauliflower', 'AB', 'kg', 35.00, 0, 1),
('முட்டைக்கோஸ்', 'Cabbage', 'AC', 'kg', 20.00, 0, 1),
('கொத்தமல்லி', 'Coriander Leaves', 'AD', 'kg', 50.00, 0, 1),
('புதினா', 'Mint Leaves', 'AE', 'kg', 40.00, 0, 1),
('கீரை', 'Greens', 'AF', 'kg', 20.00, 0, 1),
('இஞ்சி', 'Ginger', 'AG', 'kg', 80.00, 0, 1),
('பூண்டு', 'Garlic', 'AH', 'kg', 90.00, 0, 1),
('வாழைக்காய்', 'Raw Banana', 'AI', 'kg', 25.00, 0, 1),
('வாழைப்பூ', 'Banana Flower', 'AJ', 'kg', 30.00, 0, 1),
('சேப்பங்கிழங்கு', 'Colocasia', 'AK', 'kg', 35.00, 0, 1),
('மரவள்ளிக்கிழங்கு', 'Tapioca', 'AL', 'kg', 20.00, 0, 1),
('கருணைக்கிழங்கு', 'Elephant Yam', 'AM', 'kg', 40.00, 0, 1),
('மஞ்சள் கிழங்கு', 'Raw Turmeric', 'AN', 'kg', 60.00, 0, 1),
('சோளம்', 'Sweet Corn', 'AO', 'kg', 25.00, 0, 1),
('பட்டாணி', 'Green Peas', 'AP', 'kg', 60.00, 0, 1),
('லாரி வாடகை', 'Lorry Freight', 'AQ', 'trip', NULL, 1, 1),
('கூலி', 'Cooli', 'AR', 'nos', NULL, 1, 1);

-- ---------------------------------------------------------------
-- Settings — business defaults + company profile placeholders
-- ---------------------------------------------------------------
INSERT INTO settings (`key`, `value`) VALUES
('company_name_ta', 'ஸ்ரீ கோயில் காய்கறி கமிஷன் ஏஜென்சி'),
('company_name_en', 'Sri Koil Vegetable Commission Agency'),
('company_tagline', 'ஸ்ரீ துணை'),
('proprietor_name', ''),
('shop_number', ''),
('address_line1', ''),
('address_line2', ''),
('phone_numbers', '[]'),
('email', ''),
('gstin', ''),
('gstin_visible', 'false'),
('footer_note', 'நல்வரவு — மீண்டும் வாங்க வருக'),
('logo_url', ''),
('show_logo', 'true'),
('ui_language', 'ta'),
('invoice_language', 'ta'),
('default_print_format', 'a4'),
('default_commission_percent', '10'),
('default_distant_cooli', '0'),
('default_distant_vadagai', '0'),
('default_payment_method_id', '1'),
('default_unit', 'kg'),
('rounding_rule', 'none'),
('show_previous_balance', 'true');
