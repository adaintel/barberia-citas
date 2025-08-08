// Configuración de Supabase (REEMPLAZA CON TUS DATOS)
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co'; // Tu URL de Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M'; // Clave pública (anon)
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==================== FUNCIÓN PARA AGENDAR CITAS ====================
document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const citaData = {
    nombre: document.getElementById('nombre').value,
    telefono: document.getElementById('telefono').value,
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    servicio: document.getElementById('servicio').value,
    barbero: document.getElementById('barbero')?.value || 'Juan',
    estado: 'pendiente'
  };

  try {
    const { error } = await supabase.from('citas').insert([citaData]);
    
    if (error) throw error;
    
    alert('✅ Cita agendada correctamente');
    document.getElementById('citaForm').reset();
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al agendar: ' + error.message);
  }
});

// ==================== FUNCIÓN PARA MOSTRAR CITAS ====================
async function mostrarCitas() {
  const contenedor = document.getElementById('citasContainer');
  if (!contenedor) return;

  contenedor.innerHTML = '<p>Cargando citas...</p>';

  try {
    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    if (!citas || citas.length === 0) {
      contenedor.innerHTML = '<p>No hay citas agendadas aún</p>';
      return;
    }

    let html = `
      <table class="tabla-citas">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Servicio</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
    `;

    citas.forEach(cita => {
      html += `
        <tr>
          <td>${cita.nombre}</td>
          <td>${cita.telefono}</td>
          <td>${cita.fecha}</td>
          <td>${cita.hora}</td>
          <td>${cita.servicio}</td>
          <td class="estado-cita">${cita.estado}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;

  } catch (error) {
    console.error('Error:', error);
    contenedor.innerHTML = '<p class="error">Error al cargar citas. Recarga la página.</p>';
  }
}

// ==================== INICIALIZACIÓN ====================
if (window.location.pathname.includes('barbero.html')) {
  document.addEventListener('DOMContentLoaded', mostrarCitas);
  
  // Actualizar cada 30 segundos
  setInterval(mostrarCitas, 30000);
}
