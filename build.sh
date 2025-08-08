#!/bin/bash
# Instalar dependencias y aplicar migraciones de la base de datos

echo "--- Instalando dependencias ---"
pip install -r requirements.txt

echo "--- Aplicando migraciones de la base de datos ---"
flask db upgrade

echo "--- Build completado ---"
