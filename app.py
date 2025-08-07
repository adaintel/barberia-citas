import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
from urllib.parse import urlparse

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key')

    # Configuración
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS')
    
    # Pool de conexiones
    connection_pool = None

    def parse_db_url(db_url):
        """Parsear la URL de la base de datos para componentes individuales"""
        try:
            parsed = urlparse(db_url)
            return {
                'dbname': parsed.path[1:],
                'user': parsed.username,
                'password': parsed.password,
                'host': parsed.hostname,
                'port': parsed.port or 5432  # Puerto por defecto de PostgreSQL
            }
        except Exception as e:
            print(f"Error al parsear DATABASE_URL: {e}")
            raise

    def init_db():
        nonlocal connection_pool
        try:
            db_url = os.getenv('DATABASE_URL')
            if not db_url:
                raise ValueError("DATABASE_URL no está configurada")
                
            # Parsear la URL de la base de datos
            db_params = parse_db_url(db_url)
            
            # Crear pool de conexiones con parámetros individuales
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                **db_params
            )
            print("✅ Conexión a la base de datos establecida correctamente")
        except Exception as e:
            print(f"❌ Error al conectar a la base de datos: {e}")
            raise

    def get_db_connection():
        if not connection_pool:
            init_db()
        return connection_pool.getconn()

    def close_db_connection(conn):
        if connection_pool and conn:
            connection_pool.putconn(conn)

    # Verificar conexión a la base de datos al iniciar
    try:
        init_db()
    except Exception as e:
        print(f"Error inicializando la base de datos: {e}")

    # Rutas
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                SELECT c.id, c.fecha, c.hora, u.nombre as cliente, s.nombre as servicio 
                FROM citas c
                JOIN usuarios u ON c.cliente_id = u.id
                JOIN servicios s ON c.servicio_id = s.id
                WHERE c.fecha >= %s
                ORDER BY c.fecha, c.hora
            """, (datetime.now().date(),))
            
            citas = cur.fetchall()
            
            cur.execute("SELECT id, nombre, duracion, precio FROM servicios")
            servicios = cur.fetchall()
            
            return render_template('agenda.html', citas=citas, servicios=servicios)
            
        except Exception as e:
            print(f"Error en agenda: {e}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html')
        finally:
            if conn:
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

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
