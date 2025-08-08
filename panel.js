// Variables globales para el panel
let todasLasCitas = [];
let canalCitas;

// Función para cargar citas desde Supabase
async function cargarCitas() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  try {
    contenedor.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando citas...</p>
      </div>
    `;

    const { data: citas, error } = await window.supabaseClient
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    todasLasCitas = citas || [];
    mostrarCitas(todasLasCitas);
    actualizarEstadisticas(todasLasCitas);
    
  } catch (error) {
    console.error('Error:', error);
    contenedor.innerHTML = `
      <div class="mensaje-error">
        <p>Error al cargar citas</p>
        <button onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

// Función para mostrar citas en la tabla
function mostrarCitas(citas) {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  if (!citas || citas.length === 0) {
    contenedor.innerHTML = '<p>No hay citas agendadas actualmente</p>';
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
            ✓
          </button>
          <button class="btn-accion btn-cancelar" data-id="${cita.id}" title="Cancelar">
            ✗
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  contenedor.innerHTML = html;

  // Agregar eventos a los botones
  document.querySelectorAll('.btn-completar').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'completado'));
  });
  
  document.querySelectorAll('.btn-cancelar').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'cancelado'));
  });
}

// Función para cambiar estado de una cita
async function cambiarEstadoCita(id, nuevoEstado) {
  try {
    const { error } = await window.supabaseClient
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    
    if (error) throw error;
    
    // Actualizar la lista de citas
    cargarCitas();
    
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    alert('Error al actualizar el estado de la cita');
  }
}

// Función para filtrar citas
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

// Función para actualizar estadísticas
function actualizarEstadisticas(citas) {
  const totalCitas = document.getElementById('total-citas');
  const pendientesCitas = document.getElementById('pendientes-citas');
  const completadasCitas = document.getElementById('completadas-citas');
  
  if (totalCitas) totalCitas.textContent = citas.length;
  if (pendientesCitas) {
    pendientesCitas.textContent = citas.filter(c => c.estado === 'pendiente').length;
  }
  if (completadasCitas) {
    completadasCitas.textContent = citas.filter(c => c.estado === 'completado').length;
  }
}

// Inicialización del panel
function inicializarPanel() {
  // Configurar buscador
  const buscador = document.getElementById('buscador');
  if (buscador) {
    buscador.addEventListener('input', filtrarCitas);
  }
  
  // Configurar filtros
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroBarbero = document.getElementById('filtro-barbero');
  
  if (filtroEstado) filtroEstado.addEventListener('change', filtrarCitas);
  if (filtroBarbero) filtroBarbero.addEventListener('change', filtrarCitas);
  
  // Cargar citas iniciales
  cargarCitas();
  
  // Actualizar cada 30 segundos
  setInterval(cargarCitas, 30000);
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Configurar Supabase una sola vez
  if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(
      'https://azjlrbmgpczuintqyosm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M'
    );
  }
  
  inicializarPanel();
});
