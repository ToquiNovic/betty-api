-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable TimescaleDB extension if available
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create default database if needed
-- Betty IoT Database Initializer
