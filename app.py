import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from dotenv import load_dotenv
import traceback
from functools import wraps
from urllib.parse import urlparse

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurar handler para archivos de log
file_handler = RotatingFileHandler(
    'app.log',
    maxBytes=1024 * 1024,
    backupCount=3
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
logger.addHandler(file_handler)

def create_app():
    app = Flask(__name__)
    
    # Configuración desde variables de entorno
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev-secret-key-123'),
        ADMIN_USER=os.getenv('ADMIN_USER'),
        ADMIN_PASS=os.getenv('ADMIN_PASS'),
        SERVICIOS=[
            ('Corte de caballero', 150.00),
            ('Corte de niño', 100.00),
            ('Afeitado clásico', 120.00),
            ('Tinte de barba', 200.00)
        ]
    )

    # Parsear DATABASE_URL si existe
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        db_params = urlparse(database_url)
        app.config['DB_CONFIG'] = {
            'host': db_params.hostname,
            'database': db_params.path[1:],
            'user': db_params.username,
            'password': db_params.password,
            'port': db_params.port
        }
    else:
        app.config['DB_CONFIG'] = {
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': os.getenv('DB_PORT', '5432')
        }

    # Decorador para requerir autenticación
    def login_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('admin'):
                flash("Debe iniciar sesión para acceder a esta página", "warning")
                return redirect(url_for('login', next=request.url))
            return f(*args, **kwargs)
        return decorated_function

    # Conexión a la base de datos con manejo de errores mejorado
    def get_db_connection():
        try:
            conn = psycopg2.connect(**app.config['DB_CONFIG'])
            logger.info("Conexión a DB establecida correctamente")
            return conn
        except psycopg2.OperationalError as e:
            logger.error(f"Error de conexión a DB: {str(e)}")
            flash("Error de conexión con la base de datos. Intente nuevamente.", "danger")
            return None
        except Exception as e:
            logger.error(f"Error inesperado en conexión a DB: {str(e)}")
            flash("Error técnico inesperado", "danger")
            return None

    # Inicialización de la base de datos
    def init_db():
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                # Verificar si la tabla existe
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'citas'
                    )
                """)
                if not cur.fetchone()[0]:
                    # Crear tabla si no existe
                    cur.execute("""
                        CREATE TABLE citas (
                            id SERIAL PRIMARY KEY,
                            fecha DATE NOT NULL,
                            hora TIME NOT NULL,
                            nombre_cliente VARCHAR(100) NOT NULL,
                            servicio VARCHAR(100) NOT NULL,
                            telefono VARCHAR(20),
                            estado VARCHAR(20) DEFAULT 'pendiente',
                            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    conn.commit()
                    logger.info("Tabla 'citas' creada exitosamente")
            
            return True
        except Exception as e:
            logger.error(f"Error al inicializar DB: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    # Inicializar la base de datos al arrancar
    if not init_db():
        logger.error("No se pudo inicializar la base de datos")

    # Rutas de la aplicación
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                return render_template('agenda.html', citas=[])
            
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, fecha, hora, nombre_cliente, servicio, telefono
                    FROM citas 
                    WHERE estado = 'pendiente'
                    ORDER BY fecha, hora
                """)
                citas = cur.fetchall()
                
                if not citas:
                    flash("No hay citas pendientes", "info")
                
                return render_template('agenda.html', citas=citas)
        except Exception as e:
            logger.error(f"Error en agenda: {str(e)}")
            flash("Error técnico al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[])
        finally:
            if conn:
                conn.close()

    @app.route('/crear_cita', methods=['GET', 'POST'])
    @login_required
    def crear_cita():
        if request.method == 'POST':
            fecha = request.form.get('fecha')
            hora = request.form.get('hora')
            nombre_cliente = request.form.get('nombre_cliente', '').strip()
            servicio = request.form.get('servicio')
            telefono = request.form.get('telefono', '').strip()
            
            # Validaciones
            if not all([fecha, hora, nombre_cliente, servicio]):
                flash("Todos los campos excepto teléfono son requeridos", "danger")
                return redirect(url_for('crear_cita'))
            
            try:
                # Convertir y validar hora
                hora_obj = datetime.strptime(hora, '%H:%M').time()
                if hora_obj < time(9, 0) or hora_obj > time(18, 0):
                    flash("El horario de atención es de 9:00 AM a 6:00 PM", "danger")
                    return redirect(url_for('crear_cita'))
                
                conn = get_db_connection()
                if not conn:
                    return redirect(url_for('crear_cita'))
                
                try:
                    with conn.cursor() as cur:
                        # Verificar disponibilidad
                        cur.execute("""
                            SELECT id FROM citas 
                            WHERE fecha = %s AND hora = %s AND estado = 'pendiente'
                        """, (fecha, hora))
                        if cur.fetchone():
                            flash("Ya existe una cita programada para esa fecha y hora", "danger")
                            return redirect(url_for('crear_cita'))
                        
                        # Insertar cita
                        cur.execute("""
                            INSERT INTO citas (fecha, hora, nombre_cliente, servicio, telefono)
                            VALUES (%s, %s, %s, %s, %s)
                            RETURNING id
                        """, (fecha, hora, nombre_cliente, servicio, telefono))
                        cita_id = cur.fetchone()[0]
                        conn.commit()
                        
                        flash(f"Cita #{cita_id} creada exitosamente!", "success")
                        return redirect(url_for('agenda'))
                except Exception as e:
                    conn.rollback()
                    logger.error(f"Error al crear cita: {str(e)}")
                    flash("Error técnico al guardar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                finally:
                    conn.close()
            except ValueError:
                flash("Formato de hora incorrecto (use HH:MM)", "danger")
                return redirect(url_for('crear_cita'))
        
        return render_template('crear_cita.html', min_date=datetime.now().strftime('%Y-%m-%d'))

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '').strip()
            
            if username == app.config['ADMIN_USER'] and password == app.config['ADMIN_PASS']:
                session['admin'] = True
                flash("Inicio de sesión exitoso", "success")
                next_page = request.args.get('next') or url_for('agenda')
                return redirect(next_page)
            
            flash("Credenciales incorrectas", "danger")
        
        return render_template('auth/login.html')

    @app.route('/logout')
    def logout():
        session.pop('admin', None)
        flash("Has cerrado sesión", "info")
        return redirect(url_for('index'))

    # Manejador de errores
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Error 500: {str(error)}")
        return render_template('errors/500.html'), 500

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)


