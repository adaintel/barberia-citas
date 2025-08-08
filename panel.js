// Configuración de Supabase (misma que en scripts.js)
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Variables globales
let todasLasCitas = [];
let canalCitas;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  // Cargar citas iniciales
  cargarCitas();
  
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
  
  // Configurar botón de exportar
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarCitas);
  }
  
  // Conectar a websockets para cambios en tiempo real
  conectarWebsockets();
  
  // Actualizar cada 30 segundos por si fallan los websockets
  setInterval(cargarCitas, 30000);
});

// Cargar citas desde Supabase
async function cargarCitas() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  try {
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
    console.error('Error:', error);
    contenedor.innerHTML = `
      <div class="mensaje-error">
        <p>Error al cargar citas</p>
        <button onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

// Mostrar citas en la tabla
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
          <button class="btn-accion btn-detalles" data-id="${cita.id}" title="Detalles">
            <i class="fas fa-eye"></i>
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
  
  document.querySelectorAll('.btn-detalles').forEach(btn => {
    btn.addEventListener('click', () => mostrarDetallesCita(btn.dataset.id));
  });
}

// Filtrar citas según búsqueda y filtros
function filtrarCitas() {
  const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
  const filtroEstado = document.getElementById('filtro-estado').value;
  const filtroBarbero = document.getElementById('filtro-barbero').value;

  let citasFiltradas = todasLasCitas.filter(cita => {
    const coincideNombre = cita.nombre.toLowerCase().includes(textoBusqueda);
    const coincideTelefono = cita.telefono.includes(textoBusqueda);
    const coincideEstado = filtroEstado === 'todas' || cita.estado === filtroEstado;
    const coincideBarbero = filtroBarbero === 'todos' || cita.barbero === filtroBarbero;
    
    return (coincideNombre || coincideTelefono) && coincideEstado && coincideBarbero;
  });

  mostrarCitas(citasFiltradas);
}

// Cambiar estado de una cita
async function cambiarEstadoCita(id, nuevoEstado) {
  try {
    const { error } = await supabase
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

// Mostrar detalles de una cita en modal
async function mostrarDetallesCita(id) {
  const modal = document.getElementById('modal-detalles');
  const modalBody = document.getElementById('modal-body');
  
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
    `;
    
    modal.style.display = 'block';
    
  } catch (error) {
    console.error('Error al cargar detalles:', error);
    modalBody.innerHTML = '<p class="mensaje-error">Error al cargar los detalles de la cita</p>';
    modal.style.display = 'block';
  }
  
  // Cerrar modal
  document.querySelector('.close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Actualizar estadísticas
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

// Exportar citas a CSV
function exportarCitas() {
  const citas = todasLasCitas;
  if (!citas || citas.length === 0) {
    alert('No hay citas para exportar');
    return;
  }
  
  let csv = 'Nombre,Telefono,Fecha,Hora,Servicio,Barbero,Estado\n';
  
  citas.forEach(cita => {
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
      cargarCitas();
      mostrarNotificacion('La lista de citas se ha actualizado');
    })
    .subscribe();
}

// Mostrar notificación
function mostrarNotificacion(mensaje) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification('Barbería Elite', { body: mensaje });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('Barbería Elite', { body: mensaje });
      }
    });
  }
}
