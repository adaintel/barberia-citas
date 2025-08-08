// Verificar conexión a internet
function verificarConexion() {
  const statusElement = document.getElementById('connection-status');
  if (!statusElement) return;

  if (navigator.onLine) {
    statusElement.className = 'connected';
    statusElement.innerHTML = '<i class="fas fa-circle"></i> En línea';
  } else {
    statusElement.className = 'disconnected';
    statusElement.innerHTML = '<i class="fas fa-circle"></i> Sin conexión';
  }
}

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

// Inicialización del formulario de cita
function inicializarFormulario() {
  const citaForm = document.getElementById('citaForm');
  if (!citaForm) return;

  // Configurar fecha mínima (hoy)
  const fechaInput = document.getElementById('fecha');
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.min = hoy;
  
  // Configurar horario laboral
  const horaInput = document.getElementById('hora');
  horaInput.addEventListener('change', function() {
    const hora = this.value.split(':')[0];
    if (hora < 8 || hora > 18) {
      alert('Nuestro horario de atención es de 8:00 AM a 6:00 PM');
      this.value = '';
    }
  });

  citaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.style.display = 'none';
    
    // Validación de fecha
    const fechaSeleccionada = new Date(fechaInput.value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada < hoy) {
      mostrarMensaje('No puedes agendar citas en fechas pasadas', 'error');
      return;
    }

    const citaData = {
      nombre: document.getElementById('nombre').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      fecha: fechaInput.value,
      hora: horaInput.value,
      servicio: document.getElementById('servicio').value,
      barbero: document.getElementById('barbero').value,
      estado: 'pendiente'
    };

    try {
      const { error } = await window.supabaseClient.from('citas').insert([citaData]);
      
      if (error) throw error;
      
      mostrarMensaje('✅ Cita agendada correctamente', 'exito');
      citaForm.reset();
      
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('❌ Error al agendar: ' + error.message, 'error');
    }
  });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  verificarConexion();
  inicializarFormulario();
  
  window.addEventListener('online', verificarConexion);
  window.addEventListener('offline', verificarConexion);
});
