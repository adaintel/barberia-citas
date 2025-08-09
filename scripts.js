document.addEventListener('DOMContentLoaded', function() {
  // Inicialización de Supabase
  const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';
  const supabase = supabase.createClient(supabaseUrl, supabaseKey);

  // Función para mostrar mensajes
  function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;
    
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje-${tipo}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
      mensajeDiv.style.display = 'none';
    }, 5000);
  }

  // Inicializar selectores de fecha/hora
  function inicializarSelectores() {
    const fechaInput = document.getElementById('fecha');
    const horaInput = document.getElementById('hora');
    
    if (!fechaInput || !horaInput) return;

    // Configurar fecha mínima (mañana)
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    fechaInput.min = manana.toISOString().split('T')[0];
    fechaInput.value = manana.toISOString().split('T')[0];
    
    // Configurar hora por defecto (8:00 AM)
    horaInput.min = "08:00";
    horaInput.max = "21:00";
    horaInput.value = "08:00";
  }

  // Manejar envío del formulario
  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const nombre = document.getElementById('nombre').value.trim();
      const telefono = document.getElementById('telefono').value.trim();
      const fecha = document.getElementById('fecha').value;
      const hora = document.getElementById('hora').value;
      const servicio = document.getElementById('servicio').value;
      const barbero = document.getElementById('barbero').value;
      
      if (!nombre || !telefono || !fecha || !hora || !servicio || !barbero) {
        mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('citas')
          .insert([{
            nombre: nombre,
            telefono: telefono,
            fecha: fecha,
            hora: hora,
            servicio: servicio,
            barbero: barbero,
            estado: 'pendiente'
          }])
          .select();
        
        if (error) throw error;
        
        mostrarMensaje('✅ Cita agendada correctamente', 'exito');
        this.reset();
        inicializarSelectores();
        
      } catch (error) {
        console.error('Error al agendar cita:', error);
        mostrarMensaje('❌ Error al agendar: ' + error.message, 'error');
      }
    });
  }

  // Inicializar al cargar
  inicializarSelectores();
});
