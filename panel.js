// 1. Primero definimos Supabase al inicio del archivo
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

// Variables globales
let todasLasCitas = [];
let canalCitas;

// Verificación de seguridad para barberos
function verificarAccesoBarbero() {
  const password = localStorage.getItem('barberoPassword');
  if (!password) {
    const inputPassword = prompt('Acceso restringido. Ingrese la contraseña de barbero:');
    if (inputPassword === 'BarberoElite2025') {
      localStorage.setItem('barberoPassword', 'BarberoElite2025');
      return true;
    } else {
      window.location.href = 'index.html';
      return false;
    }
  }
  return true;
}

// Cargar citas desde Supabase
async function cargarCitas() {
  if (!verificarAccesoBarbero()) return;

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

// [Resto del código de panel.js permanece igual...]

// Mostrar citas en la tabla
function mostrarCitas(citas) {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  if (!citas || citas.length === 0) {
    contenedor.innerHTML = '<p class="no-citas">No hay citas agendadas actualmente</p>';
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="tabla-citas">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Servicio</th>
            <th>Barbero</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  citas.forEach(cita => {
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-ES');
    const horaFormateada = cita.hora.substring(0, 5);
    
    html += `
      <tr>
        <td>${cita.nombre}</td>
        <td>${cita.telefono}</td>
        <td>${fechaFormateada}</td>
        <td>${horaFormateada}</td>
        <td>${cita.servicio}</td>
        <td>${cita.barbero}</td>
        <td class="estado-cita" data-estado="${cita.estado}">
          ${cita.estado}
        </td>
        <td class="acciones">
          <button class="btn-accion btn-completar" data-id="${cita.id}" title="Completar">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn-accion btn-cancelar" data-id="${cita.id}" title="Cancelar">
            <i class="fas fa-times"></i>
          </button>
          <button class="btn-accion btn-detalles" data-id="${cita.id}" title="Detalles">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  contenedor.innerHTML = html;
  agregarEventosBotones();
}

// Agregar eventos a los botones de acción
function agregarEventosBotones() {
  document.querySelectorAll('.btn-completar').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'completado'));
  });
  
  document.querySelectorAll('.btn-cancelar').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'cancelado'));
  });
  
  document.querySelectorAll('.btn-detalles').forEach(btn => {
    btn.addEventListener('click', () => mostrarDetallesCita(btn.dataset.id));
  });
}

// Cambiar estado de una cita
async function cambiarEstadoCita(id, nuevoEstado) {
  try {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    
    if (error) throw error;
    
    mostrarNotificacion(`Cita marcada como ${nuevoEstado}`, 'success');
    await cargarCitas();
    
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    mostrarNotificacion('Error al actualizar el estado de la cita', 'error');
  }
}

// Mostrar detalles de cita en modal (corregido para evitar pegado)
async function mostrarDetallesCita(id) {
  const modal = document.getElementById('modal-detalles');
  const modalBody = document.getElementById('modal-body');
  
  // Limpiar eventos anteriores para evitar duplicados
  const oldCloseBtn = document.querySelector('.close-modal');
  if (oldCloseBtn) {
    oldCloseBtn.removeEventListener('click', closeModal);
  }
  
  try {
    const { data: cita, error } = await supabase
      .from('citas')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    modalBody.innerHTML = `
      <div class="detalle-item">
        <h3>Cliente:</h3>
        <p>${cita.nombre}</p>
      </div>
      <div class="detalle-item">
        <h3>Teléfono:</h3>
        <p>${cita.telefono}</p>
      </div>
      <div class="detalle-item">
        <h3>Fecha:</h3>
        <p>${fechaFormateada}</p>
      </div>
      <div class="detalle-item">
        <h3>Hora:</h3>
        <p>${cita.hora.substring(0, 5)}</p>
      </div>
      <div class="detalle-item">
        <h3>Servicio:</h3>
        <p>${cita.servicio}</p>
      </div>
      <div class="detalle-item">
        <h3>Barbero:</h3>
        <p>${cita.barbero}</p>
      </div>
      <div class="detalle-item">
        <h3>Estado:</h3>
        <p class="estado-cita" data-estado="${cita.estado}">${cita.estado}</p>
      </div>
      <div class="detalle-item">
        <button id="btn-calendario" class="btn-accion" title="Agregar al calendario">
          <i class="fas fa-calendar-plus"></i> Agregar a calendario
        </button>
      </div>
    `;
    
    modal.style.display = 'flex'; // Cambiado a flex para mejor centrado
    
    // Configurar botón de calendario
    document.getElementById('btn-calendario')?.addEventListener('click', () => {
      agregarACalendario(cita);
    });
    
    // Configurar cierre del modal
    const closeModal = () => {
      modal.style.display = 'none';
      document.removeEventListener('click', outsideClick);
    };
    
    const outsideClick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.addEventListener('click', outsideClick);
    
  } catch (error) {
    console.error('Error al cargar detalles:', error);
    modalBody.innerHTML = '<p class="mensaje-error">Error al cargar los detalles de la cita</p>';
    modal.style.display = 'flex';
  }
}

// Función para agregar evento al calendario
function agregarACalendario(cita) {
  const startDate = new Date(`${cita.fecha}T${cita.hora}`);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1); // Duración de 1 hora
  
  const event = {
    title: `Cita con ${cita.nombre} - ${cita.servicio}`,
    description: `Servicio: ${cita.servicio}\nBarbero: ${cita.barbero}\nTeléfono: ${cita.telefono}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location: 'Barbería Elite'
  };
  
  // Para Google Calendar
  const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
  
  // Para otros calendarios (ICS)
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `DTSTART:${formatDateForICS(startDate)}`,
    `DTEND:${formatDateForICS(endDate)}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');
  
  const icsBlob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const icsUrl = URL.createObjectURL(icsBlob);
  
  // Crear menú de opciones
  const options = `
    <div class="modal-calendario">
      <h3>Agregar a calendario</h3>
      <a href="${googleUrl}" target="_blank" class="btn-calendario-option">
        <i class="fab fa-google"></i> Google Calendar
      </a>
      <a href="${icsUrl}" download="cita-barberia.ics" class="btn-calendario-option">
        <i class="fas fa-calendar-alt"></i> Descargar (.ics)
      </a>
      <button class="btn-cerrar-calendario">Cerrar</button>
    </div>
  `;
  
  const modalBody = document.getElementById('modal-body');
  modalBody.insertAdjacentHTML('beforeend', options);
  
  // Configurar cierre del menú de calendario
  document.querySelector('.btn-cerrar-calendario')?.addEventListener('click', () => {
    document.querySelector('.modal-calendario')?.remove();
  });
}

// Funciones de ayuda para formatos de fecha
function formatDateForGoogle(date) {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

function formatDateForICS(date) {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

// Filtrar citas
function filtrarCitas() {
  const textoBusqueda = document.getElementById('buscador')?.value.toLowerCase() || '';
  const filtroEstado = document.getElementById('filtro-estado')?.value || 'todas';
  const filtroBarbero = document.getElementById('filtro-barbero')?.value || 'todos';

  let citasFiltradas = todasLasCitas.filter(cita => {
    const coincideNombre = cita.nombre.toLowerCase().includes(textoBusqueda);
    const coincideTelefono = cita.telefono.includes(textoBusqueda);
    const coincideEstado = filtroEstado === 'todas' || cita.estado === filtroEstado;
    const coincideBarbero = filtroBarbero === 'todos' || cita.barbero === filtroBarbero;
    
    return (coincideNombre || coincideTelefono) && coincideEstado && coincideBarbero;
  });

  mostrarCitas(citasFiltradas);
}

// Actualizar estadísticas
function actualizarEstadisticas(citas) {
  const totalCitas = document.getElementById('total-citas');
  const pendientesCitas = document.getElementById('pendientes-citas');
  const completadasCitas = document.getElementById('completadas-citas');
  
  if (totalCitas) totalCitas.textContent = citas.length;
  if (pendientesCitas) pendientesCitas.textContent = citas.filter(c => c.estado === 'pendiente').length;
  if (completadasCitas) completadasCitas.textContent = citas.filter(c => c.estado === 'completado').length;
}

// Exportar citas a CSV
function exportarCitas() {
  if (todasLasCitas.length === 0) {
    mostrarNotificacion('No hay citas para exportar', 'warning');
    return;
  }
  
  let csv = 'Nombre,Telefono,Fecha,Hora,Servicio,Barbero,Estado\n';
  
  todasLasCitas.forEach(cita => {
    csv += `"${cita.nombre}","${cita.telefono}","${cita.fecha}","${cita.hora}","${cita.servicio}","${cita.barbero}","${cita.estado}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `citas_barberia_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion('Exportación completada con éxito', 'success');
}

// Conectar a websockets para cambios en tiempo real
function conectarWebsockets() {
  canalCitas = supabase
    .channel('cambios-citas')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'citas' 
    }, () => {
      mostrarNotificacion('La lista de citas se ha actualizado', 'info');
      cargarCitas();
    })
    .subscribe();
}

// Inicialización del panel
function inicializarPanel() {
  if (!verificarAccesoBarbero()) return;

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
  cargarCitas();
  
  // Configurar actualización automática
  setInterval(cargarCitas, 30000);
  
  // Conectar websockets
  conectarWebsockets();
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  inicializarPanel();
});
