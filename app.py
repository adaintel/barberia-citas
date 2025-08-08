import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import logging

# Configuración básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Configuración robusta de la base de datos
def get_database_url():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        logger.error("DATABASE_URL no está configurada")
        raise RuntimeError("DATABASE_URL no está configurada")
    
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    return db_url

try:
    app.config['SQLALCHEMY_DATABASE_URI'] = get_database_url()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db = SQLAlchemy(app)
except Exception as e:
    logger.error(f"Error configurando la base de datos: {e}")
    raise

class Cita(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    fecha = db.Column(db.String(10), nullable=False)
    hora = db.Column(db.String(5), nullable=False)
    servicio = db.Column(db.String(50), nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/citas', methods=['GET', 'POST'])
def citas():
    if request.method == 'POST':
        try:
            nueva_cita = Cita(
                nombre=request.form['nombre'],
                telefono=request.form['telefono'],
                fecha=request.form['fecha'],
                hora=request.form['hora'],
                servicio=request.form['servicio']
            )
            db.session.add(nueva_cita)
            db.session.commit()
            flash('¡Cita agendada con éxito!', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error al agendar cita: {str(e)}', 'danger')
        return redirect(url_for('citas'))
    
    return render_template('citas.html')

@app.route('/admin')
def admin():
    try:
        citas = Cita.query.order_by(Cita.fecha, Cita.hora).all()
        return render_template('admin.html', citas=citas)
    except Exception as e:
        flash(f'Error al obtener citas: {str(e)}', 'danger')
        return redirect(url_for('index'))

def initialize_database():
    with app.app_context():
        try:
            db.create_all()
            logger.info("Base de datos inicializada correctamente")
        except Exception as e:
            logger.error(f"Error inicializando la base de datos: {e}")
            raise

if __name__ == '__main__':
    initialize_database()
    app.run(host='0.0.0.0', port=5000)
