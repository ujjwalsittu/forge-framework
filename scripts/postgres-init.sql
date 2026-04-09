-- Forge Control Plane Database
-- Created by forge-setup

CREATE DATABASE forge_control;

-- Create forge user with permission to create tenant databases
ALTER USER forge CREATEDB;

-- Control plane tables will be created by @forge/core on first run
