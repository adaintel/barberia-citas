import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from datetime import datetime, time
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
    
    # Pool de conexiones
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
            
            # Verificar y crear tablas si no existen
            conn = connection_pool.getconn()
            cur = conn.cursor()
            
            # Tabla de servicios
            cur.execute("""
                CREATE TABLE IF NOT EXISTS servicios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    duracion INTEGER NOT NULL,
                    precio DECIMAL(10,2) NOT NULL
                )
            """)
            
            # Tabla de clientes
            cur.execute("""
                CREATE TABLE IF NOT EXISTS clientes (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    telefono VARCHAR(20) NOT NULL,
                    email VARCHAR(100)
                )
            """)
            
            # Tabla de citas
            cur.execute("""
                CREATE TABLE IF NOT EXISTS citas (
                    id SERIAL PRIMARY KEY,
                    fecha DATE NOT NULL,
                    hora TIME NOT NULL,
                    cliente_id INTEGER REFERENCES clientes(id),
                    servicio_id INTEGER REFERENCES servicios(id),
                    estado VARCHAR(20) DEFAULT 'pendiente',
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Insertar servicios básicos si la tabla está vacía
            cur.execute("SELECT COUNT(*) FROM servicios")
            if cur.fetchone()[0] == 0:
                servicios_base = [
                    ('Corte de caballero', 30, 150.00),
                    ('Corte de niño', 20, 100.00),
                    ('Afeitado clásico', 25, 120.00),
                    ('Tinte de barba', 40, 200.00)
                ]
                for servicio in servicios_base:
                    cur.execute(
                        "INSERT INTO servicios (nombre, duracion, precio) VALUES (%s, %s, %s)",
                        servicio
                    )
            
            conn.commit()
            connection_pool.putconn(conn)
            
            print("✅ Base de datos inicializada correctamente")
            return True
            
        except Exception as e:
            print(f"❌ Error al inicializar DB: {e}")
            connection_pool = None
            return False

    def get_db_connection():
        if not connection_pool and not init_db():
            return None
        try:
            return connection_pool.getconn()
        except:
            return None

    def close_db_connection(conn):
        if connection_pool and conn:
            try:
                connection_pool.putconn(conn)
            except:
                pass

    # Context processor
    @app.context_processor
    def inject_now():
        return {'now': datetime.now()}

    # Rutas
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        conn = get_db_connection()
        if not conn:
            flash("Error de conexión con la base de datos", "danger")
            return render_template('agenda.html', citas=[], servicios=[])
        
        try:
            cur = conn.cursor()
            
            # Obtener citas
            cur.execute("""
                SELECT c.id, c.fecha, c.hora, cl.nombre as cliente, s.nombre as servicio 
                FROM citas c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                LEFT JOIN servicios s ON c.servicio_id = s.id
                WHERE c.fecha >= %s AND c.estado = 'pendiente'
                ORDER BY c.fecha, c.hora
            """, (datetime.now().date(),))
            citas = cur.fetchall()
            
            # Obtener servicios disponibles
            cur.execute("SELECT id, nombre, precio FROM servicios")
            servicios = cur.fetchall()
            
            return render_template('agenda.html', citas=citas, servicios=servicios)
            
        except Exception as e:
            print(f"Error en agenda: {e}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[], servicios=[])
        finally:
            if conn:
                close_db_connection(conn)

    @app.route('/crear_cita', methods=['GET', 'POST'])
    def crear_cita():
        if not session.get('admin'):
            return redirect(url_for('login'))
        
        conn = get_db_connection()
        if not conn:
            flash("Error de conexión con la base de datos", "danger")
            return redirect(url_for('agenda'))
        
        try:
            cur = conn.cursor()
            
            if request.method == 'POST':
                # Validar datos del formulario
                fecha = request.form.get('fecha')
                hora = request.form.get('hora')
                cliente_id = request.form.get('cliente_id')
                servicio_id = request.form.get('servicio_id')
                
                if not all([fecha, hora, cliente_id, servicio_id]):
                    flash("Todos los campos son requeridos", "danger")
                    return redirect(url_for('crear_cita'))
                
                # Verificar disponibilidad
                cur.execute("""
                    SELECT id FROM citas 
                    WHERE fecha = %s AND hora = %s AND estado = 'pendiente'
                """, (fecha, hora))
                if cur.fetchone():
                    flash("Ya existe una cita programada para esa fecha y hora", "danger")
                    return redirect(url_for('crear_cita'))
                
                # Crear cita
                cur.execute("""
                    INSERT INTO citas (fecha, hora, cliente_id, servicio_id)
                    VALUES (%s, %s, %s, %s)
                """, (fecha, hora, cliente_id, servicio_id))
                conn.commit()
                
                flash("Cita creada exitosamente", "success")
                return redirect(url_for('agenda'))
            
            # Obtener datos para el formulario
            cur.execute("SELECT id, nombre FROM clientes ORDER BY nombre")
            clientes = cur.fetchall()
            
            cur.execute("SELECT id, nombre FROM servicios ORDER BY nombre")
            servicios = cur.fetchall()
            
            return render_template('crear_cita.html', 
                                clientes=clientes, 
                                servicios=servicios,
                                min_date=datetime.now().strftime('%Y-%m-%d'))
            
        except Exception as e:
            print(f"Error al crear cita: {e}")
            flash("Error al procesar la solicitud", "danger")
            return redirect(url_for('agenda'))
        finally:
            if conn:
                close_db_connection(conn)

    @app.route('/api/clientes')
    def get_clientes():
        conn = get_db_connection()
        if not conn:
            return jsonify([])
        
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, nombre, telefono FROM clientes ORDER BY nombre")
            clientes = [{'id': row[0], 'nombre': row[1], 'telefono': row[2]} for row in cur.fetchall()]
            return jsonify(clientes)
        except:
            return jsonify([])
        finally:
            if conn:
                close_db_connection(conn)

    @app.route('/api/servicios')
    def get_servicios():
        conn = get_db_connection()
        if not conn:
            return jsonify([])
        
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, nombre, precio FROM servicios ORDER BY nombre")
            servicios = [{'id': row[0], 'nombre': row[1], 'precio': row[2]} for row in cur.fetchall()]
            return jsonify(servicios)
        except:
            return jsonify([])
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

