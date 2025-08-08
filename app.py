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

    # Context processor mejorado
    @app.context_processor
    def inject_common_data():
        return {
            'now': datetime.now(),
            'servicios': app.config['SERVICIOS'],
            'is_authenticated': session.get('admin', False),
            'current_year': datetime.now().year  # Versión redundante para seguridad
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

    # Conexión a la base de datos
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
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS citas (
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
                logger.info("Tabla 'citas' verificada/creada exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error al inicializar DB: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    # Inicializar la base de datos al arrancar
    init_db()

    # Rutas de la aplicación
    @app.route('/')
    def index():
        try:
            return render_template('index.html')
        except Exception as e:
            logger.error(f"Error en ruta principal: {str(e)}")
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
            # ... (mantener el mismo código de creación de citas)
            pass
        
        return render_template('crear_cita.html', min_date=datetime.now().strftime('%Y-%m-%d'))

    # Rutas de autenticación (login/logout)
    # ... (mantener el mismo código de autenticación)

    # Manejador de errores robusto
    @app.errorhandler(404)
    def page_not_found(error):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Error 500: {str(error)}")
        try:
            return render_template('errors/500.html', now=datetime.now()), 500
        except:
            return "<h1>Error interno del servidor</h1>", 500

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)


