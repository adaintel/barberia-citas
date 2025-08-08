// Configuración de Supabase (REEMPLAZA CON TUS DATOS)
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co'; // Tu URL de Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M'; // Clave pública (anon)
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==============================================
// FUNCIONALIDAD PARA CLIENTES (cliente.html)
// ==============================================

// Registrar nueva cita
document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Obtener valores del formulario
  const citaData = {
    nombre: document.getElementById('nombre').value,
    telefono: document.getElementById('telefono').value,
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    servicio: document.getElementById('servicio').value,
    barbero: document.getElementById('barbero')?.value || 'Juan', // Default si no hay select
    estado: 'pendiente'
  };

  // Validación básica
  if (!citaData.nombre || !citaData.telefono || !citaData.fecha || !citaData.hora) {
    alert('Por favor completa todos los campos');
    return;
  }

  try {
    // Insertar en Supabase
    const { error } = await supabase.from('citas').insert([citaData]);
    
    if (error) throw error;
    
    // Éxito
    alert('✅ Cita agendada correctamente');
    document.getElementById('citaForm').reset();
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error agendando cita:', error);
    alert('❌ Error al agendar. Intenta nuevamente');
  }
});

// ==============================================
// FUNCIONALIDAD PARA BARBEROS (barbero.html)
// ==============================================

// Cargar y mostrar todas las citas
async function cargarCitasBarbero() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return; // Solo ejecutar en barbero.html

  // Mostrar mensaje de carga
  contenedor.innerHTML = '<p>Cargando citas...</p>';

  try {
    // Obtener citas ordenadas por fecha
    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    // Mostrar mensaje si no hay citas
    if (!citas || citas.length === 0) {
      contenedor.innerHTML = '<p>No hay citas agendadas</p>';
      return;
    }

    // Generar tabla HTML
    let tablaHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
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
      tablaHTML += `
        <tr data-id="${cita.id}">
          <td>${cita.nombre}</td>
          <td>${cita.telefono}</td>
          <td>${cita.fecha}</td>
          <td>${cita.hora}</td>
          <td>${cita.servicio}</td>
          <td class="estado">${cita.estado}</td>
          <td>
            <select class="cambiar-estado">
              <option value="pendiente" ${cita.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="confirmada" ${cita.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
              <option value="completada" ${cita.estado === 'completada' ? 'selected' : ''}>Completada</option>
              <option value="cancelada" ${cita.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
            </select>
          </td>
        </tr>
      `;
    });

    tablaHTML += `</tbody></table>`;
    contenedor.innerHTML = tablaHTML;

    // Agregar eventos para cambiar estado
    document.querySelectorAll('.cambiar-estado').forEach(select => {
      select.addEventListener('change', async function() {
        const fila = this.closest('tr');
        const citaId = fila.dataset.id;
        const nuevoEstado = this.value;

        try {
          const { error } = await supabase
            .from('citas')
            .update({ estado: nuevoEstado })
            .eq('id', citaId);

          if (error) throw error;

          fila.querySelector('.estado').textContent = nuevoEstado;
          alert('Estado actualizado');
        } catch (error) {
          console.error('Error actualizando estado:', error);
          alert('Error al actualizar');
        }
      });
    });

  } catch (error) {
    console.error('Error cargando citas:', error);
    contenedor.innerHTML = '<p>Error al cargar las citas</p>';
  }
}

// ==============================================
// INICIALIZACIÓN (Ejecutar cuando cargue la página)
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
  // Cargar citas solo en la página del barbero
  if (window.location.pathname.includes('barbero.html')) {
    cargarCitasBarbero();
    
    // Actualizar cada 30 segundos
    setInterval(cargarCitasBarbero, 30000);
  }
});
