import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'la sabana de caripito')

    # Configuración
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin_pro')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'Cl4v3-S3gur4!')
    
    # Pool de conexiones mejorado
    connection_pool = None

    def init_db():
        nonlocal connection_pool
        try:
            db_url = os.getenv('DATABASE_URL') or \
                    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME')}"
            
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=db_url
            )
            
            # Verificar tablas existentes
            conn = connection_pool.getconn()
            cur = conn.cursor()
            
            # Crear tablas si no existen
            cur.execute("""
                CREATE TABLE IF NOT EXISTS servicios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    duracion INTEGER NOT NULL,
                    precio DECIMAL(10,2) NOT NULL
                )
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    telefono VARCHAR(20)
                )
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS citas (
                    id SERIAL PRIMARY KEY,
                    fecha DATE NOT NULL,
                    hora TIME NOT NULL,
                    cliente_id INTEGER REFERENCES usuarios(id),
                    servicio_id INTEGER REFERENCES servicios(id),
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            connection_pool.putconn(conn)
            
            print("✅ Base de datos y tablas verificadas/creadas correctamente")
            return True
            
        except Exception as e:
            print(f"❌ Error al inicializar la base de datos: {e}")
            connection_pool = None
            return False

    def get_db_connection():
        if not connection_pool and not init_db():
            return None
            
        try:
            return connection_pool.getconn()
        except Exception as e:
            print(f"❌ Error al obtener conexión: {e}")
            return None

    def close_db_connection(conn):
        if connection_pool and conn:
            try:
                connection_pool.putconn(conn)
            except Exception as e:
                print(f"⚠️ Error al cerrar conexión: {e}")

    # Context processor
    @app.context_processor
    def inject_now():
        return {'now': datetime.now()}

    # Ruta principal
    @app.route('/')
    def index():
        return render_template('index.html')

    # Ruta de agenda mejorada
    @app.route('/agenda')
    def agenda():
        conn = get_db_connection()
        if not conn:
            flash("Error de conexión con la base de datos", "danger")
            return render_template('agenda.html', citas=[], servicios=[])
        
        try:
            cur = conn.cursor()
            
            # Consulta más robusta con manejo de errores
            try:
                cur.execute("""
                    SELECT c.id, c.fecha, c.hora, u.nombre as cliente, s.nombre as servicio 
                    FROM citas c
                    LEFT JOIN usuarios u ON c.cliente_id = u.id
                    LEFT JOIN servicios s ON c.servicio_id = s.id
                    WHERE c.fecha >= %s
                    ORDER BY c.fecha, c.hora
                """, (datetime.now().date(),))
                citas = cur.fetchall()
            except psycopg2.Error as e:
                print(f"⚠️ Error al obtener citas: {e}")
                citas = []
            
            # Obtener servicios
            try:
                cur.execute("SELECT id, nombre, duracion, precio FROM servicios")
                servicios = cur.fetchall()
            except psycopg2.Error as e:
                print(f"⚠️ Error al obtener servicios: {e}")
                servicios = []
            
            return render_template('agenda.html', citas=citas or [], servicios=servicios or [])
            
        except Exception as e:
            print(f"❌ Error general en agenda: {e}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[], servicios=[])
        finally:
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
