#!/bin/bash
echo "========================================"
echo "SYNAP - INICIANDO EN MODO DESARROLLO"
echo "Autor: Luis Mario Taboada Nunez LMTN"
echo "========================================"

echo "Iniciando base de datos..."
docker-compose -f ~/synap/docker/docker-compose.yml up -d
sleep 3

echo "Ejecutando migraciones..."
PGPASSWORD=synap_secure_2025 psql -h localhost -U synap_admin -d synap_db -f ~/synap/database/migrations/001_synap_core.sql 2>/dev/null

echo "Iniciando backend..."
cd ~/synap/server
npm run dev &
BACKEND_PID=$!

echo "Iniciando frontend..."
cd ~/synap/client/web
npm run dev &
FRONTEND_PID=$!

echo ""
echo "SYNAP iniciado:"
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:5173"
echo "  Usuario:  admin"
echo "  Password: admin123"
echo ""
echo "Presiona Ctrl+C para detener"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose -f ~/synap/docker/docker-compose.yml down; echo 'SYNAP detenido'" EXIT
wait
