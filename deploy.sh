#!/bin/bash
echo "========================================"
echo "SYNAP - DESPLIEGUE A PRODUCCION"
echo "Autor: Luis Mario Taboada Nunez LMTN"
echo "========================================"

echo "1. Construyendo backend..."
cd ~/synap/server
npm install
npx tsc

if [ $? -ne 0 ]; then
    echo "ERROR: Fallo la construccion del backend"
    exit 1
fi
echo "Backend construido exitosamente."

echo ""
echo "2. Construyendo frontend..."
cd ~/synap/client/web
npm install
npx vite build

if [ $? -ne 0 ]; then
    echo "ERROR: Fallo la construccion del frontend"
    exit 1
fi
echo "Frontend construido exitosamente."

echo ""
echo "3. Preparando archivos para despliegue..."
cd ~/synap
mkdir -p deploy
cp -r server/dist deploy/
cp -r server/package.json deploy/
cp -r server/node_modules deploy/
cp -r server/.env.production deploy/.env
cp -r client/web/dist deploy/frontend
cp -r database deploy/
cp Dockerfile.backend deploy/

echo ""
echo "========================================"
echo "DESPLIEGUE PREPARADO"
echo "========================================"
echo ""
echo "Archivos listos en: ~/synap/deploy/"
echo ""
echo "PARA SUBIR A RENDER:"
echo "1. Crear cuenta en https://render.com"
echo "2. Conectar repositorio Git"
echo "3. Usar render.yaml para configuracion automatica"
echo ""
echo "PARA SUBIR A NETLIFY:"
echo "1. Crear cuenta en https://netlify.com"
echo "2. Arrastrar carpeta: ~/synap/client/web/dist"
echo "========================================"
