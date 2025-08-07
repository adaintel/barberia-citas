import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key')

# Configuración de la aplicación
app.config.update({
    'DATABASE_URL': os.getenv('DATABASE_URL'),
    'ADMIN_USER': os.getenv('ADMIN_USER'),
    'ADMIN_PASS': os.getenv('ADMIN_PASS'),
    'TEMPLATES_AUTO_RELOAD': True
})

# Configuración del pool de conexiones
connection_pool = None

def init_db():
    global connection_pool
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=app.config['DATABASE_URL']
    )

def get_db_connection():
    if not connection_pool:
        init_db()
    return connection_pool.getconn()

def close_db_connection(conn):
    if connection_pool and conn:
        connection_pool.putconn(conn)

# Nueva forma de inicialización en Flask 2.3+
with app.app_context():
    init_db()
    # También puedes crear tablas aquí si es necesario
    # create_tables()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/agenda')
def agenda():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener citas
        cur.execute("""
            SELECT c.id, c.fecha, c.hora, u.nombre as cliente, s.nombre as servicio 
            FROM citas c
            JOIN usuarios u ON c.cliente_id = u.id
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.fecha >= %s
            ORDER BY c.fecha, c.hora
        """, (datetime.now().date(),))
        
        citas = cur.fetchall()
        
        # Obtener servicios
        cur.execute("SELECT id, nombre, duracion, precio FROM servicios")
        servicios = cur.fetchall()
        
        cur.close()
        return render_template('agenda.html', citas=citas, servicios=servicios)
        
    except Exception as e:
        print(f"Error: {e}")
        flash("Error al cargar la agenda", "danger")
        return render_template('agenda.html')
    finally:
        if 'conn' in locals():
            close_db_connection(conn)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == app.config['ADMIN_USER'] and password == app.config['ADMIN_PASS']:
            session['admin'] = True
            flash("Inicio de sesión exitoso", "success")
            return redirect(url_for('index'))
        
        flash("Credenciales incorrectas", "danger")
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin', None)
    flash("Has cerrado sesión", "info")
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)

