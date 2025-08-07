from flask import Flask, render_template, request, redirect, url_for, session
from database import get_db_connection, close_db_connection
import psycopg2
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_flask'

# Configuración de la base de datos desde variables de entorno
app.config['DATABASE_URL'] = 'postgresql://user:pass@host:port/db'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/agenda')
def agenda():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener citas
        cur.execute("""
            SELECT c.id, c.fecha, c.hora, u.nombre as cliente, s.nombre as servicio 
            FROM citas c
            JOIN usuarios u ON c.cliente_id = u.id
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.fecha >= %s
            ORDER BY c.fecha, c.hora
        """, (datetime.now().date(),))
        
        citas = cur.fetchall()
        
        # Obtener servicios disponibles
        cur.execute("SELECT id, nombre, duracion, precio FROM servicios")
        servicios = cur.fetchall()
        
        cur.close()
        return render_template('agenda.html', citas=citas, servicios=servicios)
        
    except Exception as e:
        print(f"Error: {e}")
        return render_template('agenda.html', error="Error al cargar la agenda")
    finally:
        close_db_connection(conn)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username == app.config['ADMIN_USER'] and password == app.config['ADMIN_PASS']:
            session['admin'] = True
            return redirect(url_for('admin_dashboard'))
        
    return render_template('login.html')

if __name__ == '__main__':
    app.run(debug=True)