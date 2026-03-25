-- database.sql (MySQL syntax)
-- Creates a simple table for expenses. Adjust types for your DB engine if needed.

CREATE DATABASE IF NOT EXISTS smart_expense_tracker;
USE smart_expense_tracker;

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example insert
INSERT INTO expenses (expense_date, amount, category, description) VALUES
('2025-11-01', 250.00, 'Food', 'Lunch'),
('2025-11-03', 1200.50, 'Travel', 'Taxi to airport');
