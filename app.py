import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from dotenv import load_dotenv
import time

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'la sabana de caripito')
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin_pro')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'Cl4v3-S3gur4!')

    @app.context_processor
    def inject_now():
        return {'now': datetime.now()}

    def get_db_connection():
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
            print(f"Error de conexión a DB: {str(e)}")
            return None

    def init_db():
        conn = get_db_connection()
        if not conn:
            return False
        
        try:
            cur = conn.cursor()
            
            # Verificar si la tabla existe
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'citas'
                )
            """)
            tabla_existe = cur.fetchone()[0]
            
            if not tabla_existe:
                # Crear tabla con estructura actualizada
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
                print("Tabla 'citas' creada exitosamente")
            else:
                # Verificar estructura de columnas
                cur.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'citas'
                """)
                columnas = [row[0] for row in cur.fetchall()]
                
                if 'cliente' in columnas and 'nombre_cliente' not in columnas:
                    cur.execute("ALTER TABLE citas RENAME COLUMN cliente TO nombre_cliente")
                    conn.commit()
                    print("Columna 'cliente' renombrada a 'nombre_cliente'")
                
            return True
        except Exception as e:
            print(f"Error al inicializar DB: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    init_db()

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        try:
            conn = get_db_connection()
            if not conn:
                flash("Error temporal al conectar con la base de datos. Intente nuevamente.", "warning")
                return render_template('agenda.html', citas=[], servicios=[])
            
            cur = conn.cursor()
            
            # Consulta mejorada con manejo de errores
            try:
                cur.execute("""
                    SELECT fecha, hora, nombre_cliente, servicio, telefono
                    FROM citas 
                    WHERE estado = 'pendiente'
                    ORDER BY fecha, hora
                """)
                citas = cur.fetchall()
            except psycopg2.Error as e:
                print(f"Error en consulta SQL: {str(e)}")
                flash("Error al recuperar las citas. Verifique la estructura de la base de datos.", "danger")
                citas = []
            
            servicios = [
                ('Corte de caballero', 150.00),
                ('Corte de niño', 100.00),
                ('Afeitado clásico', 120.00),
                ('Tinte de barba', 200.00)
            ]
            
            if not citas:
                flash("No hay citas pendientes actualmente", "info")
            
            return render_template('agenda.html', citas=citas, servicios=servicios)
            
        except Exception as e:
            print(f"Error general en agenda: {str(e)}")
            flash("Ocurrió un error al cargar la agenda", "danger")
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
            nombre_cliente = request.form.get('nombre_cliente')
            servicio = request.form.get('servicio')
            telefono = request.form.get('telefono')
            
            if not all([fecha, hora, nombre_cliente, servicio]):
                flash("Todos los campos excepto teléfono son requeridos", "danger")
                return redirect(url_for('crear_cita'))
            
            try:
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
                    
                    # Insertar nueva cita
                    cur.execute("""
                        INSERT INTO citas (fecha, hora, nombre_cliente, servicio, telefono)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (fecha, hora, nombre_cliente, servicio, telefono))
                    conn.commit()
                    
                    flash("Cita creada exitosamente!", "success")
                    return redirect(url_for('agenda'))
                except Exception as e:
                    conn.rollback()
                    print(f"Error al crear cita: {str(e)}")
                    flash("Error técnico al guardar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                finally:
                    conn.close()
            except ValueError:
                flash("Formato de hora incorrecto (use HH:MM)", "danger")
                return redirect(url_for('crear_cita'))
        
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
