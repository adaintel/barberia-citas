// 1. Inicialización de Supabase - DEBE ESTAR AL PRINCIPIO
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variables globales
let todasLasCitas = [];
let modalAbierto = false;

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

// Verificación de seguridad para barberos - MODIFICADA PARA MEJOR FUNCIONAMIENTO
function verificarAccesoBarbero() {
  // Mostrar modal de contraseña inmediatamente
  const modalVerificacion = document.createElement('div');
  modalVerificacion.className = 'modal-verificacion';
  modalVerificacion.innerHTML = `
    <div class="contenido-verificacion">
      <h2>Acceso Restringido</h2>
      <p>Ingrese la contraseña de barbero:</p>
      <input type="password" id="input-password" placeholder="Contraseña">
      <button id="btn-verificar" class="btn-verificar">Verificar</button>
      <p id="mensaje-error" style="color:#e74c3c; margin-top:10px; display:none;">Contraseña incorrecta</p>
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
        document.getElementById('mensaje-error').style.display = 'block';
      }
    });
  });
}

// Cargar citas desde Supabase - MODIFICADA PARA USAR PROMESAS
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

// [Resto de las funciones permanecen igual...]
// (mostrarCitas, agregarEventosBotones, cambiarEstadoCita, mostrarDetallesCita, etc.)

// Inicialización del panel - MODIFICADA PARA MANEJAR LA AUTENTICACIÓN
async function inicializarPanel() {
  // Verificar acceso primero
  const password = localStorage.getItem('barberoPassword');
  
  if (!password || password !== 'BarberoElite2025') {
    const accesoPermitido = await verificarAccesoBarbero();
    if (!accesoPermitido) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Configurar buscador
  const buscador = document.getElementById('buscador');
  if (buscador) buscador.addEventListener('input', filtrarCitas);
  
  // Configurar filtros
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroBarbero = document.getElementById('filtro-barbero');
  if (filtroEstado) filtroEstado.addEventListener('change', filtrarCitas);
  if (filtroBarbero) filtroBarbero.addEventListener('change', filtrarCitas);
  
  // Configurar botón de exportar
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) btnExportar.addEventListener('click', exportarCitas);
  
  // Cargar citas iniciales
  await cargarCitas();
  
  // Conectar websockets
  conectarWebsockets();
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  inicializarPanel();
});
