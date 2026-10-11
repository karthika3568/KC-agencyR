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
('தக்காளி', 'Tomato', 'TOM', 'kg', 20.00, 0, 1),
('வெண்டைக்காய்', 'Ladies Finger', 'VEN', 'kg', 30.00, 0, 1),
('மிளகாய்', 'Chilli', 'MIL', 'kg', 40.00, 0, 1),
('பச்சை மிளகாய்', 'Green Chilli', 'GCH', 'kg', 35.00, 0, 1),
('கருவேப்பிலை', 'Curry Leaves', 'KAR', 'kg', 60.00, 0, 1),
('மாங்காய்', 'Raw Mango', 'MAN', 'kg', 25.00, 0, 1),
('வரி கத்தரி', 'Striped Brinjal', 'VKA', 'kg', 25.00, 0, 1),
('கத்தரிக்காய்', 'Brinjal', 'BRI', 'kg', 25.00, 0, 1),
('வெங்காயம்', 'Onion', 'ONI', 'kg', 28.00, 0, 1),
('கொத்து வெங்காயம்', 'Spring Onion', 'SPO', 'kg', 30.00, 0, 1),
('உருளைக்கிழங்கு', 'Potato', 'POT', 'kg', 22.00, 0, 1),
('கேரட்', 'Carrot', 'CAR', 'kg', 35.00, 0, 1),
('பீன்ஸ்', 'Beans', 'BEA', 'kg', 40.00, 0, 1),
('முருங்கைக்காய்', 'Drumstick', 'MUR', 'kg', 45.00, 0, 1),
('முருங்கை இலை', 'Drumstick Leaves', 'MUL', 'kg', 20.00, 0, 1),
('அவரைக்காய்', 'Avarai Beans', 'AVA', 'kg', 32.00, 0, 1),
('பாகற்காய்', 'Bitter Gourd', 'BIT', 'kg', 30.00, 0, 1),
('புடலங்காய்', 'Ridge Gourd', 'SNA', 'kg', 25.00, 0, 1),
('பீர்க்கங்காய்', 'Snake Gourd', 'RID', 'kg', 25.00, 0, 1),
('சுரைக்காய்', 'Bottle Gourd', 'BOT', 'kg', 20.00, 0, 1),
('பூசணிக்காய்', 'Pumpkin', 'PUM', 'kg', 18.00, 0, 1),
('வெள்ளைப்பூசணி', 'Ash Gourd', 'ASH', 'kg', 18.00, 0, 1),
('வெள்ளரிக்காய்', 'Cucumber', 'CUC', 'kg', 20.00, 0, 1),
('கோவைக்காய்', 'Ivy Gourd', 'COW', 'kg', 30.00, 0, 1),
('கொத்தவரங்காய்', 'Cluster Beans', 'CLU', 'kg', 35.00, 0, 1),
('முள்ளங்கி', 'Radish', 'RAD', 'kg', 20.00, 0, 1),
('பீட்ரூட்', 'Beetroot', 'BEE', 'kg', 30.00, 0, 1),
('காலிஃபிளவர்', 'Cauliflower', 'CAU', 'kg', 35.00, 0, 1),
('முட்டைக்கோஸ்', 'Cabbage', 'CAB', 'kg', 20.00, 0, 1),
('கொத்தமல்லி', 'Coriander Leaves', 'COR', 'kg', 50.00, 0, 1),
('புதினா', 'Mint Leaves', 'MIN', 'kg', 40.00, 0, 1),
('கீரை', 'Greens', 'KEE', 'kg', 20.00, 0, 1),
('இஞ்சி', 'Ginger', 'GIN', 'kg', 80.00, 0, 1),
('பூண்டு', 'Garlic', 'GAR', 'kg', 90.00, 0, 1),
('வாழைக்காய்', 'Raw Banana', 'BAN', 'kg', 25.00, 0, 1),
('வாழைப்பூ', 'Banana Flower', 'BPO', 'kg', 30.00, 0, 1),
('சேப்பங்கிழங்கு', 'Colocasia', 'COL', 'kg', 35.00, 0, 1),
('மரவள்ளிக்கிழங்கு', 'Tapioca', 'TAP', 'kg', 20.00, 0, 1),
('கருணைக்கிழங்கு', 'Elephant Yam', 'YAM', 'kg', 40.00, 0, 1),
('மஞ்சள் கிழங்கு', 'Raw Turmeric', 'TUR', 'kg', 60.00, 0, 1),
('சோளம்', 'Sweet Corn', 'CRN', 'kg', 25.00, 0, 1),
('பட்டாணி', 'Green Peas', 'PEA', 'kg', 60.00, 0, 1),
('லாரி வாடகை', 'Lorry Freight', 'LOR', 'trip', NULL, 1, 1),
('கூலி', 'Cooli', 'COO', 'nos', NULL, 1, 1);

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
