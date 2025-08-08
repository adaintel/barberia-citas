// Configuración de Supabase (REEMPLAZA CON TUS DATOS)
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==================== FUNCIÓN PARA AGENDAR CITAS ====================
document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const mensajeDiv = document.getElementById('mensaje');
  mensajeDiv.style.display = 'none';
  
  const citaData = {
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    servicio: document.getElementById('servicio').value,
    barbero: document.getElementById('barbero').value,
    estado: 'pendiente',
    creado_en: new Date().toISOString()
  };

  try {
    const { error } = await supabase.from('citas').insert([citaData]);
    
    if (error) throw error;
    
    // Mostrar mensaje de éxito
    mensajeDiv.textContent = '✅ Cita agendada correctamente';
    mensajeDiv.className = 'mensaje-exito';
    mensajeDiv.style.display = 'block';
    
    // Resetear formulario
    document.getElementById('citaForm').reset();
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      mensajeDiv.style.display = 'none';
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error);
    
    // Mostrar mensaje de error
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
    // Obtener la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .gte('fecha', hoy) // Solo citas desde hoy en adelante
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    if (!citas || citas.length === 0) {
      contenedor.innerHTML = '<p>No hay citas agendadas</p>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="tabla-citas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
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
      // Formatear fecha para mostrar como DD/MM/YYYY
      const fechaFormateada = cita.fecha.split('-').reverse().join('/');
      
      html += `
        <tr>
          <td>${cita.nombre}</td>
          <td>${cita.telefono}</td>
          <td>${fechaFormateada}</td>
          <td>${cita.hora}</td>
          <td>${cita.servicio}</td>
          <td>${cita.barbero}</td>
          <td class="estado-cita" data-estado="${cita.estado}">${cita.estado}</td>
          <td>
            <button class="btn-completar" data-id="${cita.id}">✓</button>
            <button class="btn-cancelar" data-id="${cita.id}">✗</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;

    // Agregar event listeners a los botones de acción
    document.querySelectorAll('.btn-completar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'completado'));
    });
    
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstadoCita(btn.dataset.id, 'cancelado'));
    });

  } catch (error) {
    console.error('Error:', error);
    contenedor.innerHTML = '<p class="mensaje-error">Error al cargar citas. Por favor recarga la página.</p>';
  }
}

// ==================== FUNCIÓN PARA CAMBIAR ESTADO DE CITA ====================
async function cambiarEstadoCita(id, nuevoEstado) {
  try {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id);
    
    if (error) throw error;
    
    // Recargar las citas después de actualizar
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
    
    // Actualizar cada 30 segundos
    setInterval(mostrarCitas, 30000);
  });
}
