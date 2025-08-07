import os
from flask import Flask, render_template, request, redirect, url_for
import psycopg2  # Nuevo: para PostgreSQL
from psycopg2 import sql

app = Flask(__name__)

# Configuración PostgreSQL (Render automáticamente inyecta DATABASE_URL)
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

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/agendar', methods=['POST'])
def agendar():
    if request.method == 'POST':
        nombre = request.form['nombre']
        telefono = request.form['telefono']
        servicio = request.form['servicio']
        fecha = request.form['fecha']
        hora = request.form['hora']

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            '''INSERT INTO citas (nombre, telefono, servicio, fecha, hora) 
               VALUES (%s, %s, %s, %s, %s)''',
            (nombre, telefono, servicio, fecha, hora)
        )
        conn.commit()
        cur.close()
        conn.close()

        return redirect(url_for('home'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)

