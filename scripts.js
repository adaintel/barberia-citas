// Configuración de Supabase
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

// Inicialización del formulario de cita
function inicializarFormulario() {
  const citaForm = document.getElementById('citaForm');
  if (!citaForm) return;

  // Configurar fecha mínima (mañana)
  const fechaInput = document.getElementById('fecha');
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  fechaInput.min = manana.toISOString().split('T')[0];
  
  // Configurar horario laboral (8am-9pm)
  const horaInput = document.getElementById('hora');
  horaInput.min = "08:00";
  horaInput.max = "21:00";
  
  horaInput.addEventListener('change', function() {
    const hora = parseInt(this.value.split(':')[0]);
    if (hora < 8 || hora > 21) {
      mostrarMensaje('Nuestro horario de atención es de 8:00 AM a 9:00 PM', 'error');
      this.value = '';
    }
  });

  citaForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.style.display = 'none';
    
    // Validación de fecha
    const fechaSeleccionada = new Date(fechaInput.value);
    fechaSeleccionada.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada < manana) {
      mostrarMensaje('Debes agendar con al menos un día de anticipación', 'error');
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
      const { error } = await supabase.from('citas').insert([citaData]);
      
      if (error) throw error;
      
      mostrarMensaje('✅ Cita agendada correctamente', 'exito');
      citaForm.reset();
      
    } catch (error) {
      console.error('Error al agendar cita:', error);
      mostrarMensaje('❌ Error al agendar: ' + error.message, 'error');
    }
  });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  inicializarFormulario();
});
