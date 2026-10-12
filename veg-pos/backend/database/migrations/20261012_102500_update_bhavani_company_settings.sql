-- Migration: Update Sri Bhavani Company & Invoice Settings
-- Configures authentic trade profile, phone numbers, shop numbers, gods and default A5 format

INSERT INTO settings (`key`, `value`) VALUES
('company_name_ta', 'ஸ்ரீ பவானி காய்கனி கமிஷன் வியாபாரம்'),
('company_name_en', 'Sri Bhavani Vegetables & Fruits Commission Agent'),
('company_tagline', 'காய்கனி கமிஷன் வியாபாரம்'),
('proprietor_name', 'பவானி சங்கர்'),
('shop_number', '14'),
('shop_number_2', '15'),
('address_line1', 'தினசரி மார்க்கெட்'),
('address_line2', 'சுரண்டை.'),
('phone_numbers', '["9659580845", "9488103983", "9789767576"]'),
('god_name_1', 'ஸ்ரீ பவானி அம்மன் துணை'),
('god_name_2', 'ஸ்ரீ பொட்டல் மாடசாமி'),
('logo_brand', 'VTC'),
('default_print_format', 'a5'),
('footer_note', 'நன்றி! மீண்டும் வருக! • Thank You! Visit Again!')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
