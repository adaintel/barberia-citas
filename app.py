import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from dotenv import load_dotenv
import traceback

# Configuración inicial de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuración básica
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev-key-123'),
        ADMIN_USER=os.getenv('ADMIN_USER', 'admin'),
        ADMIN_PASS=os.getenv('ADMIN_PASS', 'admin123'),
        SERVICIOS=[
            ('Corte de caballero', 150.00),
            ('Corte de niño', 100.00),
            ('Afeitado clásico', 120.00),
            ('Tinte de barba', 200.00)
        ],
        DB_CONFIG={
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': os.getenv('DB_PORT', '5432')
        }
    )

    # Inyectar variables comunes a todas las plantillas
    @app.context_processor
    def inject_common_data():
        return {
            'now': datetime.now(),
            'servicios': app.config['SERVICIOS']
        }

    # Manejo de errores global
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Error 500: {str(error)}\n{traceback.format_exc()}")
        return render_template('500.html'), 500

    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404

    # Conexión a la base de datos con reintentos
    def get_db_connection():
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                conn = psycopg2.connect(**app.config['DB_CONFIG'])
                logger.info("Conexión a DB establecida correctamente")
                return conn
            except psycopg2.OperationalError as e:
                logger.warning(f"Intento {attempt + 1} de conexión fallido: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                continue
            except Exception as e:
                logger.error(f"Error inesperado en conexión a DB: {str(e)}\n{traceback.format_exc()}")
                raise
        
        logger.error("No se pudo establecer conexión después de varios intentos")
        return None

    # Inicialización de la base de datos
    def init_db():
        try:
            conn = get_db_connection()
            if not conn:
                return False
            
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
            logger.error(f"Error al inicializar DB: {str(e)}\n{traceback.format_exc()}")
            return False
        finally:
            if conn:
                conn.close()

    # Inicializar la base de datos al arrancar
    init_db()

    # Rutas principales
    @app.route('/')
    def index():
        try:
            return render_template('index.html')
        except Exception as e:
            logger.error(f"Error en ruta /: {str(e)}\n{traceback.format_exc()}")
            flash("Error interno al cargar la página", "danger")
            return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        try:
            conn = get_db_connection()
            if not conn:
                flash("Error de conexión con la base de datos", "danger")
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
            logger.error(f"Error en agenda: {str(e)}\n{traceback.format_exc()}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[])
        finally:
            if conn:
                conn.close()

    # ... (resto de las rutas se mantienen igual pero con el mismo patrón de manejo de errores)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

