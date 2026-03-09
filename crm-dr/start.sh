#!/bin/bash
set -e

echo "🔨 Instalando dependencias del backend..."
cd backend
npm install --omit=dev
cd ..

echo "🚀 Iniciando servidor..."
node backend/server.js
