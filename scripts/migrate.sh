#!/bin/bash
echo "========================================="
echo "SYNAP - EJECUTANDO MIGRACIONES"
echo "Autor: Luis Mario Dure Nunez LMTN"
echo "========================================="

docker-compose -f ~/synap/docker/docker-compose.yml up -d
sleep 3
echo "Ejecutando migracion 001..."
PGPASSWORD=synap_secure_2025 psql -h localhost -U synap_admin -d synap_db -f ~/synap/database/migrations/001_synap_core.sql
echo "Migracion completada."
echo "SYNAP - Base de datos lista."
