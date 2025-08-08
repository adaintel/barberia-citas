import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL').replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/citas', methods=['GET', 'POST'])
def citas():
    if request.method == 'POST':
        nombre = request.form['nombre']
        telefono = request.form['telefono']
        fecha = request.form['fecha']
        hora = request.form['hora']
        servicio = request.form['servicio']
        
        nueva_cita = Cita(
            nombre=nombre,
            telefono=telefono,
            fecha=fecha,
            hora=hora,
            servicio=servicio
        )
        
        db.session.add(nueva_cita)
        db.session.commit()
        
        flash('¡Cita agendada con éxito!', 'success')
        return redirect(url_for('citas'))
    
    return render_template('citas.html')

@app.route('/admin')
def admin():
    citas = Cita.query.order_by(Cita.fecha, Cita.hora).all()
    return render_template('admin.html', citas=citas)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
