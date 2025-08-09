// barbero-auth.js - Versión corregida y completa

// Usamos la instancia global de Supabase
const supabase = window.supabase;

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

// Función mejorada de verificación de acceso
async function verificarAccesoBarbero() {
  console.log("[Debug] Iniciando verificación de acceso...");
  
  // 1. Verificar sesión existente
  const session = JSON.parse(localStorage.getItem('barberSession') || '{}');
  
  if (session.token && new Date(session.expires) > new Date()) {
    console.log("[Debug] Sesión válida encontrada:", session);
    actualizarTiempoSesion(session.expires);
    document.getElementById('nombre-barbero').textContent = `(${session.nombre})`;
    return true;
  }

  // 2. Mostrar modal de verificación
  const modal = document.getElementById('modal-verificacion');
  modal.style.display = 'flex';
  document.getElementById('input-email').focus();
  
  // 3. Configurar el proceso de verificación
  return new Promise((resolve) => {
    let intentos = 0;
    const maxIntentos = 3;
    
    const verificarCredenciales = async () => {
      const email = document.getElementById('input-email').value.trim();
      const password = document.getElementById('input-password').value;
      
      console.log("[Debug] Intentando login con:", email);
      
      if (!email || !password) {
        mostrarErrorVerificacion('Ambos campos son requeridos');
        return;
      }

      try {
        // 4. Consulta a Supabase con timeout
        const consultaTimeout = setTimeout(() => {
          mostrarErrorVerificacion('Tiempo de espera agotado. Intente nuevamente.');
        }, 5000);

        const { data, error } = await supabase
          .from('barberos')
          .select('id, nombre, email')
          .eq('email', email)
          .eq('password', password)
          .eq('activo', true)
          .single();
        
        clearTimeout(consultaTimeout);
        
        console.log("[Debug] Respuesta de Supabase:", { data, error });
        
        if (error || !data) {
          intentos++;
          if (intentos >= maxIntentos) {
            mostrarErrorVerificacion('Demasiados intentos fallidos. Redirigiendo...');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
          }
          
          mostrarErrorVerificacion(`Credenciales incorrectas. Intentos restantes: ${maxIntentos - intentos}`);
          document.getElementById('input-password').value = '';
          document.getElementById('input-password').focus();
          return;
        }
        
        // 5. Crear sesión segura
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
        console.error('[Error] En verificación:', error);
        mostrarErrorVerificacion('Error en el sistema. Intente más tarde.');
        resolve(false);
      }
    };
    
    // Función para mostrar errores
    function mostrarErrorVerificacion(mensaje) {
      const errorElement = document.getElementById('mensaje-error-verificacion');
      errorElement.textContent = mensaje;
      errorElement.style.display = 'block';
      console.error('[Error] Autenticación:', mensaje);
    }
    
    // Configurar eventos
    document.getElementById('btn-verificar').onclick = verificarCredenciales;
    
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

// Configurar cierre de sesión
function configurarCierreSesion() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('barberSession');
      mostrarNotificacion('Sesión cerrada correctamente', 'success');
      setTimeout(() => window.location.href = 'index.html', 1000);
    });
  }
}

// Cargar lista de barberos
async function cargarBarberos() {
  try {
    const { data, error } = await supabase
      .from('barberos')
      .select('id, nombre')
      .eq('activo', true);
    
    if (error) throw error;
    
    barberosDisponibles = data || [];
    
    // Actualizar selector de barberos
    const selectBarbero = document.getElementById('filtro-barbero');
    if (selectBarbero) {
      // Limpiar opciones excepto la primera
      while (selectBarbero.options.length > 1) {
        selectBarbero.remove(1);
      }
      
      // Agregar barberos activos
      barberosDisponibles.forEach(barbero => {
        const option = document.createElement('option');
        option.value = barbero.nombre;
        option.textContent = barbero.nombre;
        selectBarbero.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error al cargar barberos:', error);
  }
}

// Inicialización del panel
async function inicializarPanel() {
  console.log("[Debug] Inicializando panel...");
  
  try {
    // 1. Verificar acceso
    const accesoPermitido = await verificarAccesoBarbero();
    if (!accesoPermitido) {
      console.log("[Debug] Acceso no permitido, redirigiendo...");
      return;
    }

    // 2. Configurar eventos
    configurarCierreSesion();
    
    const buscador = document.getElementById('buscador');
    const filtroEstado = document.getElementById('filtro-estado');
    const btnExportar = document.getElementById('btn-exportar');
    
    if (buscador) buscador.addEventListener('input', filtrarCitas);
    if (filtroEstado) filtroEstado.addEventListener('change', filtrarCitas);
    if (btnExportar) btnExportar.addEventListener('click', exportarCitas);
    
    // 3. Cargar datos iniciales
    await cargarBarberos();
    await cargarCitas();
    conectarWebsockets();
    
  } catch (error) {
    console.error('[Error] En inicialización:', error);
    mostrarNotificacion('Error al inicializar el panel', 'error');
    setTimeout(() => window.location.href = 'index.html', 3000);
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanel);

// Funciones que deben estar definidas en scripts.js
async function cargarCitas() {
  // Implementación debe estar en scripts.js
  console.warn('Función cargarCitas() debe ser implementada en scripts.js');
}

function filtrarCitas() {
  // Implementación debe estar en scripts.js
  console.warn('Función filtrarCitas() debe ser implementada en scripts.js');
}

function exportarCitas() {
  // Implementación debe estar en scripts.js
  console.warn('Función exportarCitas() debe ser implementada en scripts.js');
}

function conectarWebsockets() {
  // Implementación debe estar en scripts.js
  console.warn('Función conectarWebsockets() debe ser implementada en scripts.js');
}
