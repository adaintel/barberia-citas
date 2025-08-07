import os
from flask import Flask, render_template, request, redirect, url_for
import psycopg2
from psycopg2 import sql

app = Flask(__name__)

# Conexión a TU base de datos específica
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    return conn

def create_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS citas (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            telefono TEXT NOT NULL,
            servicio TEXT NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

create_table()

# [Mantén tus rutas @app.route existentes...]

# ... (el resto de tu código existente)

@app.route('/agendar', methods=['POST'])
def agendar():
    # ... (tu código existente de agendar)

# ▼▼▼ AÑADE ESTA NUEVA RUTA AQUÍ ▼▼▼
@app.route('/test-db')
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT 1')
        conn.close()
        return "¡Conexión a PostgreSQL exitosa!"
    except Exception as e:
        return f"Error: {str(e)}"
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)




