// Configuración de Supabase
const supabase = window.supabase;

// Variables globales
let todasLasCitas = [];
let canalCitas = null;
let intervaloSession = null;

// Función mejorada de login
async function loginBarbero(email, password) {
  try {
    const { data, error } = await supabase
      .from('barberos')
      .select('id, nombre, email')
      .eq('email', email)
      .eq('password', password)
      .eq('activo', true)
      .single();

    if (error || !data) {
      throw new Error('Credenciales incorrectas o usuario inactivo');
    }

    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

// Función para manejar la sesión
function manejarSesion(barbero) {
  const sessionData = {
    token: crypto.randomUUID(),
    id: barbero.id,
    nombre: barbero.nombre,
    email: barbero.email,
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 horas
  };
  
  localStorage.setItem('barberSession', JSON.stringify(sessionData));
  document.getElementById('nombre-barbero').textContent = barbero.nombre;
  actualizarTiempoSesion(sessionData.expires);
}

// Función para cargar citas
async function cargarCitas() {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    todasLasCitas = data || [];
    mostrarCitas(todasLasCitas);
    actualizarEstadisticas();
    
  } catch (error) {
    console.error('Error cargando citas:', error);
    mostrarNotificacion('Error al cargar citas', 'error');
  }
}

// Función para mostrar citas
function mostrarCitas(citas) {
  const contenedor = document.getElementById('citasContainer');
  
  if (!citas || citas.length === 0) {
    contenedor.innerHTML = '<p class="no-citas">No hay citas programadas</p>';
    return;
  }

  let html = `
    <table class="tabla-citas">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Teléfono</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Servicio</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  citas.forEach(cita => {
    html += `
      <tr>
        <td>${cita.nombre}</td>
        <td>${cita.telefono}</td>
        <td>${new Date(cita.fecha).toLocaleDateString()}</td>
        <td>${cita.hora.substring(0, 5)}</td>
        <td>${cita.servicio}</td>
        <td class="estado-${cita.estado}">${cita.estado}</td>
        <td>
          <button class="btn-accion completar" data-id="${cita.id}">✓</button>
          <button class="btn-accion cancelar" data-id="${cita.id}">✗</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

// Inicialización del panel
async function initPanel() {
  try {
    // Verificar sesión existente
    const session = JSON.parse(localStorage.getItem('barberSession') || {};
    
    if (session.token && new Date(session.expires) > new Date()) {
      manejarSesion(session);
      await cargarCitas();
      return;
    }

    // Mostrar modal de login
    document.getElementById('modal-verificacion').style.display = 'flex';
    
  } catch (error) {
    console.error('Error inicializando panel:', error);
    window.location.href = 'index.html';
  }
}

// Evento de login
document.getElementById('btn-verificar').addEventListener('click', async () => {
  const email = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;

  if (!email || !password) {
    alert('Por favor ingrese email y contraseña');
    return;
  }

  try {
    const barbero = await loginBarbero(email, password);
    manejarSesion(barbero);
    document.getElementById('modal-verificacion').style.display = 'none';
    await cargarCitas();
    
  } catch (error) {
    alert('Error al iniciar sesión: ' + error.message);
  }
});

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initPanel);
