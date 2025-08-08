


import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Configuración de la aplicación
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Configuración de la base de datos (usa la URL de Render)
database_url = os.environ.get('DATABASE_URL', 'postgresql://localhost/barberia')

# Asegúrate de que la URL comience con postgresql://
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modelo de Cita
class Cita(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    fecha = db.Column(db.String(10), nullable=False)
    hora = db.Column(db.String(5), nullable=False)
    servicio = db.Column(db.String(50), nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Cita {self.nombre}>'

# Rutas
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
    citas = Cita.query.order_by(Cita.fecha, Cita.hora).all()
    return render_template('admin.html', citas=citas)

# Inicialización de la base de datos
def initialize_database():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    initialize_database()
    app.run(debug=True)
