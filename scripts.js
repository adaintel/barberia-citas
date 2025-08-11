// 1. Configuración Segura de Supabase (usa .env en producción)
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';

// Configuración del Bot de Telegram
const TELEGRAM_BOT_TOKEN = "TU_BOT_TOKEN_AQUI"; // Reemplaza con tu token de BotFather
const TELEGRAM_CHAT_ID = "CHAT_ID_DEL_BARBERO"; // Reemplaza con el chat_id de Antonio

// Inicializar Supabase
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.error('Error: No se pudo inicializar Supabase');
  // Cargar el script dinámicamente si es necesario
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@supabase/supabase-js@2';
  script.onload = () => {
    window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase cargado dinámicamente');
  };
  document.head.appendChild(script);
}

// 2. Función mejorada para mostrar mensajes
function mostrarMensaje(texto, tipo = 'info') {
  const mensajeDiv = document.getElementById('mensaje');
  if (!mensajeDiv) {
    console.warn('No se encontró el elemento para mostrar mensajes');
    return;
  }
  
  // Limpiar mensajes anteriores
  mensajeDiv.innerHTML = '';
  
  // Crear elemento de mensaje
  const mensajeElement = document.createElement('div');
  mensajeElement.className = `mensaje ${tipo}`;
  mensajeElement.textContent = texto;
  
  // Agregar botón de cerrar
  const cerrarBtn = document.createElement('button');
  cerrarBtn.textContent = '×';
  cerrarBtn.className = 'cerrar-mensaje';
  cerrarBtn.onclick = () => mensajeDiv.style.display = 'none';
  
  mensajeElement.prepend(cerrarBtn);
  mensajeDiv.appendChild(mensajeElement);
  mensajeDiv.style.display = 'block';
  
  // Ocultar automáticamente después de 5 segundos
  setTimeout(() => {
    mensajeDiv.style.display = 'none';
  }, 5000);
}

// 3. Validación mejorada de formulario
function validarFormulario({nombre, telefono, fecha, hora}) {
  if (!nombre || nombre.trim().length < 3) {
    return {valido: false, error: 'El nombre debe tener al menos 3 caracteres'};
  }
  
  if (!telefono || !/^\d{10,15}$/.test(telefono)) {
    return {valido: false, error: 'Teléfono debe tener entre 10 y 15 dígitos'};
  }
  
  const fechaCita = new Date(`${fecha}T${hora}`);
  const ahora = new Date();
  
  if (fechaCita < ahora) {
    return {valido: false, error: 'La cita no puede ser en el pasado'};
  }
  
  // Validar horario laboral (8am-9pm)
  const horaCita = hora.split(':')[0];
  if (horaCita < 8 || horaCita > 21) {
    return {valido: false, error: 'Horario no disponible (8:00 - 21:00)'};
  }
  
  return {valido: true};
}

// 4. Función para inicializar selectores con validación
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
  
  // Configurar hora (8:00 AM - 9:00 PM)
  horaInput.min = "08:00";
  horaInput.max = "21:00";
  horaInput.value = "08:00";
  
  // Deshabilitar fines de semana
  fechaInput.addEventListener('change', function() {
    const fechaSeleccionada = new Date(this.value);
    const diaSemana = fechaSeleccionada.getDay();
    
    if (diaSemana === 0 || diaSemana === 6) { // Domingo (0) o Sábado (6)
      mostrarMensaje('No trabajamos fines de semana. Por favor seleccione un día hábil.', 'error');
      this.value = fechaInput.min; // Resetear a fecha mínima
    }
  });
}

// 5. Función para enviar notificación por Telegram
async function enviarNotificacionTelegram(citaData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Configuración de Telegram incompleta. Notificación no enviada.');
    return;
  }

  const mensaje = `📌 *Nueva Cita Agendada*
  
🔹 *Cliente:* ${citaData.nombre}
📞 *Teléfono:* ${citaData.telefono}
📅 *Fecha:* ${new Date(citaData.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
⏰ *Hora:* ${citaData.hora.substring(0, 5)}
✂️ *Servicio:* ${citaData.servicio}
🧔 *Barbero:* ${citaData.barbero}

_¡Por favor confirmar la disponibilidad!_`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: "Markdown"
      })
    });

    const data = await response.json();
    console.log("Notificación enviada a Telegram:", data);
    return data;
  } catch (error) {
    console.error("Error al enviar notificación a Telegram:", error);
    throw error;
  }
}

// 6. Función para guardar cita con RLS habilitado
async function guardarCita(citaData) {
  if (!supabase) {
    throw new Error('Error de conexión con el servidor');
  }

  try {
    const { data, error } = await supabase
      .from('citas')
      .insert([{
        ...citaData,
        estado: 'pendiente',
        creado_en: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('Error Supabase:', error);
      throw new Error(error.message || 'Error al guardar la cita');
    }
    
    // Enviar notificación a Telegram después de guardar
    try {
      await enviarNotificacionTelegram(citaData);
    } catch (telegramError) {
      console.warn("La cita se guardó pero falló la notificación:", telegramError);
    }
    
    return data;
  } catch (error) {
    console.error('Error completo:', error);
    throw error;
  }
}

// 7. Inicialización principal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Verificar si Supabase está inicializado
  if (!supabase) {
    mostrarMensaje('Error en la configuración del sistema. Recarga la página.', 'error');
    return;
  }

  // Inicializar selectores de fecha/hora
  inicializarSelectores();

  // Manejar envío del formulario
  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Mostrar estado de carga
      const submitBtn = citaForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Agendando...';
      
      try {
        // Obtener valores del formulario
        const formData = {
          nombre: document.getElementById('nombre').value.trim(),
          telefono: document.getElementById('telefono').value.trim(),
          fecha: document.getElementById('fecha').value,
          hora: document.getElementById('hora').value,
          servicio: document.getElementById('servicio').value,
          barbero: document.getElementById('barbero').value
        };

        // Validar datos
        const validacion = validarFormulario(formData);
        if (!validacion.valido) {
          throw new Error(validacion.error);
        }

        // Guardar cita
        const citaGuardada = await guardarCita(formData);
        console.log('Cita guardada:', citaGuardada);
        
        // Mostrar éxito y resetear
        mostrarMensaje('✅ Cita agendada correctamente. Te esperamos!', 'exito');
        citaForm.reset();
        inicializarSelectores();
        
      } catch (error) {
        console.error('Error al procesar cita:', error);
        mostrarMensaje(`❌ ${error.message}`, 'error');
      } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // Código adicional para el panel del barbero (si existe)
  const barberoPanel = document.getElementById('barberoPanel');
  if (barberoPanel) {
    // Aquí iría el código específico para el panel del barbero
    console.log('Panel del barbero detectado');
  }
});
