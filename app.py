import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import time

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'la sabana de caripito')
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin_pro')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'Cl4v3-S3gur4!')
    
    # Context processor para inyectar 'now' en todas las plantillas
    @app.context_processor
    def inject_now():
        return {'now': datetime.now()}

    # Configuración mejorada de conexión a DB
    def get_db_connection(retries=3, delay=2):
        for i in range(retries):
            try:
                conn = psycopg2.connect(
                    host=os.getenv('DB_HOST'),
                    database=os.getenv('DB_NAME'),
                    user=os.getenv('DB_USER'),
                    password=os.getenv('DB_PASSWORD'),
                    port=os.getenv('DB_PORT', '5432'),
                    connect_timeout=5
                )
                return conn
            except Exception as e:
                print(f"Intento {i+1} de {retries}: Error al conectar a DB - {str(e)}")
                if i < retries - 1:
                    time.sleep(delay)
        return None

    # Verificar e inicializar tablas
    def init_db():
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            cur = conn.cursor()
            
            # Tabla simplificada de citas
            cur.execute("""
                CREATE TABLE IF NOT EXISTS citas (
                    id SERIAL PRIMARY KEY,
                    fecha DATE NOT NULL,
                    hora TIME NOT NULL,
                    cliente VARCHAR(100) NOT NULL,
                    servicio VARCHAR(100) NOT NULL,
                    telefono VARCHAR(20),
                    estado VARCHAR(20) DEFAULT 'pendiente',
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            return True
        except Exception as e:
            print(f"Error al inicializar DB: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    # Inicializar DB al iniciar
    init_db()

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        conn = get_db_connection()
        if not conn:
            flash("Error de conexión con la base de datos", "danger")
            return render_template('agenda.html', citas=[])
        
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT fecha, hora, cliente, servicio 
                FROM citas 
                WHERE estado = 'pendiente'
                ORDER BY fecha, hora
            """)
            citas = cur.fetchall()
            
            servicios = [
                ('Corte de caballero', 150.00),
                ('Corte de niño', 100.00),
                ('Afeitado clásico', 120.00),
                ('Tinte de barba', 200.00)
            ]
            
            return render_template('agenda.html', citas=citas, servicios=servicios)
        except Exception as e:
            print(f"Error en agenda: {str(e)}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[], servicios=[])
        finally:
            if conn:
                conn.close()

    @app.route('/crear_cita', methods=['GET', 'POST'])
    def crear_cita():
        if not session.get('admin'):
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            fecha = request.form.get('fecha')
            hora = request.form.get('hora')
            cliente = request.form.get('cliente')
            servicio = request.form.get('servicio')
            telefono = request.form.get('telefono')
            
            if not all([fecha, hora, cliente, servicio]):
                flash("Todos los campos son requeridos", "danger")
                return redirect(url_for('crear_cita'))
            
            try:
                # Validar hora
                hora_obj = datetime.strptime(hora, '%H:%M').time()
                if hora_obj < time(9, 0) or hora_obj > time(18, 0):
                    flash("El horario de atención es de 9:00 AM a 6:00 PM", "danger")
                    return redirect(url_for('crear_cita'))
                
                conn = get_db_connection()
                if not conn:
                    flash("Error de conexión con la base de datos", "danger")
                    return redirect(url_for('crear_cita'))
                
                try:
                    cur = conn.cursor()
                    
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
                        INSERT INTO citas (fecha, hora, cliente, servicio, telefono)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (fecha, hora, cliente, servicio, telefono))
                    conn.commit()
                    
                    flash("Cita creada exitosamente!", "success")
                    return redirect(url_for('agenda'))
                except Exception as e:
                    print(f"Error al crear cita: {str(e)}")
                    flash("Error al guardar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                finally:
                    if conn:
                        conn.close()
            except ValueError:
                flash("Formato de hora incorrecto (use HH:MM)", "danger")
                return redirect(url_for('crear_cita'))
        
        # GET request - mostrar formulario
        servicios = [
            ('Corte de caballero', 150.00),
            ('Corte de niño', 100.00),
            ('Afeitado clásico', 120.00),
            ('Tinte de barba', 200.00)
        ]
        return render_template('crear_cita.html', servicios=servicios, min_date=datetime.now().strftime('%Y-%m-%d'))

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

