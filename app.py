import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from dotenv import load_dotenv
import time
import logging
from logging.handlers import RotatingFileHandler

# Configuración básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'secret-key-123456')
    
    # Configuración de la aplicación
    app.config.update(
        ADMIN_USER=os.getenv('ADMIN_USER', 'admin'),
        ADMIN_PASS=os.getenv('ADMIN_PASS', 'admin123'),
        DB_CONFIG={
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': os.getenv('DB_PORT', '5432')
        },
        SERVICIOS=[
            ('Corte de caballero', 150.00),
            ('Corte de niño', 100.00),
            ('Afeitado clásico', 120.00),
            ('Tinte de barba', 200.00)
        ]
    )

    # Context processor para variables comunes
    @app.context_processor
    def inject_common_data():
        return {
            'now': datetime.now(),
            'servicios': app.config['SERVICIOS']
        }

    # Manejo de errores
    @app.errorhandler(404)
    def page_not_found(error):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Error 500: {str(error)}")
        return render_template('500.html'), 500

    # Conexión a la base de datos
    def get_db_connection():
        try:
            conn = psycopg2.connect(**app.config['DB_CONFIG'])
            return conn
        except Exception as e:
            logger.error(f"Error de conexión a DB: {str(e)}")
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
                return True
        except Exception as e:
            logger.error(f"Error al inicializar DB: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    # Inicializar la base de datos
    init_db()

    # Rutas de la aplicación
    @app.route('/')
    def index():
        try:
            return render_template('index.html')
        except Exception as e:
            logger.error(f"Error en ruta /: {str(e)}")
            flash("Error al cargar la página principal", "danger")
            return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        conn = get_db_connection()
        if not conn:
            flash("Error de conexión con la base de datos", "danger")
            return render_template('agenda.html', citas=[])
        
        try:
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
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[])
        finally:
            if conn:
                conn.close()

    @app.route('/crear_cita', methods=['GET', 'POST'])
    def crear_cita():
        if not session.get('admin'):
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            # ... (mantener el mismo código de creación de cita)
            pass
        
        return render_template('crear_cita.html', min_date=datetime.now().strftime('%Y-%m-%d'))

    # Añadiendo la ruta login que faltaba
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '').strip()
            
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

