#!/bin/bash

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variables para migraciones
export FLASK_APP=run.py
export FLASK_ENV=production

# Inicializar y aplicar migraciones
if [ ! -d "migrations" ]; then
    echo "--- Inicializando migraciones ---"
    flask db init
fi

echo "--- Creando migración ---"
flask db migrate -m "Migración inicial"

echo "--- Aplicando migraciones ---"
flask db upgrade

echo "--- Instalación completada ---"
