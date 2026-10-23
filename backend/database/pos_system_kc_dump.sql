-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: pos_system_kc
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `branch_print_settings`
--

DROP TABLE IF EXISTS `branch_print_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_print_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned NOT NULL,
  `printer_type` enum('thermal_58','thermal_80','a4','a5') NOT NULL DEFAULT 'a4',
  `invoice_footer_note` varchar(255) DEFAULT NULL,
  `default_print_copies` tinyint unsigned NOT NULL DEFAULT '1',
  `bank_account_no` varchar(30) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `terms_and_conditions` text,
  `show_upi_qr_on_thermal` tinyint(1) NOT NULL DEFAULT '0',
  `allow_local_free_qty` tinyint(1) NOT NULL DEFAULT '1',
  `allow_distance_free_qty` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_print_settings_branch` (`branch_id`),
  CONSTRAINT `fk_bps_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_print_settings`
--

LOCK TABLES `branch_print_settings` WRITE;
/*!40000 ALTER TABLE `branch_print_settings` DISABLE KEYS */;
INSERT INTO `branch_print_settings` VALUES (1,1,'a5',NULL,1,NULL,NULL,NULL,NULL,0,1,0);
/*!40000 ALTER TABLE `branch_print_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int unsigned NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `print_name` varchar(150) NOT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `address_line1` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `support_email` varchar(150) DEFAULT NULL,
  `is_main_branch` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_branches_company` (`company_id`),
  CONSTRAINT `fk_branches_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,1,'Main Branch','AJ AGENCY',NULL,'PLACEHOLDER-GSTIN','PLACEHOLDER-PAN','Address line 1, edit in Settings','City','State','000000','0000000000','support@example.com',1,'active','2026-10-22 11:04:58');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_handover_items`
--

DROP TABLE IF EXISTS `cash_handover_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_handover_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `handover_id` int unsigned NOT NULL,
  `collection_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chi_collection` (`collection_id`),
  KEY `fk_chi_handover` (`handover_id`),
  CONSTRAINT `fk_chi_collection` FOREIGN KEY (`collection_id`) REFERENCES `customer_collections` (`id`),
  CONSTRAINT `fk_chi_handover` FOREIGN KEY (`handover_id`) REFERENCES `cash_handovers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_handover_items`
--

LOCK TABLES `cash_handover_items` WRITE;
/*!40000 ALTER TABLE `cash_handover_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_handover_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_handovers`
--

DROP TABLE IF EXISTS `cash_handovers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_handovers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `handover_no` varchar(30) DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `handover_date` date NOT NULL,
  `system_cash_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `system_digital_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `submitted_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `verified_amount` decimal(12,2) DEFAULT NULL,
  `discrepancy` decimal(12,2) GENERATED ALWAYS AS ((`verified_amount` - `submitted_amount`)) STORED,
  `status` enum('pending','verified','discrepancy_flagged') NOT NULL DEFAULT 'pending',
  `verified_by` int unsigned DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cash_handovers_no` (`handover_no`),
  KEY `fk_ch_employee` (`employee_id`),
  KEY `fk_ch_branch` (`branch_id`),
  KEY `fk_ch_verified_by` (`verified_by`),
  CONSTRAINT `fk_ch_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_ch_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ch_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_handovers`
--

LOCK TABLES `cash_handovers` WRITE;
/*!40000 ALTER TABLE `cash_handovers` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_handovers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_brands`
--

DROP TABLE IF EXISTS `category_brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_brands` (
  `category_id` int unsigned NOT NULL,
  `brand_id` int unsigned NOT NULL,
  PRIMARY KEY (`category_id`,`brand_id`),
  KEY `fk_category_brands_brand` (`brand_id`),
  CONSTRAINT `fk_category_brands_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_category_brands_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_brands`
--

LOCK TABLES `category_brands` WRITE;
/*!40000 ALTER TABLE `category_brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collection_allocations`
--

DROP TABLE IF EXISTS `collection_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_allocations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` int unsigned NOT NULL,
  `invoice_id` int unsigned NOT NULL,
  `allocated_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ca_collection` (`collection_id`),
  KEY `fk_ca_invoice` (`invoice_id`),
  CONSTRAINT `fk_ca_collection` FOREIGN KEY (`collection_id`) REFERENCES `customer_collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_allocations`
--

LOCK TABLES `collection_allocations` WRITE;
/*!40000 ALTER TABLE `collection_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company`
--

LOCK TABLES `company` WRITE;
/*!40000 ALTER TABLE `company` DISABLE KEYS */;
INSERT INTO `company` VALUES (1,'AJ Agency','2026-10-22 11:04:58');
/*!40000 ALTER TABLE `company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_transactions`
--

DROP TABLE IF EXISTS `credit_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_transactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned NOT NULL,
  `transaction_type` enum('sale_credit','payment_received','credit_reversal') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `invoice_id` int unsigned DEFAULT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_credit_transactions_invoice` (`invoice_id`),
  KEY `idx_credit_transactions_customer` (`customer_id`,`id`),
  CONSTRAINT `fk_credit_transactions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_credit_transactions_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_transactions`
--

LOCK TABLES `credit_transactions` WRITE;
/*!40000 ALTER TABLE `credit_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_collections`
--

DROP TABLE IF EXISTS `customer_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_collections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(30) DEFAULT NULL,
  `customer_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('cash','upi','card','other') NOT NULL,
  `collected_by` int unsigned NOT NULL,
  `collected_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_collections_no` (`receipt_no`),
  KEY `fk_cc_customer` (`customer_id`),
  KEY `fk_cc_branch` (`branch_id`),
  KEY `fk_cc_collected_by` (`collected_by`),
  CONSTRAINT `fk_cc_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_cc_collected_by` FOREIGN KEY (`collected_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cc_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_collections`
--

LOCK TABLES `customer_collections` WRITE;
/*!40000 ALTER TABLE `customer_collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_prebooking_items`
--

DROP TABLE IF EXISTS `customer_prebooking_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_prebooking_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `prebooking_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  `rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_cpbi_prebooking` (`prebooking_id`),
  KEY `fk_cpbi_item` (`item_id`),
  CONSTRAINT `fk_cpbi_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_cpbi_prebooking` FOREIGN KEY (`prebooking_id`) REFERENCES `customer_prebookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_prebooking_items`
--

LOCK TABLES `customer_prebooking_items` WRITE;
/*!40000 ALTER TABLE `customer_prebooking_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_prebooking_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_prebookings`
--

DROP TABLE IF EXISTS `customer_prebookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_prebookings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `prebooking_no` varchar(30) DEFAULT NULL,
  `customer_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `employee_id` int unsigned DEFAULT NULL,
  `booking_source` enum('salesman','phone','whatsapp','walk_in','direct') NOT NULL DEFAULT 'direct',
  `status` enum('pending','confirmed','processing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  `invoice_id` int unsigned DEFAULT NULL,
  `van_issue_id` int unsigned DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_prebookings_no` (`prebooking_no`),
  KEY `fk_cpb_customer` (`customer_id`),
  KEY `fk_cpb_employee` (`employee_id`),
  KEY `fk_cpb_invoice` (`invoice_id`),
  KEY `fk_cpb_van_issue` (`van_issue_id`),
  KEY `fk_cpb_created_by` (`created_by`),
  KEY `idx_cpb_branch_status` (`branch_id`,`status`),
  CONSTRAINT `fk_cpb_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_cpb_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cpb_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_cpb_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cpb_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cpb_van_issue` FOREIGN KEY (`van_issue_id`) REFERENCES `stock_issue_notes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_prebookings`
--

LOCK TABLES `customer_prebookings` WRITE;
/*!40000 ALTER TABLE `customer_prebookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_prebookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned NOT NULL,
  `ledger_name` varchar(150) NOT NULL,
  `print_name` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `pricing_type` enum('normal','retail','wholesale') NOT NULL DEFAULT 'normal',
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_local_customer` tinyint(1) NOT NULL DEFAULT '1',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_customers_branch` (`branch_id`),
  CONSTRAINT `fk_customers_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,1,'Murugan Provision Store','Murugan Provision Store','9876543210','33AABCM1234F1Z1','12 Bazaar Street, Puliyangudi','retail',10000.00,0.00,1,'active','2026-10-23 07:02:36');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expense_categories_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
INSERT INTO `expense_categories` VALUES (3,'Electricity'),(7,'Maintenance'),(8,'Miscellaneous'),(6,'Packing Material'),(2,'Rent'),(1,'Sales Return Refund'),(4,'Staff Salary'),(5,'Transport / Fuel');
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `expense_no` varchar(30) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_mode` enum('cash','upi','card','bank_transfer') NOT NULL DEFAULT 'cash',
  `description` varchar(255) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expenses_no` (`expense_no`),
  KEY `fk_exp_branch` (`branch_id`),
  KEY `fk_exp_category` (`category_id`),
  KEY `fk_exp_created_by` (`created_by`),
  CONSTRAINT `fk_exp_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_exp_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_exp_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` int unsigned NOT NULL,
  `item_id` int unsigned DEFAULT NULL,
  `unit_id` int unsigned NOT NULL,
  `item_name_snapshot` varchar(150) NOT NULL,
  `hsn_snapshot` varchar(20) DEFAULT NULL,
  `qty` decimal(12,3) NOT NULL,
  `free_qty` decimal(12,3) NOT NULL DEFAULT '0.000',
  `rate` decimal(12,2) NOT NULL,
  `mrp` decimal(12,2) DEFAULT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cess_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_invoice_items_invoice` (`invoice_id`),
  KEY `fk_invoice_items_item` (`item_id`),
  KEY `fk_invoice_items_unit` (`unit_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_invoice_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `stock_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
INSERT INTO `invoice_items` VALUES (1,1,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(2,1,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(3,2,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(4,2,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(5,3,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(6,4,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(7,4,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(8,5,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(9,5,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(10,6,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(11,7,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(12,7,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(13,8,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(14,8,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(15,9,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(16,10,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(17,10,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(18,11,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(19,11,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(20,12,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(21,13,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(22,13,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(23,14,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(24,14,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(25,15,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(26,16,1,1,'KC Premium Cashew 500g','080132',2.000,0.000,500.00,600.00,10.00,100.00,12.00,108.00,0.00,900.00),(27,16,2,1,'KC California Almonds 1kg','080212',1.000,0.000,2000.00,1000.00,15.00,300.00,5.00,85.00,0.00,1700.00),(28,17,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(29,17,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(30,18,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(31,18,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(32,19,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00),(33,20,1,1,'KC Premium Cashew 500g','080132',1.000,0.000,500.00,600.00,0.00,0.00,12.00,60.00,0.00,500.00),(34,22,1,1,'KC Premium Cashew 500g','080132',2.000,0.000,500.00,600.00,10.00,100.00,12.00,108.00,0.00,900.00),(35,22,2,1,'KC California Almonds 1kg','080212',1.000,0.000,2000.00,1000.00,0.00,200.00,5.00,90.00,0.00,1800.00),(36,23,1,1,'KC Premium Cashew 500g','080132',1.000,20.000,500.00,600.00,16.00,100.00,12.00,48.00,0.00,400.00),(37,24,1,1,'KC Premium Cashew 500g','080132',1.000,0.000,500.00,600.00,0.00,0.00,12.00,60.00,0.00,500.00),(38,25,1,1,'KC Premium Cashew 500g','080132',2.000,0.000,500.00,600.00,10.00,100.00,12.00,108.00,0.00,900.00),(39,25,2,1,'KC California Almonds 1kg','080212',1.000,0.000,2000.00,1000.00,0.00,200.00,5.00,90.00,0.00,1800.00),(40,26,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,12.00,240.00,0.00,2000.00),(41,26,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,5.00,85.00,0.00,1700.00),(42,27,1,1,'KC Premium Cashew 500g','080132',4.000,0.000,500.00,600.00,0.00,0.00,0.00,0.00,0.00,2000.00),(43,27,2,1,'KC California Almonds 1kg','080212',2.000,0.000,850.00,1000.00,0.00,0.00,0.00,0.00,0.00,1700.00),(44,28,2,1,'KC California Almonds 1kg','080212',10.000,0.000,850.00,1000.00,0.00,0.00,5.00,425.00,0.00,8500.00);
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_payments`
--

DROP TABLE IF EXISTS `invoice_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` int unsigned NOT NULL,
  `payment_method` enum('cash','upi','card','credit','other') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reference_no` varchar(50) DEFAULT NULL,
  `paid_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_invoice_payments_invoice` (`invoice_id`),
  CONSTRAINT `fk_invoice_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_payments`
--

LOCK TABLES `invoice_payments` WRITE;
/*!40000 ALTER TABLE `invoice_payments` DISABLE KEYS */;
INSERT INTO `invoice_payments` VALUES (1,1,'cash',4025.00,NULL,'2026-10-23 07:09:20'),(2,2,'cash',3700.00,NULL,'2026-10-23 07:09:20'),(3,3,'cash',8925.00,NULL,'2026-10-23 07:09:20'),(4,4,'cash',4025.00,NULL,'2026-10-23 07:09:57'),(5,5,'cash',3700.00,NULL,'2026-10-23 07:09:57'),(6,6,'cash',8925.00,NULL,'2026-10-23 07:09:57'),(7,7,'cash',4025.00,NULL,'2026-10-23 07:10:36'),(8,8,'cash',3700.00,NULL,'2026-10-23 07:10:36'),(9,9,'cash',8925.00,NULL,'2026-10-23 07:10:36'),(10,10,'cash',4025.00,NULL,'2026-10-23 07:19:00'),(11,11,'cash',3700.00,NULL,'2026-10-23 07:19:00'),(12,12,'cash',8925.00,NULL,'2026-10-23 07:19:00'),(13,13,'cash',4025.00,NULL,'2026-10-23 07:21:52'),(14,14,'cash',3700.00,NULL,'2026-10-23 07:21:52'),(15,15,'cash',8925.00,NULL,'2026-10-23 07:21:52'),(16,16,'cash',2793.00,NULL,'2026-10-23 07:44:58'),(17,17,'cash',4025.00,NULL,'2026-10-23 07:45:09'),(18,18,'cash',3700.00,NULL,'2026-10-23 07:45:09'),(19,19,'cash',8925.00,NULL,'2026-10-23 07:45:09'),(20,20,'cash',560.00,'','2026-10-23 07:57:31'),(21,22,'cash',2898.00,NULL,'2026-10-23 09:00:57'),(22,23,'cash',538.00,'','2026-10-23 09:02:43'),(23,24,'cash',560.00,'','2026-10-23 11:07:40'),(24,25,'cash',2898.00,NULL,'2026-10-23 11:15:22'),(25,26,'cash',4025.00,NULL,'2026-10-23 11:15:29'),(26,27,'cash',3700.00,NULL,'2026-10-23 11:15:29'),(27,28,'cash',8925.00,NULL,'2026-10-23 11:15:29');
/*!40000 ALTER TABLE `invoice_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_sequences`
--

DROP TABLE IF EXISTS `invoice_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_sequences` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned NOT NULL,
  `series` enum('gst','non_gst') NOT NULL,
  `prefix` varchar(10) NOT NULL,
  `current_number` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_sequences` (`branch_id`,`series`),
  CONSTRAINT `fk_invoice_sequences_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_sequences`
--

LOCK TABLES `invoice_sequences` WRITE;
/*!40000 ALTER TABLE `invoice_sequences` DISABLE KEYS */;
INSERT INTO `invoice_sequences` VALUES (1,1,'gst','INV-',18),(2,1,'non_gst','EST-',7);
/*!40000 ALTER TABLE `invoice_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(30) DEFAULT NULL,
  `original_invoice_no` varchar(30) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `customer_id` int unsigned DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `bill_type` enum('gst','non_gst') NOT NULL,
  `price_type` enum('normal','retail','wholesale') NOT NULL DEFAULT 'normal',
  `invoice_format` enum('local','outstation') NOT NULL DEFAULT 'local',
  `invoice_date` date NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `taxable_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sgst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `igst_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cess_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `round_off` decimal(6,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(12,2) GENERATED ALWAYS AS ((`grand_total` - `paid_amount`)) STORED,
  `payment_status` enum('paid','partial','credit','cancelled','returned') DEFAULT NULL,
  `status` enum('held','completed','cancelled','returned','deleted') NOT NULL DEFAULT 'held',
  `cancelled_by` int unsigned DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancel_reason` varchar(255) DEFAULT NULL,
  `edited_by` int unsigned DEFAULT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `deleted_by` int unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `delete_reason` varchar(255) DEFAULT NULL,
  `vehicle_no` varchar(20) DEFAULT NULL,
  `customer_outstanding_after` decimal(12,2) DEFAULT NULL,
  `irn` varchar(100) DEFAULT NULL,
  `ack_no` varchar(50) DEFAULT NULL,
  `ack_date` date DEFAULT NULL,
  `einvoice_status` enum('not_generated','generated','failed','cancelled') NOT NULL DEFAULT 'not_generated',
  `einvoice_qr_code` text,
  `einvoice_error` varchar(500) DEFAULT NULL,
  `einvoice_raw_response` text,
  `eway_bill_status` enum('not_generated','generated','failed','cancelled') NOT NULL DEFAULT 'not_generated',
  `eway_bill_no` varchar(20) DEFAULT NULL,
  `eway_bill_date` timestamp NULL DEFAULT NULL,
  `eway_bill_valid_until` timestamp NULL DEFAULT NULL,
  `eway_bill_error` varchar(500) DEFAULT NULL,
  `eway_bill_raw_response` text,
  `transporter_name` varchar(150) DEFAULT NULL,
  `transporter_gstin` varchar(20) DEFAULT NULL,
  `transport_distance_km` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_branch_invoice_no` (`branch_id`,`invoice_no`),
  KEY `fk_invoices_employee` (`employee_id`),
  KEY `idx_invoices_branch_status` (`branch_id`,`status`),
  KEY `idx_invoices_customer` (`customer_id`),
  KEY `idx_invoices_branch_status_date` (`branch_id`,`status`,`invoice_date`),
  KEY `fk_invoices_cancelled_by` (`cancelled_by`),
  KEY `fk_invoices_edited_by` (`edited_by`),
  KEY `fk_invoices_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_invoices_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_invoices_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_invoices_edited_by` FOREIGN KEY (`edited_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_invoices_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` (`id`, `invoice_no`, `original_invoice_no`, `branch_id`, `customer_id`, `employee_id`, `bill_type`, `price_type`, `invoice_format`, `invoice_date`, `subtotal`, `discount_amount`, `taxable_value`, `cgst_amount`, `sgst_amount`, `igst_amount`, `cess_amount`, `round_off`, `grand_total`, `paid_amount`, `payment_status`, `status`, `cancelled_by`, `cancelled_at`, `cancel_reason`, `edited_by`, `edited_at`, `deleted_by`, `deleted_at`, `delete_reason`, `vehicle_no`, `customer_outstanding_after`, `irn`, `ack_no`, `ack_date`, `einvoice_status`, `einvoice_qr_code`, `einvoice_error`, `einvoice_raw_response`, `eway_bill_status`, `eway_bill_no`, `eway_bill_date`, `eway_bill_valid_until`, `eway_bill_error`, `eway_bill_raw_response`, `transporter_name`, `transporter_gstin`, `transport_distance_km`, `created_at`, `updated_at`) VALUES (1,'INV-2026-000001',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:20','2026-10-23 07:09:20'),(2,'EST-2026-000001',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:20','2026-10-23 07:09:20'),(3,'INV-2026-000002',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:20','2026-10-23 07:09:20'),(4,'INV-2026-000003',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:57','2026-10-23 07:09:57'),(5,'EST-2026-000002',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:57','2026-10-23 07:09:57'),(6,'INV-2026-000004',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:09:57','2026-10-23 07:09:57'),(7,'INV-2026-000005',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:10:36','2026-10-23 07:10:36'),(8,'EST-2026-000003',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:10:36','2026-10-23 07:10:36'),(9,'INV-2026-000006',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:10:36','2026-10-23 07:10:36'),(10,'INV-2026-000007',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:19:00','2026-10-23 07:19:00'),(11,'EST-2026-000004',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:19:00','2026-10-23 07:19:00'),(12,'INV-2026-000008',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:19:00','2026-10-23 07:19:00'),(13,'INV-2026-000009',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:21:52','2026-10-23 07:21:52'),(14,'EST-2026-000005',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:21:52','2026-10-23 07:21:52'),(15,'INV-2026-000010',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:21:52','2026-10-23 07:21:52'),(16,'INV-2026-000011',NULL,1,NULL,1,'gst','normal','local','2026-10-23',3000.00,400.00,2600.00,96.50,96.50,0.00,0.00,0.00,2793.00,2793.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:44:58','2026-10-23 07:44:58'),(17,'INV-2026-000012',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:45:09','2026-10-23 07:45:09'),(18,'EST-2026-000006',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:45:09','2026-10-23 07:45:09'),(19,NULL,'INV-2026-000013',1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','deleted',NULL,NULL,NULL,NULL,NULL,1,'2026-10-23 08:19:27','',NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:45:09','2026-10-23 08:19:27'),(20,NULL,'INV-2026-000014',1,NULL,1,'gst','normal','local','2026-10-23',500.00,0.00,500.00,30.00,30.00,0.00,0.00,0.00,560.00,560.00,'paid','deleted',NULL,NULL,NULL,NULL,NULL,1,'2026-10-23 07:59:41','',NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 07:57:31','2026-10-23 07:59:41'),(22,'INV-2026-000013',NULL,1,NULL,1,'gst','normal','local','2026-10-23',3000.00,300.00,2700.00,99.00,99.00,0.00,0.00,0.00,2898.00,2898.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 09:00:57','2026-10-23 09:00:57'),(23,'INV-2026-000014',NULL,1,NULL,1,'gst','normal','local','2026-10-23',500.00,100.00,400.00,24.00,24.00,0.00,0.00,0.00,448.00,448.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 09:02:43','2026-10-23 09:02:43'),(24,'INV-2026-000015',NULL,1,NULL,1,'gst','normal','local','2026-10-23',500.00,0.00,500.00,30.00,30.00,0.00,0.00,0.00,560.00,560.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 11:07:40','2026-10-23 11:07:40'),(25,'INV-2026-000016',NULL,1,NULL,1,'gst','normal','local','2026-10-23',3000.00,300.00,2700.00,99.00,99.00,0.00,0.00,0.00,2898.00,2898.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 11:15:22','2026-10-23 11:15:22'),(26,'INV-2026-000017',NULL,1,1,1,'gst','normal','local','2026-10-23',3700.00,0.00,3700.00,162.50,162.50,0.00,0.00,0.00,4025.00,4025.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 11:15:29','2026-10-23 11:15:29'),(27,'EST-2026-000007',NULL,1,1,1,'non_gst','normal','local','2026-10-23',3700.00,0.00,3700.00,0.00,0.00,0.00,0.00,0.00,3700.00,3700.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 11:15:29','2026-10-23 11:15:29'),(28,'INV-2026-000018',NULL,1,1,1,'gst','normal','local','2026-10-23',8500.00,0.00,8500.00,212.50,212.50,0.00,0.00,0.00,8925.00,8925.00,'paid','completed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,'not_generated',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-23 11:15:29','2026-10-23 11:15:29');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_branches`
--

DROP TABLE IF EXISTS `item_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_branches` (
  `item_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  PRIMARY KEY (`item_id`,`branch_id`),
  KEY `fk_item_branches_branch` (`branch_id`),
  CONSTRAINT `fk_item_branches_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_branches_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_branches`
--

LOCK TABLES `item_branches` WRITE;
/*!40000 ALTER TABLE `item_branches` DISABLE KEYS */;
INSERT INTO `item_branches` VALUES (1,1),(2,1);
/*!40000 ALTER TABLE `item_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_unit_conversions`
--

DROP TABLE IF EXISTS `item_unit_conversions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_unit_conversions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `conversion_to_base` decimal(10,3) NOT NULL,
  `is_purchase_unit` tinyint(1) NOT NULL DEFAULT '0',
  `is_sale_unit` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_unit` (`item_id`,`unit_id`),
  KEY `fk_iuc_unit` (`unit_id`),
  CONSTRAINT `fk_iuc_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_iuc_unit` FOREIGN KEY (`unit_id`) REFERENCES `stock_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_unit_conversions`
--

LOCK TABLES `item_unit_conversions` WRITE;
/*!40000 ALTER TABLE `item_unit_conversions` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_unit_conversions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_code` varchar(20) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `brand_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `base_unit_id` int unsigned NOT NULL,
  `secondary_unit_id` int unsigned DEFAULT NULL,
  `conversion_factor` decimal(10,3) DEFAULT NULL,
  `purchase_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `wholesale_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `retail_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `mrp` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_srate` decimal(12,2) DEFAULT NULL,
  `net_purrate` decimal(12,2) DEFAULT NULL,
  `secondary_mrp` decimal(12,2) DEFAULT NULL,
  `secondary_net_srate` decimal(12,2) DEFAULT NULL,
  `secondary_net_purrate` decimal(12,2) DEFAULT NULL,
  `retail_selling_price` decimal(12,2) DEFAULT NULL,
  `wholesale_selling_price` decimal(12,2) DEFAULT NULL,
  `min_stock_threshold` decimal(12,3) NOT NULL DEFAULT '0.000',
  `tax_code_id` int unsigned DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_items_item_code` (`item_code`),
  UNIQUE KEY `uq_items_barcode` (`barcode`),
  KEY `fk_items_category` (`category_id`),
  KEY `fk_items_brand` (`brand_id`),
  KEY `fk_items_base_unit` (`base_unit_id`),
  KEY `fk_items_secondary_unit` (`secondary_unit_id`),
  KEY `fk_items_tax_code` (`tax_code_id`),
  KEY `fk_items_supplier` (`supplier_id`),
  CONSTRAINT `fk_items_base_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `stock_units` (`id`),
  CONSTRAINT `fk_items_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_items_secondary_unit` FOREIGN KEY (`secondary_unit_id`) REFERENCES `stock_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_items_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_items_tax_code` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_codes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'ITM001','KC Premium Cashew 500g',NULL,NULL,NULL,'080132',NULL,1,NULL,NULL,0.00,420.00,480.00,500.00,600.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.000,3,NULL,1,'2026-10-23 07:02:36','2026-10-23 07:02:36'),(2,'ITM002','KC California Almonds 1kg',NULL,NULL,NULL,'080212',NULL,1,NULL,NULL,0.00,720.00,800.00,850.00,1000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.000,2,NULL,1,'2026-10-23 07:02:36','2026-10-23 07:02:36');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_log`
--

DROP TABLE IF EXISTS `login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `email_attempted` varchar(150) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_login_log_user` (`user_id`),
  CONSTRAINT `fk_login_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_log`
--

LOCK TABLES `login_log` WRITE;
/*!40000 ALTER TABLE `login_log` DISABLE KEYS */;
INSERT INTO `login_log` VALUES (1,NULL,'admin@example.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',0,'2026-10-22 09:39:36'),(2,NULL,'admin@example.com','127.0.0.1','Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36',0,'2026-10-22 09:39:44'),(3,1,'admin@example.com','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',1,'2026-10-23 04:00:25');
/*!40000 ALTER TABLE `login_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `other_income`
--

DROP TABLE IF EXISTS `other_income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `other_income` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(30) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_mode` enum('cash','upi','card','bank_transfer') NOT NULL DEFAULT 'cash',
  `description` varchar(255) NOT NULL,
  `income_date` date NOT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_other_income_no` (`receipt_no`),
  KEY `fk_oi_branch` (`branch_id`),
  KEY `fk_oi_created_by` (`created_by`),
  CONSTRAINT `fk_oi_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_oi_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `other_income`
--

LOCK TABLES `other_income` WRITE;
/*!40000 ALTER TABLE `other_income` DISABLE KEYS */;
/*!40000 ALTER TABLE `other_income` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `label` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'pos','pos.cancel_completed_invoice','Cancel a completed invoice','Void a completed bill, reversing its stock and credit effects'),(2,'pos','pos.edit_completed_invoice','Edit a completed invoice','Change items/qty/rate/discount on a completed bill, with stock and credit corrected automatically'),(3,'orders','orders.view_prebooking','View customer pre-bookings','See the customer pre-booking register'),(4,'orders','orders.manage_prebooking_status','Manage pre-booking status','Confirm/process/cancel a customer pre-booking'),(5,'orders','orders.approve_purchase_request','Approve purchase requests','Approve a supplier purchase request before it can be turned into a GRN'),(6,'purchases','purchases.edit_grn','Edit a GRN','Change items/qty/rate/discount on an existing GRN, with stock and supplier balance corrected automatically'),(7,'pos','pos.delete_completed_invoice','Delete a completed invoice','Soft-delete a completed bill (reverses its stock/credit effects, same as cancel) and frees its invoice number for reuse — unlike cancel, the number is not permanently consumed'),(15,'dashboard','dashboard.view_financial_summary','View financial summary','See revenue/profit figures on the dashboard, not just counts'),(16,'pos','pos.access','Access POS screen','Open the billing/POS screen at all'),(17,'pos','pos.apply_discount','Apply discount at billing','Add a line/bill discount while billing'),(18,'pos','pos.edit_price_at_sale','Edit price at sale','Override an item\'s rate at the point of sale'),(19,'pos','pos.void_hold_bill','Void / discard held bill','Discard a held bill instead of only resuming it'),(20,'pos','pos.gst_billing','Create GST bills','Use the GST billing mode'),(21,'pos','pos.non_gst_billing','Create Non-GST / estimate bills','Use the Non-GST / estimate billing mode'),(22,'pos','pos.camera_scan_items','Camera scan-to-cart','Use the camera/photo OCR item scanner'),(23,'pos','pos.manage_gst_filing','Generate E-Invoice / E-Way Bill','Generate or cancel a completed invoice\'s E-Invoice (IRN) and E-Way Bill filings'),(24,'orders','orders.create_prebooking','Create pre-booking orders','Create customer pre-booking/sales orders'),(25,'orders','orders.create_purchase_indent','Create purchase indents','Raise a purchase request/indent to a supplier'),(26,'returns','returns.sales_return','Process sales returns','Create a sales return against/without an invoice'),(27,'returns','returns.purchase_return','Process purchase returns','Create a purchase return against a GRN'),(28,'returns','returns.approve_untraceable_return','Approve untraceable returns','Approve a sales return that has no traceable original invoice'),(29,'inventory','inventory.view_stock','View stock','View stock-on-hand across warehouse/branch/salesman'),(30,'inventory','inventory.issue_van_stock','Issue van/salesman stock','Issue stock from warehouse to a salesman'),(31,'inventory','inventory.stock_adjustment','Stock adjustment','Manually adjust stock quantity with a reason'),(32,'purchases','purchases.create_grn','Create GRN','Record a goods-received-note / purchase'),(33,'purchases','purchases.delete_grn','Delete GRN','Delete/reverse a purchase GRN'),(34,'purchases','purchases.view_purchase_cost','View purchase cost','See cost/purchase price fields on items and reports'),(35,'purchases','purchases.settle_supplier_payment','Settle supplier payment','Record a payment made to a supplier'),(36,'catalog','catalog.manage_items','Manage items','Create/edit the product catalog'),(37,'catalog','catalog.manage_price_lists','Manage price lists','Create/edit wholesale/retail/scheme price lists'),(38,'catalog','catalog.manage_price_rules','Manage price rules','Create/edit per-customer-type price overrides'),(39,'parties','parties.manage_customers','Manage customers','Create/edit customer master records'),(40,'parties','parties.manage_suppliers','Manage suppliers','Create/edit supplier master records'),(41,'credit','credit.create_credit_sale','Create credit sale','Bill a sale on customer credit'),(42,'credit','credit.collect_credit_payment','Collect credit payment','Record a customer payment against outstanding credit'),(43,'credit','credit.view_shopwide_outstanding','View shop-wide outstanding','See every customer\'s outstanding, not just their own sales'),(44,'collections','collections.field_collection_entry','Field collection entry','Enter a cash/UPI collection made in the field'),(45,'handover','handover.submit_cash_handover','Submit cash handover','Hand over collected cash for reconciliation'),(46,'handover','handover.verify_reconcile','Verify/reconcile handover','Physically count and confirm a submitted cash handover'),(47,'expenses','expenses.manage','Manage expenses & income','Record branch expenses and other income'),(48,'reports','reports.view_all','View reports','Open the reports module'),(49,'reports','reports.view_profit','View profit reports','See gross-profit/P&L figures in reports'),(50,'reports','reports.view_gst_register','View GST sales register','View the GST-tagged sales register'),(51,'reports','reports.view_non_gst_register','View Non-GST register','View the internal Non-GST/estimate register'),(52,'reports','reports.export_excel','Export reports to Excel','Download any report as .xlsx'),(53,'staff','staff.manage_accounts','Manage staff accounts','Create/edit employee login accounts'),(54,'staff','staff.manage_permissions','Manage staff permissions','Toggle per-employee permission overrides'),(55,'settings','settings.manage','Manage settings','Edit company profile, printer setup, invoice sequences'),(56,'branches','branches.manage','Manage branches','Create/edit/deactivate branches'),(57,'branches','branches.switch_context','Switch branch context','See the header branch switcher and act across branches');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `purchase_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  `free_qty` decimal(12,3) NOT NULL DEFAULT '0.000',
  `rate` decimal(12,2) NOT NULL,
  `mrp` decimal(12,2) DEFAULT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_purchase_items_purchase` (`purchase_id`),
  KEY `fk_purchase_items_item` (`item_id`),
  KEY `fk_purchase_items_unit` (`unit_id`),
  CONSTRAINT `fk_purchase_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_items_unit` FOREIGN KEY (`unit_id`) REFERENCES `stock_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_request_items`
--

DROP TABLE IF EXISTS `purchase_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_request_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `purchase_request_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  `rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_pri_request` (`purchase_request_id`),
  KEY `fk_pri_item` (`item_id`),
  CONSTRAINT `fk_pri_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_pri_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_request_items`
--

LOCK TABLES `purchase_request_items` WRITE;
/*!40000 ALTER TABLE `purchase_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requests`
--

DROP TABLE IF EXISTS `purchase_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `request_no` varchar(30) DEFAULT NULL,
  `supplier_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `status` enum('open','approved','partially_received','converted_to_grn','cancelled') NOT NULL DEFAULT 'open',
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `approved_by` int unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_requests_no` (`request_no`),
  KEY `fk_pr_supplier` (`supplier_id`),
  KEY `fk_pr_branch` (`branch_id`),
  KEY `fk_pr_user` (`created_by`),
  KEY `fk_pr_approved_by` (`approved_by`),
  CONSTRAINT `fk_pr_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_pr_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_pr_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_pr_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requests`
--

LOCK TABLES `purchase_requests` WRITE;
/*!40000 ALTER TABLE `purchase_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_return_items`
--

DROP TABLE IF EXISTS `purchase_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_return_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `purchase_return_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `purchase_item_id` int unsigned DEFAULT NULL,
  `qty` decimal(12,3) NOT NULL,
  `rate` decimal(12,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_preti_return` (`purchase_return_id`),
  KEY `fk_preti_item` (`item_id`),
  KEY `fk_prit_purchase_item` (`purchase_item_id`),
  CONSTRAINT `fk_preti_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_preti_return` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prit_purchase_item` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_return_items`
--

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_returns`
--

DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_returns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(30) DEFAULT NULL,
  `purchase_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `return_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) GENERATED ALWAYS AS ((`return_total` - `refund_amount`)) STORED,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_returns_no` (`return_no`),
  KEY `fk_pret_purchase` (`purchase_id`),
  KEY `fk_pret_supplier` (`supplier_id`),
  KEY `fk_pret_branch` (`branch_id`),
  KEY `fk_pret_created_by` (`created_by`),
  CONSTRAINT `fk_pret_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_pret_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_pret_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pret_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `grn_no` varchar(30) DEFAULT NULL,
  `purchase_request_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `supplier_invoice_no` varchar(50) DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `payment_mode` enum('cash','credit','bank_transfer','upi') NOT NULL DEFAULT 'credit',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `pending_balance` decimal(12,2) GENERATED ALWAYS AS ((`grand_total` - `paid_amount`)) STORED,
  `status` enum('active','cancelled') NOT NULL DEFAULT 'active',
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchases_grn_no` (`grn_no`),
  KEY `fk_purchases_request` (`purchase_request_id`),
  KEY `fk_purchases_supplier` (`supplier_id`),
  KEY `fk_purchases_branch` (`branch_id`),
  KEY `fk_purchases_user` (`created_by`),
  CONSTRAINT `fk_purchases_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_purchases_request` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_purchases_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int unsigned NOT NULL,
  `permission_id` int unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(2,1),(1,2),(2,2),(1,3),(2,3),(1,4),(2,4),(1,5),(2,5),(1,6),(2,6),(1,7),(2,7),(1,15),(2,15),(3,15),(1,16),(2,16),(3,16),(4,16),(5,16),(1,17),(2,17),(5,17),(1,18),(2,18),(1,19),(2,19),(5,19),(1,20),(2,20),(3,20),(5,20),(1,21),(2,21),(3,21),(4,21),(5,21),(1,22),(2,22),(5,22),(1,23),(2,23),(1,24),(2,24),(3,24),(4,24),(1,25),(2,25),(3,25),(1,26),(2,26),(5,26),(1,27),(2,27),(1,28),(2,28),(1,29),(2,29),(3,29),(4,29),(1,30),(2,30),(1,31),(2,31),(1,32),(2,32),(3,32),(1,33),(2,33),(1,34),(2,34),(3,34),(1,35),(2,35),(1,36),(2,36),(1,37),(2,37),(1,38),(2,38),(1,39),(2,39),(3,39),(1,40),(2,40),(3,40),(1,41),(2,41),(4,41),(5,41),(1,42),(2,42),(4,42),(5,42),(1,43),(2,43),(3,43),(1,44),(2,44),(4,44),(1,45),(2,45),(5,45),(1,46),(2,46),(1,47),(2,47),(1,48),(2,48),(3,48),(5,48),(1,49),(2,49),(1,50),(2,50),(3,50),(1,51),(2,51),(3,51),(1,52),(2,52),(3,52),(1,53),(2,53),(1,54),(2,54),(1,55),(2,55),(1,56),(1,57),(2,57);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `is_system_role` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_roles_branch` (`branch_id`),
  CONSTRAINT `fk_roles_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,NULL,'Super Admin',1,'2026-10-22 11:04:58'),(2,NULL,'Admin',1,'2026-10-22 11:04:58'),(3,NULL,'Manager',0,'2026-10-22 11:04:58'),(4,NULL,'Field Sales Executive',0,'2026-10-22 11:04:58'),(5,NULL,'Billing Executive',0,'2026-10-22 11:04:58');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_return_items`
--

DROP TABLE IF EXISTS `sales_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_return_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sales_return_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `invoice_item_id` int unsigned DEFAULT NULL,
  `qty` decimal(12,3) NOT NULL,
  `rate` decimal(12,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_srit_return` (`sales_return_id`),
  KEY `fk_srit_item` (`item_id`),
  KEY `fk_srit_invoice_item` (`invoice_item_id`),
  CONSTRAINT `fk_srit_invoice_item` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_srit_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_srit_return` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_return_items`
--

LOCK TABLES `sales_return_items` WRITE;
/*!40000 ALTER TABLE `sales_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_returns`
--

DROP TABLE IF EXISTS `sales_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_returns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(30) DEFAULT NULL,
  `invoice_id` int unsigned DEFAULT NULL,
  `customer_id` int unsigned DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `refund_action` enum('credit_note','cash_refund') NOT NULL DEFAULT 'credit_note',
  `return_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) GENERATED ALWAYS AS ((`return_total` - `refund_amount`)) STORED,
  `requires_admin_approval` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('pending_approval','approved','rejected') NOT NULL DEFAULT 'approved',
  `approved_by` int unsigned DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sales_returns_no` (`return_no`),
  KEY `fk_sr_invoice` (`invoice_id`),
  KEY `fk_sr_customer` (`customer_id`),
  KEY `fk_sr_branch` (`branch_id`),
  KEY `fk_sr_approved_by` (`approved_by`),
  KEY `fk_sr_created_by` (`created_by`),
  CONSTRAINT `fk_sr_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sr_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sr_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_sr_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sr_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_returns`
--

LOCK TABLES `sales_returns` WRITE;
/*!40000 ALTER TABLE `sales_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `owner_type` enum('warehouse','branch','employee') NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `adjustment_type` enum('addition','deduction') NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  `reason` enum('damage','spoilage','count_correction','other') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_stock_adj_item` (`item_id`),
  KEY `fk_stock_adj_user` (`created_by`),
  CONSTRAINT `fk_stock_adj_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_stock_adj_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_issue_items`
--

DROP TABLE IF EXISTS `stock_issue_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_issue_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `issue_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sii_issue` (`issue_id`),
  KEY `fk_sii_item` (`item_id`),
  CONSTRAINT `fk_sii_issue` FOREIGN KEY (`issue_id`) REFERENCES `stock_issue_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sii_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_issue_items`
--

LOCK TABLES `stock_issue_items` WRITE;
/*!40000 ALTER TABLE `stock_issue_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_issue_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_issue_notes`
--

DROP TABLE IF EXISTS `stock_issue_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_issue_notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `issue_no` varchar(30) DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `employee_id` int unsigned NOT NULL,
  `issued_by` int unsigned NOT NULL,
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_issue_no` (`issue_no`),
  KEY `fk_sin_branch` (`branch_id`),
  KEY `fk_sin_employee` (`employee_id`),
  KEY `fk_sin_issued_by` (`issued_by`),
  CONSTRAINT `fk_sin_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sin_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_sin_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_issue_notes`
--

LOCK TABLES `stock_issue_notes` WRITE;
/*!40000 ALTER TABLE `stock_issue_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_issue_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_ledger`
--

DROP TABLE IF EXISTS `stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_ledger` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `owner_type` enum('warehouse','branch','employee') NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `quantity_on_hand` decimal(14,3) NOT NULL DEFAULT '0.000',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_ledger_owner` (`item_id`,`owner_type`,`owner_id`),
  CONSTRAINT `fk_stock_ledger_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_ledger`
--

LOCK TABLES `stock_ledger` WRITE;
/*!40000 ALTER TABLE `stock_ledger` DISABLE KEYS */;
INSERT INTO `stock_ledger` VALUES (1,1,'branch',1,492.000),(2,2,'branch',1,486.000);
/*!40000 ALTER TABLE `stock_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `owner_type` enum('warehouse','branch','employee') NOT NULL,
  `owner_id` int unsigned NOT NULL,
  `movement_type` enum('purchase','sale','sale_return','purchase_return','adjustment','issue_to_salesman','salesman_return','opening_stock','damage') NOT NULL,
  `qty_change` decimal(14,3) NOT NULL,
  `qty_before` decimal(14,3) NOT NULL,
  `qty_after` decimal(14,3) NOT NULL,
  `reference_table` varchar(50) DEFAULT NULL,
  `reference_id` int unsigned DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_stock_movements_user` (`created_by`),
  KEY `idx_stock_movements_item_owner` (`item_id`,`owner_type`,`owner_id`),
  CONSTRAINT `fk_stock_movements_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_stock_movements_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',1,NULL,NULL,1,'2026-10-23 07:09:20'),(2,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',1,NULL,NULL,1,'2026-10-23 07:09:20'),(3,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',2,NULL,NULL,1,'2026-10-23 07:09:20'),(4,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',2,NULL,NULL,1,'2026-10-23 07:09:20'),(5,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',3,NULL,NULL,1,'2026-10-23 07:09:20'),(6,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',4,NULL,NULL,1,'2026-10-23 07:09:57'),(7,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',4,NULL,NULL,1,'2026-10-23 07:09:57'),(8,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',5,NULL,NULL,1,'2026-10-23 07:09:57'),(9,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',5,NULL,NULL,1,'2026-10-23 07:09:57'),(10,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',6,NULL,NULL,1,'2026-10-23 07:09:57'),(11,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',7,NULL,NULL,1,'2026-10-23 07:10:36'),(12,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',7,NULL,NULL,1,'2026-10-23 07:10:36'),(13,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',8,NULL,NULL,1,'2026-10-23 07:10:36'),(14,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',8,NULL,NULL,1,'2026-10-23 07:10:36'),(15,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',9,NULL,NULL,1,'2026-10-23 07:10:36'),(16,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',10,NULL,NULL,1,'2026-10-23 07:19:00'),(17,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',10,NULL,NULL,1,'2026-10-23 07:19:00'),(18,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',11,NULL,NULL,1,'2026-10-23 07:19:00'),(19,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',11,NULL,NULL,1,'2026-10-23 07:19:00'),(20,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',12,NULL,NULL,1,'2026-10-23 07:19:00'),(21,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',13,NULL,NULL,1,'2026-10-23 07:21:52'),(22,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',13,NULL,NULL,1,'2026-10-23 07:21:52'),(23,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',14,NULL,NULL,1,'2026-10-23 07:21:52'),(24,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',14,NULL,NULL,1,'2026-10-23 07:21:52'),(25,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',15,NULL,NULL,1,'2026-10-23 07:21:52'),(26,1,'branch',1,'sale',-2.000,492.000,490.000,'invoices',16,NULL,NULL,1,'2026-10-23 07:44:58'),(27,2,'branch',1,'sale',-1.000,486.000,485.000,'invoices',16,NULL,NULL,1,'2026-10-23 07:44:58'),(28,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',17,NULL,NULL,1,'2026-10-23 07:45:09'),(29,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',17,NULL,NULL,1,'2026-10-23 07:45:09'),(30,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',18,NULL,NULL,1,'2026-10-23 07:45:09'),(31,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',18,NULL,NULL,1,'2026-10-23 07:45:09'),(32,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',19,NULL,NULL,1,'2026-10-23 07:45:09'),(33,1,'branch',1,'sale',-1.000,492.000,491.000,'invoices',20,NULL,NULL,1,'2026-10-23 07:57:31'),(34,1,'branch',1,'sale_return',1.000,491.000,492.000,'invoices',20,'invoice_deleted','',1,'2026-10-23 07:59:41'),(35,2,'branch',1,'sale_return',10.000,486.000,496.000,'invoices',19,'invoice_deleted','',1,'2026-10-23 08:19:27'),(36,1,'branch',1,'sale',-2.000,492.000,490.000,'invoices',22,NULL,NULL,1,'2026-10-23 09:00:57'),(37,2,'branch',1,'sale',-1.000,496.000,495.000,'invoices',22,NULL,NULL,1,'2026-10-23 09:00:57'),(38,1,'branch',1,'sale',-21.000,490.000,469.000,'invoices',23,NULL,NULL,1,'2026-10-23 09:02:43'),(39,1,'branch',1,'sale',-1.000,469.000,468.000,'invoices',24,NULL,NULL,1,'2026-10-23 11:07:40'),(40,1,'branch',1,'sale',-2.000,468.000,466.000,'invoices',25,NULL,NULL,1,'2026-10-23 11:15:22'),(41,2,'branch',1,'sale',-1.000,495.000,494.000,'invoices',25,NULL,NULL,1,'2026-10-23 11:15:22'),(42,1,'branch',1,'sale',-4.000,500.000,496.000,'invoices',26,NULL,NULL,1,'2026-10-23 11:15:29'),(43,2,'branch',1,'sale',-2.000,500.000,498.000,'invoices',26,NULL,NULL,1,'2026-10-23 11:15:29'),(44,1,'branch',1,'sale',-4.000,496.000,492.000,'invoices',27,NULL,NULL,1,'2026-10-23 11:15:29'),(45,2,'branch',1,'sale',-2.000,498.000,496.000,'invoices',27,NULL,NULL,1,'2026-10-23 11:15:29'),(46,2,'branch',1,'sale',-10.000,496.000,486.000,'invoices',28,NULL,NULL,1,'2026-10-23 11:15:29');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_return_items`
--

DROP TABLE IF EXISTS `stock_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_return_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_id` int unsigned NOT NULL,
  `item_id` int unsigned NOT NULL,
  `qty` decimal(12,3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sri_return` (`return_id`),
  KEY `fk_sri_item` (`item_id`),
  CONSTRAINT `fk_sri_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_sri_return` FOREIGN KEY (`return_id`) REFERENCES `stock_return_notes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_return_items`
--

LOCK TABLES `stock_return_items` WRITE;
/*!40000 ALTER TABLE `stock_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_return_notes`
--

DROP TABLE IF EXISTS `stock_return_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_return_notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_no` varchar(30) DEFAULT NULL,
  `issue_id` int unsigned DEFAULT NULL,
  `branch_id` int unsigned NOT NULL,
  `employee_id` int unsigned NOT NULL,
  `returned_by` int unsigned NOT NULL,
  `returned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_return_no` (`return_no`),
  KEY `fk_srn_issue` (`issue_id`),
  KEY `fk_srn_branch` (`branch_id`),
  KEY `fk_srn_employee` (`employee_id`),
  KEY `fk_srn_returned_by` (`returned_by`),
  CONSTRAINT `fk_srn_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_srn_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_srn_issue` FOREIGN KEY (`issue_id`) REFERENCES `stock_issue_notes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_srn_returned_by` FOREIGN KEY (`returned_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_return_notes`
--

LOCK TABLES `stock_return_notes` WRITE;
/*!40000 ALTER TABLE `stock_return_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_return_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_units`
--

DROP TABLE IF EXISTS `stock_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_units` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `short_code` varchar(10) NOT NULL,
  `is_decimal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_units_short_code` (`short_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_units`
--

LOCK TABLES `stock_units` WRITE;
/*!40000 ALTER TABLE `stock_units` DISABLE KEYS */;
INSERT INTO `stock_units` VALUES (1,'Pieces','PCS',0),(2,'Kilogram','KG',1),(3,'Litre','LTR',1),(4,'Box','BOX',0),(5,'Carton','CTN',0);
/*!40000 ALTER TABLE `stock_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_ledger_transactions`
--

DROP TABLE IF EXISTS `supplier_ledger_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_ledger_transactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` int unsigned NOT NULL,
  `transaction_type` enum('purchase_credit','payment_made','debit_note_adjustment') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `purchase_id` int unsigned DEFAULT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_slt_purchase` (`purchase_id`),
  KEY `idx_slt_supplier` (`supplier_id`,`id`),
  CONSTRAINT `fk_slt_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_slt_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_ledger_transactions`
--

LOCK TABLES `supplier_ledger_transactions` WRITE;
/*!40000 ALTER TABLE `supplier_ledger_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_ledger_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payment_allocations`
--

DROP TABLE IF EXISTS `supplier_payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_payment_allocations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `supplier_payment_id` int unsigned NOT NULL,
  `purchase_id` int unsigned NOT NULL,
  `allocated_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_spa_payment` (`supplier_payment_id`),
  KEY `fk_spa_purchase` (`purchase_id`),
  CONSTRAINT `fk_spa_payment` FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spa_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payment_allocations`
--

LOCK TABLES `supplier_payment_allocations` WRITE;
/*!40000 ALTER TABLE `supplier_payment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payment_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(30) DEFAULT NULL,
  `supplier_id` int unsigned NOT NULL,
  `branch_id` int unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_mode` enum('cash','bank_transfer','upi','cheque') NOT NULL,
  `reference_no` varchar(50) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `paid_by` int unsigned NOT NULL,
  `paid_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_supplier_payments_code` (`payment_code`),
  KEY `fk_sp_supplier` (`supplier_id`),
  KEY `fk_sp_branch` (`branch_id`),
  KEY `fk_sp_user` (`paid_by`),
  CONSTRAINT `fk_sp_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sp_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_sp_user` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_suppliers_branch` (`branch_id`),
  CONSTRAINT `fk_suppliers_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_codes`
--

DROP TABLE IF EXISTS `tax_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `gst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cgst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `sgst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `igst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cess_percent` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tax_codes_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_codes`
--

LOCK TABLES `tax_codes` WRITE;
/*!40000 ALTER TABLE `tax_codes` DISABLE KEYS */;
INSERT INTO `tax_codes` VALUES (1,'GST0','GST 0%',0.00,0.00,0.00,0.00,NULL),(2,'GST5','GST 5%',5.00,2.50,2.50,5.00,NULL),(3,'GST12','GST 12%',12.00,6.00,6.00,12.00,NULL),(4,'GST18','GST 18%',18.00,9.00,9.00,18.00,NULL),(5,'GST28','GST 28%',28.00,14.00,14.00,28.00,NULL);
/*!40000 ALTER TABLE `tax_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `user_id` int unsigned NOT NULL,
  `permission_id` int unsigned NOT NULL,
  `is_granted` tinyint(1) NOT NULL,
  `granted_by` int unsigned DEFAULT NULL,
  `granted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`permission_id`),
  KEY `fk_up_permission` (`permission_id`),
  KEY `fk_up_granted_by` (`granted_by`),
  CONSTRAINT `fk_up_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_up_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` int unsigned DEFAULT NULL,
  `role_id` int unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `fk_users_branch` (`branch_id`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,1,'Super Admin','admin@example.com','$2y$10$WChYQdvaqGR.YxQ4bpSgcepz2jqCyv2DEBgr6/LsX4n54RLPODp7G','9999999999','active','2026-10-22 11:04:58');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'pos_system_kc'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 17:11:36
