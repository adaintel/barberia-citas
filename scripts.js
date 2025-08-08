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
  const fechaMinima = manana.toISOString().split('T')[0];
  fechaInput.min = fechaMinima;
  fechaInput.value = fechaMinima; // Establecer valor por defecto
  
  // Configurar hora por defecto (8:00 AM)
  const horaInput = document.getElementById('hora');
  horaInput.min = "08:00";
  horaInput.max = "21:00";
  horaInput.value = "08:00"; // Valor por defecto
  
  // Validación de hora
  horaInput.addEventListener('change', function() {
    const hora = parseInt(this.value.split(':')[0]);
    if (hora < 8 || hora > 21) {
      mostrarMensaje('Nuestro horario de atención es de 8:00 AM a 9:00 PM', 'error');
      this.value = "08:00";
    }
  });

  citaForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.style.display = 'none';
    
    // Validación de campos
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    
    if (!nombre || !telefono) {
      mostrarMensaje('Por favor complete todos los campos', 'error');
      return;
    }

    const citaData = {
      nombre: nombre,
      telefono: telefono,
      fecha: fechaInput.value,
      hora: horaInput.value,
      servicio: document.getElementById('servicio').value,
      barbero: document.getElementById('barbero').value,
      estado: 'pendiente'
    };

    try {
      const { data, error } = await supabase
        .from('citas')
        .insert([citaData])
        .select();
      
      if (error) throw error;
      
      mostrarMensaje('✅ Cita agendada correctamente', 'exito');
      citaForm.reset();
      fechaInput.value = fechaMinima; // Restablecer fecha
      horaInput.value = "08:00"; // Restablecer hora
      
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
