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

// Mostrar detalles de cita en modal
async function mostrarDetallesCita(id) {
  if (modalAbierto) return;
  modalAbierto = true;
  
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
      <button class="btn-cerrar-detalles" style="margin-top: 20px; padding: 10px; background: var(--gold); color: var(--dark); border: none; border-radius: 5px; cursor: pointer;">
        Cerrar detalles
      </button>
    `;
    
    modal.style.display = 'flex';
    
    // Configurar cierre del modal
    document.querySelector('.btn-cerrar-detalles').addEventListener('click', cerrarModal);
    document.querySelector('.close-modal').addEventListener('click', cerrarModal);
    
  } catch (error) {
    console.error('Error al cargar detalles:', error);
    modalBody.innerHTML = '<p class="mensaje-error">Error al cargar los detalles de la cita</p>';
    modal.style.display = 'flex';
  }
}

function cerrarModal() {
  const modal = document.getElementById('modal-detalles');
  modal.style.display = 'none';
  modalAbierto = false;
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
  if (canalCitas) {
    supabase.removeChannel(canalCitas);
  }

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
async function inicializarPanel() {
  try {
    // Verificar acceso primero
    const password = localStorage.getItem('barberoPassword');
    
    if (!password || password !== 'BarberoElite2025') {
      const accesoPermitido = await verificarAccesoBarbero();
      if (!accesoPermitido) {
        window.location.href = 'index.html';
        return;
      }
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
