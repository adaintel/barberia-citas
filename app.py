import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time, timedelta
import psycopg2
from dotenv import load_dotenv
import traceback
from functools import wraps
from urllib.parse import urlparse
import time as time_module

# Configuración inicial
load_dotenv()

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
    app = Flask(__name__, static_folder='static')
    
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
        ],
        HORARIO_APERTURA=time(9, 0),  # 9:00 AM
        HORARIO_CIERRE=time(18, 0),    # 6:00 PM
        MAX_DIAS_CITA=30,  # Máximo días para agendar citas
        DB_CONNECTION_RETRIES=3,
        DB_CONNECTION_DELAY=1
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

    # Context processor mejorado
    @app.context_processor
    def inject_common_data():
        return {
            'now': datetime.now(),
            'current_year': datetime.now().year,
            'servicios': app.config['SERVICIOS'],
            'is_authenticated': session.get('admin', False),
            'horario_apertura': app.config['HORARIO_APERTURA'].strftime('%H:%M'),
            'horario_cierre': app.config['HORARIO_CIERRE'].strftime('%H:%M')
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

    # Conexión a la base de datos con reintentos
    def get_db_connection():
        for attempt in range(app.config['DB_CONNECTION_RETRIES']):
            try:
                conn = psycopg2.connect(**app.config['DB_CONFIG'])
                logger.info("Conexión a DB establecida correctamente")
                return conn
            except psycopg2.OperationalError as e:
                logger.warning(f"Intento {attempt + 1} de conexión fallido: {str(e)}")
                if attempt < app.config['DB_CONNECTION_RETRIES'] - 1:
                    time_module.sleep(app.config['DB_CONNECTION_DELAY'])
                    continue
                logger.error("No se pudo establecer conexión después de varios intentos")
                return None
            except Exception as e:
                logger.error(f"Error inesperado en conexión a DB: {str(e)}")
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
                    CREATE TABLE IF NOT EXISTS citas (
                        id SERIAL PRIMARY KEY,
                        fecha DATE NOT NULL,
                        hora TIME NOT NULL,
                        nombre_cliente VARCHAR(100) NOT NULL,
                        servicio VARCHAR(100) NOT NULL,
                        telefono VARCHAR(20),
                        estado VARCHAR(20) DEFAULT 'pendiente',
                        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT cita_unica UNIQUE (fecha, hora, estado)
                    )
                """)
                conn.commit()
                logger.info("Tabla 'citas' verificada/creada exitosamente")
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
        try:
            return render_template('index.html')
        except Exception as e:
            logger.error(f"Error en ruta principal: {str(e)}")
            return """
            <!DOCTYPE html>
            <html>
            <head><title>Barbería Master</title>
                <link rel="stylesheet" href="/static/css/styles.css">
            </head>
            <body class="bg-light">
                <div class="container py-5">
                    <h1 class="text-center">Bienvenido a Barbería Master</h1>
                    <p class="text-center">Sistema de gestión de citas</p>
                    <div class="text-center mt-4">
                        <a href="/agenda" class="btn btn-primary">Ver Agenda</a>
                    </div>
                </div>
            </body>
            </html>
            """

    @app.route('/agenda')
    def agenda():
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                flash("Error de conexión con la base de datos", "danger")
                return render_template('agenda.html', citas=[])
            
            with conn.cursor() as cur:
                # Consulta mejorada con formateo de fechas y horas
                cur.execute("""
                    SELECT 
                        id,
                        to_char(fecha, 'DD/MM/YYYY') as fecha_formateada,
                        to_char(hora, 'HH24:MI') as hora_formateada,
                        nombre_cliente,
                        servicio,
                        CASE WHEN telefono IS NULL OR telefono = '' THEN '-' ELSE telefono END as telefono
                    FROM citas
                    WHERE estado = 'pendiente'
                    ORDER BY fecha, hora
                """)
                
                # Obtener resultados como lista de diccionarios
                column_names = [desc[0] for desc in cur.description]
                citas = [dict(zip(column_names, row)) for row in cur.fetchall()]
                
                if not citas:
                    flash("No hay citas pendientes", "info")
                
                return render_template('agenda.html', citas=citas)
                
        except psycopg2.Error as e:
            logger.error(f"Error de base de datos en agenda: {str(e)}")
            flash("Error técnico al cargar la agenda desde la base de datos", "danger")
            return render_template('agenda.html', citas=[])
            
        except Exception as e:
            logger.error(f"Error inesperado en agenda: {str(e)}")
            flash("Error inesperado al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[])
            
        finally:
            if conn:
                conn.close()

    @app.route('/crear_cita', methods=['GET', 'POST'])
    @login_required
    def crear_cita():
        if request.method == 'POST':
            try:
                # Obtener datos del formulario
                fecha = request.form.get('fecha')
                hora = request.form.get('hora')
                nombre_cliente = request.form.get('nombre_cliente', '').strip()
                servicio = request.form.get('servicio')
                telefono = request.form.get('telefono', '').strip()

                # Validaciones básicas
                if not all([fecha, hora, nombre_cliente, servicio]):
                    flash("Todos los campos excepto teléfono son requeridos", "danger")
                    return redirect(url_for('crear_cita'))

                # Validar formato de hora
                try:
                    hora_obj = datetime.strptime(hora, '%H:%M').time()
                    if hora_obj < app.config['HORARIO_APERTURA'] or hora_obj > app.config['HORARIO_CIERRE']:
                        flash(f"El horario de atención es de {app.config['HORARIO_APERTURA'].strftime('%H:%M')} a {app.config['HORARIO_CIERRE'].strftime('%H:%M')}", "danger")
                        return redirect(url_for('crear_cita'))
                except ValueError:
                    flash("Formato de hora incorrecto (use HH:MM)", "danger")
                    return redirect(url_for('crear_cita'))

                # Validar fecha no pasada
                try:
                    fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
                    if fecha_obj < datetime.now().date():
                        flash("No se pueden agendar citas en fechas pasadas", "danger")
                        return redirect(url_for('crear_cita'))
                except ValueError:
                    flash("Formato de fecha incorrecto", "danger")
                    return redirect(url_for('crear_cita'))

                conn = get_db_connection()
                if not conn:
                    flash("Error de conexión con la base de datos", "danger")
                    return redirect(url_for('crear_cita'))

                try:
                    with conn.cursor() as cur:
                        # Verificar disponibilidad con bloqueo
                        cur.execute("""
                            SELECT id FROM citas 
                            WHERE fecha = %s AND hora = %s AND estado = 'pendiente'
                            FOR UPDATE
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
                        logger.info(f"Cita #{cita_id} creada para {nombre_cliente} el {fecha} a las {hora}")
                        return redirect(url_for('agenda'))

                except psycopg2.Error as e:
                    conn.rollback()
                    logger.error(f"Error de base de datos al crear cita: {str(e)}")
                    flash("Error técnico al guardar la cita en la base de datos", "danger")
                    return redirect(url_for('crear_cita'))
                    
                except Exception as e:
                    conn.rollback()
                    logger.error(f"Error inesperado al crear cita: {str(e)}")
                    flash("Error inesperado al procesar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                    
                finally:
                    if conn:
                        conn.close()
                        
            except Exception as e:
                logger.error(f"Error general en crear_cita: {str(e)}")
                flash("Ocurrió un error al procesar su solicitud", "danger")
                return redirect(url_for('crear_cita'))

        # GET request - mostrar formulario
        max_date = (datetime.now() + timedelta(days=app.config['MAX_DIAS_CITA'])).strftime('%Y-%m-%d')
        return render_template('crear_cita.html', 
                            min_date=datetime.now().strftime('%Y-%m-%d'),
                            max_date=max_date)

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

    # Manejador de errores robusto
    @app.errorhandler(404)
    def page_not_found(error):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Error 500: {str(error)}")
        try:
            return render_template('errors/500.html'), 500
        except:
            return """
            <!DOCTYPE html>
            <html>
            <head><title>Error 500</title>
                <link rel="stylesheet" href="/static/css/styles.css">
            </head>
            <body class="bg-light">
                <div class="container py-5">
                    <h1 class="text-center text-danger">Error en el servidor</h1>
                    <p class="text-center">Estamos experimentando problemas técnicos. Por favor intente más tarde.</p>
                    <div class="text-center mt-4">
                        <a href="/" class="btn btn-primary">Volver al inicio</a>
                    </div>
                </div>
            </body>
            </html>
            """, 500

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)


