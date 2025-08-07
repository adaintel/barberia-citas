import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'la sabana de caripito')
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin_pro')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'Cl4v3-S3gur4!')
    
    # Configuración de la base de datos
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
            
            # Crear tablas si no existen
            conn = connection_pool.getconn()
            cur = conn.cursor()
            
            # Tabla simplificada de citas (sin relaciones para simplificar)
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
            
            # Insertar datos de ejemplo si no hay citas
            cur.execute("SELECT COUNT(*) FROM citas")
            if cur.fetchone()[0] == 0:
                cur.execute("""
                    INSERT INTO citas (fecha, hora, cliente, servicio, telefono)
                    VALUES 
                        (CURRENT_DATE + 1, '10:00', 'Juan Pérez', 'Corte de caballero', '5551234567'),
                        (CURRENT_DATE + 1, '11:30', 'María Gómez', 'Afeitado clásico', '5557654321')
                """)
            
            conn.commit()
            connection_pool.putconn(conn)
            return True
            
        except Exception as e:
            print(f"Error al inicializar DB: {e}")
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

    @app.context_processor
    def inject_now():
        return {'now': datetime.now()}

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
                SELECT id, fecha, hora, cliente, servicio 
                FROM citas 
                WHERE fecha >= CURRENT_DATE AND estado = 'pendiente'
                ORDER BY fecha, hora
            """)
            citas = cur.fetchall()
            
            # Obtener servicios disponibles
            servicios = [
                ('Corte de caballero', 150.00),
                ('Corte de niño', 100.00),
                ('Afeitado clásico', 120.00),
                ('Tinte de barba', 200.00)
            ]
            
            return render_template('agenda.html', citas=citas, servicios=servicios)
            
        except Exception as e:
            print(f"Error en agenda: {e}")
            flash("Error al cargar la agenda", "danger")
            return render_template('agenda.html', citas=[])
        finally:
            if conn:
                close_db_connection(conn)

    @app.route('/crear_cita', methods=['GET', 'POST'])
    def crear_cita():
        if request.method == 'POST':
            # Validar datos del formulario
            fecha_str = request.form.get('fecha')
            hora_str = request.form.get('hora')
            cliente = request.form.get('cliente')
            servicio = request.form.get('servicio')
            telefono = request.form.get('telefono')
            
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                hora = datetime.strptime(hora_str, '%H:%M').time()
                
                # Validar horario de atención (9AM - 6PM)
                if hora < time(9, 0) or hora > time(18, 0):
                    flash("El horario de atención es de 9:00 AM a 6:00 PM", "danger")
                    return redirect(url_for('crear_cita'))
                
                conn = get_db_connection()
                if not conn:
                    flash("Error de conexión con la base de datos", "danger")
                    return redirect(url_for('agenda'))
                
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
                    
                    # Insertar nueva cita
                    cur.execute("""
                        INSERT INTO citas (fecha, hora, cliente, servicio, telefono)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (fecha, hora, cliente, servicio, telefono))
                    conn.commit()
                    
                    flash("Cita creada exitosamente", "success")
                    return redirect(url_for('agenda'))
                    
                except Exception as e:
                    print(f"Error al crear cita: {e}")
                    flash("Error al guardar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                finally:
                    if conn:
                        close_db_connection(conn)
                        
            except ValueError:
                flash("Fecha u hora no válidas", "danger")
                return redirect(url_for('crear_cita'))
            
        # GET request - mostrar formulario
        servicios = [
            ('Corte de caballero', 150.00),
            ('Corte de niño', 100.00),
            ('Afeitado clásico', 120.00),
            ('Tinte de barba', 200.00)
        ]
        return render_template('crear_cita.html', servicios=servicios)

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
    app.run(host='0.0.0.0', port=5000, debug=True)
