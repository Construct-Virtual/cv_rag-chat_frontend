-- Sample users for development and testing
-- Password for all users: "password123" (hashed with bcrypt)
-- Hash generated with: python -c "import bcrypt; print(bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode())"
-- In production, use strong passwords and hash them properly

-- Admin user
INSERT INTO sop_users (username, password_hash, full_name, email, role, is_active)
VALUES (
    'admin',
    '$2b$12$ZznR9BRwEAMLVNz.S7Y01OpO6K795aMocxhd4wn9u4fHaHdDHHHaa',
    'System Administrator',
    'admin@company.com',
    'admin',
    true
) ON CONFLICT (username) DO NOTHING;

-- HR Manager
INSERT INTO sop_users (username, password_hash, full_name, email, role, is_active)
VALUES (
    'hr_manager',
    '$2b$12$ZznR9BRwEAMLVNz.S7Y01OpO6K795aMocxhd4wn9u4fHaHdDHHHaa',
    'Jane Smith',
    'jane.smith@company.com',
    'hr',
    true
) ON CONFLICT (username) DO NOTHING;

-- Finance Manager
INSERT INTO sop_users (username, password_hash, full_name, email, role, is_active)
VALUES (
    'finance_manager',
    '$2b$12$ZznR9BRwEAMLVNz.S7Y01OpO6K795aMocxhd4wn9u4fHaHdDHHHaa',
    'John Doe',
    'john.doe@company.com',
    'finance',
    true
) ON CONFLICT (username) DO NOTHING;

-- Regular Employee
INSERT INTO sop_users (username, password_hash, full_name, email, role, is_active)
VALUES (
    'employee',
    '$2b$12$ZznR9BRwEAMLVNz.S7Y01OpO6K795aMocxhd4wn9u4fHaHdDHHHaa',
    'Alice Johnson',
    'alice.johnson@company.com',
    'employee',
    true
) ON CONFLICT (username) DO NOTHING;

-- Manager
INSERT INTO sop_users (username, password_hash, full_name, email, role, is_active)
VALUES (
    'manager',
    '$2b$12$ZznR9BRwEAMLVNz.S7Y01OpO6K795aMocxhd4wn9u4fHaHdDHHHaa',
    'Bob Williams',
    'bob.williams@company.com',
    'manager',
    true
) ON CONFLICT (username) DO NOTHING;

-- NOTE: In production:
-- 1. Use strong, unique passwords
-- 2. Hash passwords using bcrypt with appropriate work factor
-- 3. Use python: from passlib.hash import bcrypt; bcrypt.hash("your_password")
-- 4. Never commit real passwords to version control
