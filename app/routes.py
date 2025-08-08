from flask import render_template, redirect, url_for, flash, request, abort
from flask_login import login_user, logout_user, current_user, login_required
from app import db
from app.models import User, Cita, Servicio, Barbero
from app.forms import LoginForm, RegistrationForm, CitaForm, AdminCitaForm
from datetime import datetime, date, time, timedelta
from . import main_routes, auth_routes, cita_routes, admin_routes
from flask import jsonify

@auth_routes.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main_routes.index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Email o contraseña inválidos', 'danger')
            return redirect(url_for('auth.login'))
        login_user(user, remember=form.remember.data)
        next_page = request.args.get('next')
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('main_routes.index'))
        return redirect(next_page)
    return render_template('auth/login.html', title='Iniciar Sesión', form=form)

@auth_routes.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main_routes.index'))

@auth_routes.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main_routes.index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html', title='Registro', form=form)

@main_routes.route('/')
def index():
    return render_template('index.html')

@cita_routes.route('/nueva', methods=['GET', 'POST'])
@login_required
def nueva_cita():
    form = CitaForm()
    
    if form.validate_on_submit():
        # Convertir la hora seleccionada a objeto time
        hora_seleccionada = datetime.strptime(form.hora.data, '%H:%M').time()
        
        # Obtener el servicio para conocer la duración
        servicio = Servicio.query.get(form.servicio.data)
        
        # Calcular hora de fin
        hora_fin = (datetime.combine(datetime.min, hora_seleccionada) + 
                   timedelta(minutes=servicio.duracion)).time()
        
        # Verificar disponibilidad
        cita_existente = Cita.query.filter_by(
            barbero_id=form.barbero.data,
            fecha=form.fecha.data
        ).filter(
            (Cita.hora_inicio <= hora_seleccionada) & (Cita.hora_fin > hora_seleccionada) |
            (Cita.hora_inicio < hora_fin) & (Cita.hora_fin >= hora_fin) |
            (Cita.hora_inicio >= hora_seleccionada) & (Cita.hora_fin <= hora_fin)
        ).first()
        
        if cita_existente:
            flash('El barbero ya tiene una cita en ese horario. Por favor elige otro horario.', 'danger')
            return redirect(url_for('cita_routes.nueva_cita'))
        
        # Crear nueva cita
        nueva_cita = Cita(
            fecha=form.fecha.data,
            hora_inicio=hora_seleccionada,
            hora_fin=hora_fin,
            servicio_id=form.servicio.data,
            barbero_id=form.barbero.data,
            user_id=current_user.id,
            notas=form.notas.data,
            estado='pendiente'
        )
        
        db.session.add(nueva_cita)
        db.session.commit()
        flash('¡Tu cita ha sido agendada exitosamente!', 'success')
        return redirect(url_for('cita_routes.mis_citas'))
    
    return render_template('citas/nueva_cita.html', title='Nueva Cita', form=form)

@cita_routes.route('/mis-citas')
@login_required
def mis_citas():
    citas = Cita.query.filter_by(user_id=current_user.id).order_by(Cita.fecha, Cita.hora_inicio).all()
    return render_template('citas/mis_citas.html', title='Mis Citas', citas=citas)

@admin_routes.route('/citas')
@login_required
def gestion_citas():
    if not current_user.is_admin:
        abort(403)
    
    fecha = request.args.get('fecha', default=date.today().isoformat())
    try:
        fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        fecha = date.today()
    
    citas = Cita.query.filter_by(fecha=fecha).order_by(Cita.hora_inicio).all()
    return render_template('admin/citas.html', title='Gestión de Citas', citas=citas, fecha=fecha)

@admin_routes.route('/cita/<int:id>', methods=['GET', 'POST'])
@login_required
def editar_cita(id):
    if not current_user.is_admin:
        abort(403)
    
    cita = Cita.query.get_or_404(id)
    form = AdminCitaForm()
    
    if form.validate_on_submit():
        cita.estado = form.estado.data
        db.session.commit()
        flash('El estado de la cita ha sido actualizado.', 'success')
        return redirect(url_for('admin_routes.gestion_citas'))
    
    elif request.method == 'GET':
        form.estado.data = cita.estado
    
    return render_template('admin/editar_cita.html', title='Editar Cita', form=form, cita=cita)

@admin_routes.route('/horario')
@login_required
def ver_horario():
    if not current_user.is_admin:
        abort(403)
    
    fecha = request.args.get('fecha', default=date.today().isoformat())
    try:
        fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        fecha = date.today()
    
    # Obtener todos los barberos activos
    barberos = Barbero.query.filter_by(activo=True).all()
    
    # Generar horario de 9 AM a 7 PM en intervalos de 30 minutos
    horas = []
    hora_actual = time(9, 0)
    while hora_actual <= time(19, 0):
        horas.append(hora_actual)
        hora_actual = (datetime.combine(datetime.min, hora_actual) + 
                      timedelta(minutes=30)).time()
    
    # Obtener todas las citas para la fecha seleccionada
    citas = Cita.query.filter_by(fecha=fecha).all()
    
    # Crear estructura de datos para el horario
    horario = {}
    for barbero in barberos:
        horario[barbero.id] = {hora: None for hora in horas}
    
    for cita in citas:
        hora_actual = cita.hora_inicio
        while hora_actual < cita.hora_fin:
            if hora_actual in horario[cita.barbero_id]:
                horario[cita.barbero_id][hora_actual] = cita
            hora_actual = (datetime.combine(datetime.min, hora_actual) + 
                         timedelta(minutes=30)).time()
    
@cita_routes.route('/api/horas-disponibles')
def horas_disponibles():
    fecha_str = request.args.get('fecha')
    barbero_id = request.args.get('barbero_id')
    
    if not fecha_str or not barbero_id:
        return jsonify({'error': 'Falta fecha o ID de barbero'}), 400
    
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido'}), 400
    
    try:
        barbero_id = int(barbero_id)
    except ValueError:
        return jsonify({'error': 'ID de barbero inválido'}), 400
    
    # Obtener todas las citas para este barbero en esta fecha
    citas = Cita.query.filter_by(
        barbero_id=barbero_id,
        fecha=fecha
    ).order_by(Cita.hora_inicio).all()
    
    # Generar todas las posibles horas (cada 30 minutos de 9 AM a 7 PM)
    horas_posibles = []
    hora_actual = time(9, 0)
    while hora_actual <= time(19, 0):
        horas_posibles.append(hora_actual)
        hora_actual = (datetime.combine(datetime.min, hora_actual) + 
                      timedelta(minutes=30)).time()
    
    # Determinar horas ocupadas
    horas_ocupadas = set()
    for cita in citas:
        hora = cita.hora_inicio
        while hora < cita.hora_fin:
            horas_ocupadas.add(hora)
            hora = (datetime.combine(datetime.min, hora) + 
                   timedelta(minutes=30)).time()
    
    # Preparar respuesta
    horas_disponibles = []
    for hora in horas_posibles:
        if hora not in horas_ocupadas:
            horas_disponibles.append({
                'value': hora.strftime('%H:%M'),
                'text': hora.strftime('%I:%M %p')
            })
    
    return jsonify({
        'fecha': fecha_str,
        'barbero_id': barbero_id,
        'horas_disponibles': horas_disponibles
    })