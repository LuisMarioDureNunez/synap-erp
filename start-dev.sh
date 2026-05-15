#!/bin/bash
echo "========================================"
echo "SYNAP - INICIANDO EN MODO DESARROLLO"
echo "Autor: Luis Mario Taboada Nunez LMTN"
echo "========================================"

echo "Iniciando PostgreSQL..."
sudo service postgresql start 2>/dev/null || echo "PostgreSQL ya esta corriendo o usa Docker"

echo "Ejecutando migraciones..."
PGPASSWORD=synap_secure_2025 psql -h localhost -U synap_admin -d synap_db -f ~/synap/database/migrations/001_synap_core.sql 2>/dev/null || echo "Migracion ya ejecutada o BD no disponible"

echo ""
echo "Iniciando backend..."
cd ~/synap/server
npx ts-node src/server.ts &
BACKEND_PID=$!

echo "Iniciando frontend..."
cd ~/synap/client/web
npx vite --host &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "SYNAP iniciado:"
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:5173"
echo "  Usuario:  admin"
echo "  Password: admin123"
echo "========================================"
echo ""
echo "Presiona Ctrl+C para detener"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'SYNAP detenido'" EXIT
wait
