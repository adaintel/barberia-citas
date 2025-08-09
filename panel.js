// Variables globales
let todasLasCitas = [];
let modalAbierto = false;
let canalCitas = null;

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion-${tipo}`;
  notificacion.innerHTML = `<p>${mensaje}</p>`;
  document.body.appendChild(notificacion);
  
  setTimeout(() => {
    notificacion.classList.add('fade-out');
    setTimeout(() => notificacion.remove(), 500);
  }, 3000);
}

// Verificación de seguridad para barberos
async function verificarAccesoBarbero() {
  const password = localStorage.getItem('barberoPassword');
  
  if (password === 'BarberoElite2025') {
    return true;
  }

  // Crear modal de verificación
  const modalVerificacion = document.createElement('div');
  modalVerificacion.className = 'modal-verificacion';
  modalVerificacion.innerHTML = `
    <div class="contenido-verificacion">
      <h2>Acceso Restringido</h2>
      <p>Ingrese la contraseña de barbero:</p>
      <input type="password" id="input-password" placeholder="Contraseña">
      <button id="btn-verificar" class="btn-verificar">Verificar</button>
      <p id="mensaje-error-verificacion" class="mensaje-error-verificacion">Contraseña incorrecta</p>
    </div>
  `;
  document.body.appendChild(modalVerificacion);

  return new Promise((resolve) => {
    document.getElementById('btn-verificar').addEventListener('click', () => {
      const inputPassword = document.getElementById('input-password').value;
      if (inputPassword === 'BarberoElite2025') {
        localStorage.setItem('barberoPassword', 'BarberoElite2025');
        modalVerificacion.remove();
        resolve(true);
      } else {
        document.getElementById('mensaje-error-verificacion').style.display = 'block';
      }
    });
  });
}

// Cargar citas desde Supabase
async function cargarCitas() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  try {
    contenedor.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner"></i>
        <p>Cargando citas...</p>
      </div>
    `;

    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    todasLasCitas = citas || [];
    mostrarCitas(todasLasCitas);
    actualizarEstadisticas(todasLasCitas);
    
  } catch (error) {
    console.error('Error al cargar citas:', error);
    contenedor.innerHTML = `
      <div class="mensaje-error">
        <p>Error al cargar citas. Por favor intente nuevamente.</p>
        <button onclick="window.location.reload()" class="btn-reintentar">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>
    `;
  }
}

// [Resto de funciones (mostrarCitas, cambiarEstadoCita, etc.)...]

// Conectar a websockets para cambios en tiempo real
function conectarWebsockets() {
  if (canalCitas) {
    supabase.removeChannel(canalCitas);
  }

  canalCitas = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'citas'
      },
      (payload) => {
        console.log('Cambio recibido:', payload);
        cargarCitas();
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('Canal suscrito correctamente');
      }
      if (err) {
        console.error('Error en suscripción:', err);
      }
    });
}

// Inicialización del panel
async function inicializarPanel() {
  try {
    const accesoPermitido = await verificarAccesoBarbero();
    if (!accesoPermitido) {
      window.location.href = 'index.html';
      return;
    }

    // Configurar eventos y cargar citas
    document.getElementById('buscador')?.addEventListener('input', filtrarCitas);
    document.getElementById('filtro-estado')?.addEventListener('change', filtrarCitas);
    document.getElementById('filtro-barbero')?.addEventListener('change', filtrarCitas);
    document.getElementById('btn-exportar')?.addEventListener('click', exportarCitas);
    
    await cargarCitas();
    conectarWebsockets();
    
  } catch (error) {
    console.error('Error en inicialización:', error);
    mostrarNotificacion('Error al inicializar el panel', 'error');
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanel);
