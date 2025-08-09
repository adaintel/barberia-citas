// Configuración de Supabase
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variables globales
let todasLasCitas = [];
let canalCitas = null;
let intervaloSession = null;
let barberosDisponibles = [];

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

// Verificación de acceso mejorada
async function verificarAccesoBarbero() {
  // Verificar sesión existente
  const session = JSON.parse(localStorage.getItem('barberSession') || '{}');
  
  if (session.token && new Date(session.expires) > new Date()) {
    actualizarTiempoSesion(session.expires);
    document.getElementById('nombre-barbero').textContent = `(${session.nombre})`;
    return true;
  }

  // Mostrar modal de verificación
  const modal = document.getElementById('modal-verificacion');
  modal.style.display = 'flex';
  document.getElementById('input-email').focus();
  
  return new Promise((resolve) => {
    let intentos = 0;
    const maxIntentos = 3;
    
    const verificarCredenciales = async () => {
      const email = document.getElementById('input-email').value.trim();
      const password = document.getElementById('input-password').value;
      
      if (!email || !password) {
        mostrarErrorVerificacion('Ambos campos son requeridos');
        return;
      }

      try {
        // Verificar credenciales con Supabase
        const { data, error } = await supabase
          .from('barberos')
          .select('id,nombre,email')
          .eq('email', email)
          .eq('password', password)
          .eq('activo', true)
          .single();
        
        if (error || !data) {
          intentos++;
          if (intentos >= maxIntentos) {
            mostrarErrorVerificacion('Demasiados intentos fallidos. Redirigiendo...');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
          }
          
          mostrarErrorVerificacion('Credenciales incorrectas. Intentos restantes: ' + (maxIntentos - intentos));
          document.getElementById('input-password').value = '';
          return;
        }
        
        // Crear sesión segura
        const sessionData = {
          token: crypto.randomUUID(),
          id: data.id,
          nombre: data.nombre,
          email: data.email,
          expires: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 horas
        };
        
        localStorage.setItem('barberSession', JSON.stringify(sessionData));
        modal.style.display = 'none';
        mostrarNotificacion(`Bienvenido ${data.nombre}`, 'success');
        document.getElementById('nombre-barbero').textContent = `(${data.nombre})`;
        actualizarTiempoSesion(sessionData.expires);
        resolve(true);
        
      } catch (error) {
        console.error('Error en verificación:', error);
        mostrarErrorVerificacion('Error en el sistema. Intente más tarde.');
        resolve(false);
      }
    };
    
    function mostrarErrorVerificacion(mensaje) {
      const errorElement = document.getElementById('mensaje-error-verificacion');
      errorElement.textContent = mensaje;
      errorElement.style.display = 'block';
    }
    
    document.getElementById('btn-verificar').onclick = verificarCredenciales;
    
    // Permitir verificar con Enter
    document.getElementById('input-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verificarCredenciales();
    });
  });
}

// Control de tiempo de sesión
function actualizarTiempoSesion(fechaExpiracion) {
  clearInterval(intervaloSession);
  
  function actualizar() {
    const ahora = new Date();
    const expiracion = new Date(fechaExpiracion);
    const diffMs = expiracion - ahora;
    
    if (diffMs <= 0) {
      clearInterval(intervaloSession);
      localStorage.removeItem('barberSession');
      mostrarNotificacion('Sesión expirada. Por favor inicie sesión nuevamente.', 'warning');
      setTimeout(() => window.location.reload(), 2000);
      return;
    }
    
    const diffMins = Math.round(diffMs / 60000);
    document.getElementById('tiempo-sesion').textContent = `${diffMins} min`;
  }
  
  actualizar();
  intervaloSession = setInterval(actualizar, 60000); // Actualizar cada minuto
}

// Cerrar sesión
function configurarCierreSesion() {
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('barberSession');
    mostrarNotificacion('Sesión cerrada correctamente', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  });
}

// Inicialización del panel
async function inicializarPanel() {
  try {
    // Verificar acceso primero
    const accesoPermitido = await verificarAccesoBarbero();
    if (!accesoPermitido) {
      window.location.href = 'index.html';
      return;
    }

    // Configurar eventos
    configurarCierreSesion();
    document.getElementById('buscador').addEventListener('input', filtrarCitas);
    document.getElementById('filtro-estado').addEventListener('change', filtrarCitas);
    document.getElementById('btn-exportar').addEventListener('click', exportarCitas);
    
    // Cargar datos iniciales
    await cargarBarberos();
    await cargarCitas();
    conectarWebsockets();
    
  } catch (error) {
    console.error('Error en inicialización:', error);
    mostrarNotificacion('Error al inicializar el panel', 'error');
    setTimeout(() => window.location.href = 'index.html', 3000);
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanel);
