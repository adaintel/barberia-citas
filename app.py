import os
from flask import Flask, render_template, request, redirect, url_for, Response
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_sqlalchemy import SQLAlchemy
from flask_basicauth import BasicAuth

app = Flask(__name__)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL').replace("postgresql://", "postgresql+psycopg2://")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'clave-secreta-ultrasegura'  # ¡Cambia esto!

# Autenticación básica para el panel
app.config['BASIC_AUTH_USERNAME'] = os.environ.get('ADMIN_USER', 'admin')
app.config['BASIC_AUTH_PASSWORD'] = os.environ.get('ADMIN_PASS', 'admin123')

db = SQLAlchemy(app)
basic_auth = BasicAuth(app)

# Modelo de datos
class Cita(db.Model):
    __tablename__ = 'citas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    servicio = db.Column(db.String(50), nullable=False)
    fecha = db.Column(db.String(10), nullable=False)
    hora = db.Column(db.String(5), nullable=False)

# Panel de administración
admin = Admin(app, name='Barbería', template_mode='bootstrap3')
admin.add_view(ModelView(Cita, db.session))

# Proteger todas las rutas de admin
@app.before_request
def before_request():
    if request.path.startswith('/admin'):
        basic_auth.required()

# Ruta principal
@app.route('/')
def home():
    return render_template('index.html')

# Agendar cita
@app.route('/agendar', methods=['POST'])
def agendar():
    if request.method == 'POST':
        nueva_cita = Cita(
            nombre=request.form['nombre'],
            telefono=request.form['telefono'],
            servicio=request.form['servicio'],
            fecha=request.form['fecha'],
            hora=request.form['hora']
        )
        db.session.add(nueva_cita)
        db.session.commit()
        return redirect(url_for('home'))

# Exportar CSV
@app.route('/exportar-csv')
def exportar_csv():
    citas = Cita.query.all()
    csv = "id,nombre,telefono,servicio,fecha,hora\n"
    csv += "\n".join([
        f"{c.id},{c.nombre},{c.telefono},{c.servicio},{c.fecha},{c.hora}"
        for c in citas
    ])
    return Response(csv, mimetype="text/csv")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Crea tablas si no existen
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)





