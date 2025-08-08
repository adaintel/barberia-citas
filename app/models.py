from datetime import datetime, time
from app import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    citas = db.relationship('Cita', backref='cliente', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Servicio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    duracion = db.Column(db.Integer, nullable=False)  # en minutos
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text)
    citas = db.relationship('Cita', backref='servicio', lazy='dynamic')

class Barbero(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True)
    telefono = db.Column(db.String(20))
    activo = db.Column(db.Boolean, default=True)
    citas = db.relationship('Cita', backref='barbero', lazy='dynamic')

class Cita(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    hora_inicio = db.Column(db.Time, nullable=False)
    hora_fin = db.Column(db.Time, nullable=False)
    estado = db.Column(db.String(20), default='pendiente')  # pendiente, confirmada, completada, cancelada
    notas = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id'))
    barbero_id = db.Column(db.Integer, db.ForeignKey('barbero.id'))
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    def duracion(self):
        return (datetime.combine(datetime.min, self.hora_fin) - 
                datetime.combine(datetime.min, self.hora_inicio)).seconds // 60

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))