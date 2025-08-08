// 1. Inicialización de Supabase
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

// Función para inicializar selectores de fecha/hora
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
  
  // Evento para abrir selector al hacer clic en icono
  document.querySelectorAll('.input-group i').forEach(icon => {
    icon.addEventListener('click', function() {
      const input = this.nextElementSibling;
      if (input) input.showPicker();
    });
  });
}

// Inicialización del formulario de cita
function inicializarFormulario() {
  inicializarSelectores();
  
  const citaForm = document.getElementById('citaForm');
  if (!citaForm) return;

  citaForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validación de campos
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    
    if (!nombre || !telefono || !fecha || !hora) {
      mostrarMensaje('Por favor complete todos los campos', 'error');
      return;
    }

    const citaData = {
      nombre: nombre,
      telefono: telefono,
      fecha: fecha,
      hora: hora,
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
      inicializarSelectores(); // Restablecer valores
      
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
