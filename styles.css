// Esperamos a que todo el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // 1. Configuración de Supabase
  const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
  const supabase = supabase.createClient(supabaseUrl, supabaseKey);

  // 2. Función para mostrar citas (actualizada)
  async function mostrarCitas() {
    const contenedor = document.getElementById('citasContainer');
    if (!contenedor) return;

    try {
      contenedor.innerHTML = '<p class="cargando">Cargando citas...</p>';
      
      const { data: citas, error } = await supabase
        .from('citas')
        .select('*')
        .order('fecha_completa', { ascending: true });

      if (error) throw error;

      if (!citas || citas.length === 0) {
        contenedor.innerHTML = '<p class="no-citas">No hay citas agendadas aún</p>';
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
        const fecha = new Date(cita.fecha_completa);
        html += `
          <tr>
            <td>${cita.nombre}</td>
            <td>${cita.telefono}</td>
            <td>${fecha.toLocaleDateString('es-ES')}</td>
            <td>${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${cita.servicio}</td>
            <td class="estado-${cita.estado}">${cita.estado}</td>
          </tr>
        `;
      });

      contenedor.innerHTML = html + '</tbody></table>';
    } catch (error) {
      console.error('Error al cargar citas:', error);
      contenedor.innerHTML = `
        <p class="error">Error al cargar citas</p>
        <button onclick="location.reload()">Reintentar</button>
      `;
    }
  }

  // 3. Suscripción a cambios en tiempo real
  function iniciarSuscripcion() {
    supabase
      .channel('citas_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'citas'
      }, () => {
        mostrarCitas();
      })
      .subscribe();
  }

  // 4. Inicialización para barbero.html
  if (window.location.pathname.includes('barbero.html')) {
    mostrarCitas();
    iniciarSuscripcion();
    setInterval(mostrarCitas, 30000); // Refresco cada 30s
  }

  // 5. Manejador de formulario para cliente.html
  document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const citaData = {
      nombre: document.getElementById('nombre').value,
      telefono: document.getElementById('telefono').value,
      fecha: document.getElementById('fecha').value,
      hora: document.getElementById('hora').value,
      fecha_completa: new Date(
        `${document.getElementById('fecha').value}T${document.getElementById('hora').value}:00`
      ).toISOString(),
      servicio: document.getElementById('servicio').value,
      barbero: 'Juan',
      estado: 'pendiente'
    };

    try {
      const { error } = await supabase.from('citas').insert([citaData]);
      if (error) throw error;
      
      alert('✅ Cita agendada correctamente');
      document.getElementById('citaForm').reset();
    } catch (error) {
      console.error('Error al agendar:', error);
      alert('❌ Error: ' + error.message);
    }
  });
});
