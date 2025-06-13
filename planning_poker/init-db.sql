-- Initialize the planning_poker database
-- This file will be executed when the container starts for the first time

-- Create the database (this might already be created by POSTGRES_DB env var)
-- CREATE DATABASE planning_poker_db;

-- You can add any additional initialization SQL here
-- For example, creating extensions, initial data, etc.

-- Create a test connection
SELECT 'Database planning_poker_db initialized successfully' as status;