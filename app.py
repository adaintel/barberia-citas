import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, time
import psycopg2
from dotenv import load_dotenv
import time
import traceback

load_dotenv()

class DatabaseManager:
    @staticmethod
    def get_connection():
        try:
            return psycopg2.connect(
                host=os.getenv('DB_HOST'),
                database=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                port=os.getenv('DB_PORT', '5432'),
                connect_timeout=5
            )
        except Exception as e:
            print(f"⚠️ Error de conexión a DB: {str(e)}")
            return None

    @staticmethod
    def initialize_database():
        conn = DatabaseManager.get_connection()
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
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    # Crear tabla con estructura completa
                    cur.execute("""
                        CREATE TABLE citas (
                            id SERIAL PRIMARY KEY,
                            fecha DATE NOT NULL,
                            hora TIME NOT NULL,
                            nombre_cliente VARCHAR(100) NOT NULL,
                            servicio VARCHAR(100) NOT NULL,
                            telefono VARCHAR(20),
                            estado VARCHAR(20) DEFAULT 'pendiente',
                            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            observaciones TEXT
                        )
                    """)
                    conn.commit()
                    print("✅ Tabla 'citas' creada exitosamente")
                    
                    # Insertar datos de ejemplo (opcional)
                    cur.execute("""
                        INSERT INTO citas (fecha, hora, nombre_cliente, servicio, telefono)
                        VALUES 
                            (CURRENT_DATE + 1, '10:00', 'Juan Pérez', 'Corte de caballero', '1234567890'),
                            (CURRENT_DATE + 1, '11:30', 'María García', 'Afeitado clásico', '0987654321')
                    """)
                    conn.commit()
                    print("📝 Datos de ejemplo insertados")
                else:
                    # Verificar y actualizar estructura si es necesario
                    cur.execute("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'citas'
                    """)
                    columns = [row[0] for row in cur.fetchall()]
                    
                    # Migración de estructura si es necesario
                    if 'cliente' in columns and 'nombre_cliente' not in columns:
                        cur.execute("ALTER TABLE citas RENAME COLUMN cliente TO nombre_cliente")
                    
                    if 'actualizado_en' not in columns:
                        cur.execute("ALTER TABLE citas ADD COLUMN actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                    
                    if 'observaciones' not in columns:
                        cur.execute("ALTER TABLE citas ADD COLUMN observaciones TEXT")
                    
                    conn.commit()
                    print("🔄 Estructura de tabla verificada/actualizada")
            
            return True
        except Exception as e:
            print(f"❌ Error al inicializar DB: {str(e)}")
            traceback.print_exc()
            return False
        finally:
            conn.close()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'secret-key-123')
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'admin123')
    app.config['SERVICIOS'] = [
        ('Corte de caballero', 150.00),
        ('Corte de niño', 100.00),
        ('Afeitado clásico', 120.00),
        ('Tinte de barba', 200.00),
        ('Corte y barba', 220.00),
        ('Peinado especial', 180.00)
    ]

    # Inicializar base de datos al iniciar
    DatabaseManager.initialize_database()

    @app.context_processor
    def inject_common_data():
        return {
            'now': datetime.now(),
            'servicios': app.config['SERVICIOS']
        }

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/agenda')
    def agenda():
        try:
            conn = DatabaseManager.get_connection()
            if not conn:
                flash("⚠️ Error temporal al conectar con la base de datos", "warning")
                return render_template('agenda.html', citas=[])
            
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        SELECT id, fecha, hora, nombre_cliente, servicio, telefono
                        FROM citas 
                        WHERE estado = 'pendiente'
                        ORDER BY fecha, hora
                        LIMIT 50
                    """)
                    citas = cur.fetchall()
                    
                    if not citas:
                        flash("ℹ️ No hay citas pendientes actualmente", "info")
                    
                    return render_template('agenda.html', citas=citas)
                
                except psycopg2.Error as e:
                    print(f"❌ Error en consulta SQL: {str(e)}")
                    traceback.print_exc()
                    flash("⚠️ Error al recuperar las citas. Por favor intente más tarde.", "danger")
                    return render_template('agenda.html', citas=[])
                
        except Exception as e:
            print(f"❌ Error general en agenda: {str(e)}")
            traceback.print_exc()
            flash("⚠️ Ocurrió un error inesperado", "danger")
            return render_template('agenda.html', citas=[])
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
            nombre_cliente = request.form.get('nombre_cliente', '').strip()
            servicio = request.form.get('servicio')
            telefono = request.form.get('telefono', '').strip()
            observaciones = request.form.get('observaciones', '').strip()
            
            # Validaciones
            if not all([fecha, hora, nombre_cliente, servicio]):
                flash("❌ Todos los campos excepto teléfono y observaciones son requeridos", "danger")
                return redirect(url_for('crear_cita'))
            
            if len(nombre_cliente) < 3:
                flash("❌ El nombre del cliente debe tener al menos 3 caracteres", "danger")
                return redirect(url_for('crear_cita'))
            
            try:
                hora_obj = datetime.strptime(hora, '%H:%M').time()
                hora_min = time(9, 0)
                hora_max = time(18, 0)
                
                if hora_obj < hora_min or hora_obj > hora_max:
                    flash(f"❌ El horario de atención es de {hora_min.strftime('%H:%M')} a {hora_max.strftime('%H:%M')}", "danger")
                    return redirect(url_for('crear_cita'))
                
                conn = DatabaseManager.get_connection()
                if not conn:
                    flash("⚠️ Error de conexión con la base de datos", "danger")
                    return redirect(url_for('crear_cita'))
                
                try:
                    with conn.cursor() as cur:
                        # Verificar disponibilidad
                        cur.execute("""
                            SELECT id FROM citas 
                            WHERE fecha = %s AND hora = %s AND estado = 'pendiente'
                        """, (fecha, hora))
                        
                        if cur.fetchone():
                            flash("❌ Ya existe una cita programada para esa fecha y hora", "danger")
                            return redirect(url_for('crear_cita'))
                        
                        # Insertar nueva cita
                        cur.execute("""
                            INSERT INTO citas (
                                fecha, hora, nombre_cliente, 
                                servicio, telefono, observaciones
                            ) VALUES (%s, %s, %s, %s, %s, %s)
                        """, (
                            fecha, hora, nombre_cliente, 
                            servicio, telefono if telefono else None, 
                            observaciones if observaciones else None
                        ))
                        conn.commit()
                        
                        flash("✅ Cita creada exitosamente!", "success")
                        return redirect(url_for('agenda'))
                    
                except Exception as e:
                    conn.rollback()
                    print(f"❌ Error al crear cita: {str(e)}")
                    traceback.print_exc()
                    flash("⚠️ Error técnico al guardar la cita", "danger")
                    return redirect(url_for('crear_cita'))
                finally:
                    conn.close()
                    
            except ValueError:
                flash("❌ Formato de hora incorrecto (use HH:MM)", "danger")
                return redirect(url_for('crear_cita'))
        
        return render_template('crear_cita.html', min_date=datetime.now().strftime('%Y-%m-%d'))

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '').strip()
            
            if username == app.config['ADMIN_USER'] and password == app.config['ADMIN_PASS']:
                session['admin'] = True
                flash("✅ Inicio de sesión exitoso", "success")
                return redirect(url_for('index'))
            
            flash("❌ Credenciales incorrectas", "danger")
        
        return render_template('login.html')

    @app.route('/logout')
    def logout():
        session.pop('admin', None)
        flash("ℹ️ Has cerrado sesión", "info")
        return redirect(url_for('index'))

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
