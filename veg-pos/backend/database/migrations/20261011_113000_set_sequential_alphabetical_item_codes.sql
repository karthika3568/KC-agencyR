-- Migration: Set sequential alphabetical shortcut codes (A-Z, AA-ZZ)
-- Ordered: standard vegetable items first (A..AP), followed by charge items (AQ..AR)
-- Temporary prefix used to safely avoid UNIQUE constraint collision during sequential update.

UPDATE items SET code = CONCAT('_TMP_', id);

UPDATE items SET code = 'A' WHERE id = 1; -- தக்காளி / Tomato
UPDATE items SET code = 'B' WHERE id = 2; -- வெண்டைக்காய் / Ladies Finger
UPDATE items SET code = 'C' WHERE id = 3; -- மிளகாய் / Chilli
UPDATE items SET code = 'D' WHERE id = 4; -- பச்சை மிளகாய் / Green Chilli
UPDATE items SET code = 'E' WHERE id = 5; -- கருவேப்பிலை / Curry Leaves
UPDATE items SET code = 'F' WHERE id = 6; -- மாங்காய் / Raw Mango
UPDATE items SET code = 'G' WHERE id = 7; -- வரி கத்தரி / Striped Brinjal
UPDATE items SET code = 'H' WHERE id = 8; -- கத்தரிக்காய் / Brinjal
UPDATE items SET code = 'I' WHERE id = 9; -- வெங்காயம் / Onion
UPDATE items SET code = 'J' WHERE id = 10; -- கொத்து வெங்காயம் / Spring Onion
UPDATE items SET code = 'K' WHERE id = 11; -- உருளைக்கிழங்கு / Potato
UPDATE items SET code = 'L' WHERE id = 12; -- கேரட் / Carrot
UPDATE items SET code = 'M' WHERE id = 13; -- பீன்ஸ் / Beans
UPDATE items SET code = 'N' WHERE id = 14; -- முருங்கைக்காய் / Drumstick
UPDATE items SET code = 'O' WHERE id = 15; -- முருங்கை இலை / Drumstick Leaves
UPDATE items SET code = 'P' WHERE id = 16; -- அவரைக்காய் / Avarai Beans
UPDATE items SET code = 'Q' WHERE id = 17; -- பாகற்காய் / Bitter Gourd
UPDATE items SET code = 'R' WHERE id = 18; -- புடலங்காய் / Ridge Gourd
UPDATE items SET code = 'S' WHERE id = 19; -- பீர்க்கங்காய் / Snake Gourd
UPDATE items SET code = 'T' WHERE id = 20; -- சுரைக்காய் / Bottle Gourd
UPDATE items SET code = 'U' WHERE id = 21; -- பூசணிக்காய் / Pumpkin
UPDATE items SET code = 'V' WHERE id = 22; -- வெள்ளைப்பூசணி / Ash Gourd
UPDATE items SET code = 'W' WHERE id = 23; -- வெள்ளரிக்காய் / Cucumber
UPDATE items SET code = 'X' WHERE id = 24; -- கோவைக்காய் / Ivy Gourd
UPDATE items SET code = 'Y' WHERE id = 25; -- கொத்தவரங்காய் / Cluster Beans
UPDATE items SET code = 'Z' WHERE id = 26; -- முள்ளங்கி / Radish
UPDATE items SET code = 'AA' WHERE id = 27; -- பீட்ரூட் / Beetroot
UPDATE items SET code = 'AB' WHERE id = 28; -- காலிஃபிளவர் / Cauliflower
UPDATE items SET code = 'AC' WHERE id = 29; -- முட்டைக்கோஸ் / Cabbage
UPDATE items SET code = 'AD' WHERE id = 30; -- கொத்தமல்லி / Coriander Leaves
UPDATE items SET code = 'AE' WHERE id = 31; -- புதினா / Mint Leaves
UPDATE items SET code = 'AF' WHERE id = 32; -- கீரை / Greens
UPDATE items SET code = 'AG' WHERE id = 33; -- இஞ்சி / Ginger
UPDATE items SET code = 'AH' WHERE id = 34; -- பூண்டு / Garlic
UPDATE items SET code = 'AI' WHERE id = 35; -- வாழைக்காய் / Raw Banana
UPDATE items SET code = 'AJ' WHERE id = 36; -- வாழைப்பூ / Banana Flower
UPDATE items SET code = 'AK' WHERE id = 37; -- சேப்பங்கிழங்கு / Colocasia
UPDATE items SET code = 'AL' WHERE id = 38; -- மரவள்ளிக்கிழங்கு / Tapioca
UPDATE items SET code = 'AM' WHERE id = 39; -- கருணைக்கிழங்கு / Elephant Yam
UPDATE items SET code = 'AN' WHERE id = 40; -- மஞ்சள் கிழங்கு / Raw Turmeric
UPDATE items SET code = 'AO' WHERE id = 41; -- சோளம் / Sweet Corn
UPDATE items SET code = 'AP' WHERE id = 42; -- பட்டாணி / Green Peas
UPDATE items SET code = 'AQ' WHERE id = 43; -- லாரி வாடகை / Lorry Freight
UPDATE items SET code = 'AR' WHERE id = 44; -- கூலி / Cooli
