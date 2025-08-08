// Configuración de Supabase
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==================== FUNCIÓN PARA AGENDAR CITAS ====================
document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const mensajeDiv = document.getElementById('mensaje');
  mensajeDiv.style.display = 'none';
  
  // Validación de fecha (no permitir fechas pasadas)
  const fechaSeleccionada = new Date(document.getElementById('fecha').value);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (fechaSeleccionada < hoy) {
    mensajeDiv.textContent = '❌ No puedes agendar citas en fechas pasadas';
    mensajeDiv.className = 'mensaje-error';
    mensajeDiv.style.display = 'block';
    return;
  }

  const citaData = {
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    servicio: document.getElementById('servicio').value,
    barbero: document.getElementById('barbero').value,
    estado: 'pendiente'
    // creado_en se añade automáticamente por Supabase (DEFAULT NOW())
  };

  try {
    const { error } = await supabase.from('citas').insert([citaData]);
    
    if (error) throw error;
    
    mensajeDiv.textContent = '✅ Cita agendada correctamente';
    mensajeDiv.className = 'mensaje-exito';
    mensajeDiv.style.display = 'block';
    
    document.getElementById('citaForm').reset();
    
    setTimeout(() => {
      mensajeDiv.style.display = 'none';
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error);
    mensajeDiv.textContent = '❌ Error al agendar: ' + error.message;
    mensajeDiv.className = 'mensaje-error';
    mensajeDiv.style.display = 'block';
  }
});

// ==================== FUNCIÓN PARA MOSTRAR CITAS ====================
async function mostrarCitas() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  contenedor.innerHTML = '<p>Cargando citas...</p>';

  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

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
      const horaFormateada = cita.hora.substring(0, 5); // Formato HH:MM
      
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

    // Event listeners para botones de acción
    document.querySelectorAll('.btn-completar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'completado'));
    });
    
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'cancelado'));
    });

  } catch (error) {
    console.error('Error:', error);
    contenedor.innerHTML = `
      <div class="mensaje-error">
        <p>Error al cargar citas</p>
        <button onclick="mostrarCitas()">Reintentar</button>
      </div>
    `;
  }
}

// ==================== CAMBIAR ESTADO DE CITA ====================
async function cambiarEstadoCita(id, nuevoEstado) {
  try {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    
    if (error) throw error;
    
    mostrarCitas();
    
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    alert('Error al actualizar el estado de la cita');
  }
}

// ==================== INICIALIZACIÓN ====================
if (window.location.pathname.includes('barbero.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    mostrarCitas();
    setInterval(mostrarCitas, 30000);
  });
}
