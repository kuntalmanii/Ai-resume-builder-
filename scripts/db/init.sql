-- init.sql: Create database and configure settings if needed.
SELECT 'CREATE DATABASE careeros'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'careeros')\gexec
