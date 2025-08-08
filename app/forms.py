from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField, DateField, TimeField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError
from app.models import User, Servicio, Barbero
from datetime import datetime, time

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    remember = BooleanField('Recordarme')
    submit = SubmitField('Iniciar Sesión')

class RegistrationForm(FlaskForm):
    username = StringField('Nombre de Usuario', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    password2 = PasswordField('Repetir Contraseña', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Registrarse')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Por favor usa un nombre de usuario diferente.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Por favor usa un email diferente.')

class CitaForm(FlaskForm):
    servicio = SelectField('Servicio', coerce=int, validators=[DataRequired()])
    barbero = SelectField('Barbero', coerce=int, validators=[DataRequired()])
    fecha = DateField('Fecha', format='%Y-%m-%d', validators=[DataRequired()])
    hora = SelectField('Hora', validators=[DataRequired()])
    notas = TextAreaField('Notas o Comentarios')
    submit = SubmitField('Agendar Cita')

    def __init__(self, *args, **kwargs):
        super(CitaForm, self).__init__(*args, **kwargs)
        self.servicio.choices = [(s.id, s.nombre) for s in Servicio.query.order_by(Servicio.nombre).all()]
        self.barbero.choices = [(b.id, b.nombre) for b in Barbero.query.filter_by(activo=True).order_by(Barbero.nombre).all()]
        
        # Generar opciones de hora cada 30 minutos desde las 9 AM hasta las 7 PM
        horas_disponibles = []
        hora_actual = time(9, 0)
        while hora_actual <= time(19, 0):
            horas_disponibles.append((hora_actual.strftime('%H:%M'), hora_actual.strftime('%I:%M %p')))
            hora_actual = (datetime.combine(datetime.min, hora_actual) + 
                          timedelta(minutes=30)).time()
        self.hora.choices = horas_disponibles

class AdminCitaForm(FlaskForm):
    estado = SelectField('Estado', choices=[
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada')
    ], validators=[DataRequired()])
    submit = SubmitField('Actualizar Estado')