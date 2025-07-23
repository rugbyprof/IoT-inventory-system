-- Create Database
CREATE DATABASE IF NOT EXISTS lab_inventory;
USE lab_inventory;

-- Drop tables if they exist
DROP TABLE IF EXISTS checkouts;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Components Table
CREATE TABLE components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('main board', 'breakout board', 'capacitor', 'diode', 'resistor', 'transistor', 'sensor') NOT NULL,
    quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checkouts Table
CREATE TABLE checkouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    component_id INT,
    quantity INT,
    status ENUM('requested', 'approved', 'rejected') DEFAULT 'requested',
    rejection_reason TEXT,
    checkout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);

-- Insert Test Users
-- Password is bcrypt for 'admin123' and 'user123'
INSERT INTO users (username, email, password, role) VALUES
('admin1', 'admin@example.com', '$2b$10$U8XxGG9URhUzATVwRVk11esTpuhAxocRv9nh5uygtMCh6lIJK8fzG', 'admin'),
('user1', 'user@example.com',  '$2b$10$RCUTrj1ZVG3F38B6ubPE0euSLO5vROu/XVvOJD1kz9a4gFi7WTz3y', 'user');

-- Insert Test Components
INSERT INTO components (name, category, quantity) VALUES
('Arduino Uno', 'main board', 10),
('HC-SR04', 'sensor', 25),
('220 Ohm Resistor', 'resistor', 500);

-- Insert Test Checkout Requests
INSERT INTO checkouts (user_id, component_id, quantity, status) VALUES
(2, 1, 2, 'requested'),
(2, 3, 10, 'approved');