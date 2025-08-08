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
        MAX_DIAS_CITA=30,
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

    def login_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('admin'):
                flash("Debe iniciar sesión para acceder a esta página", "warning")
                return redirect(url_for('login', next=request.url))
            return f(*args, **kwargs)
        return decorated_function

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

    if not init_db():
        logger.error("No se pudo inicializar la base de datos")

    @app.route('/agenda')
    def agenda():
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                flash("Error de conexión con la base de datos", "danger")
                return render_template('agenda.html', citas=[])
            
            with conn.cursor() as cur:
                # CONSULTA CORREGIDA (¡Añade ::date y ::time!)
                cur.execute("""
                    SELECT 
                        id,
                        to_char(fecha::date, 'DD/MM/YYYY') as fecha_formateada,
                        to_char(hora::time, 'HH24:MI') as hora_formateada,
                        nombre_cliente,
                        servicio,
                        COALESCE(NULLIF(telefono, ''), '-') as telefono
                    FROM citas
                    WHERE estado = 'pendiente'
                    ORDER BY fecha, hora
                """)
                
                column_names = [desc[0] for desc in cur.description]
                citas = [dict(zip(column_names, row)) for row in cur.fetchall()]
                
                if not citas:
                    flash("No hay citas pendientes", "info")
                
                return render_template('agenda.html', citas=citas)
                
        except psycopg2.Error as e:
            logger.error(f"Error de base de datos en agenda: {str(e)}")
            flash("Error técnico al cargar la agenda desde la base de datos", "danger")
            return render_template('agenda.html', citas=[])
            
        finally:
            if conn:
                conn.close()

    # ... (resto de rutas se mantienen igual)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)


