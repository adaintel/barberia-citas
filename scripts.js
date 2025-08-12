// =============================================
// === CONFIGURACIÓN INICIAL (Código existente) ===
// =============================================
const supabaseUrl = 'https://azjlrbmgpczuintqyosm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6amxyYm1ncGN6dWludHF5b3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjM2MzgsImV4cCI6MjA3MDIzOTYzOH0.1ThXqiMuqRFhCTqsedG6NDFft_ng-QV2qaD8PpaU92M';

// Inicializar Supabase
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.error('Error: No se pudo inicializar Supabase');
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@supabase/supabase-js@2';
  script.onload = () => {
    window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase cargado dinámicamente');
  };
  document.head.appendChild(script);
}

const CONFIG_VENEZUELA = {
  intervaloEntreCitas: 40,
  horarioApertura: '08:00',
  horarioCierre: '21:00',
  zonaHoraria: 'America/Caracas',
  diasTrabajo: [1, 2, 3, 4, 5, 6]
};

// =============================================
// === FUNCIONES ORIGINALES (Sin modificar) ===
// =============================================
function obtenerHoraActualVenezuela() {
  return new Date().toLocaleTimeString('es-VE', {
    timeZone: CONFIG_VENEZUELA.zonaHoraria,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mostrarMensaje(texto, tipo = 'info') {
  const mensajeDiv = document.getElementById('mensaje');
  if (!mensajeDiv) {
    console.warn('No se encontró el elemento para mostrar mensajes');
    return;
  }
  
  mensajeDiv.innerHTML = '';
  mensajeDiv.className = '';
  
  const mensajeElement = document.createElement('div');
  mensajeElement.className = `mensaje ${tipo}`;
  mensajeElement.textContent = texto;
  
  const cerrarBtn = document.createElement('button');
  cerrarBtn.textContent = '×';
  cerrarBtn.className = 'cerrar-mensaje';
  cerrarBtn.onclick = () => mensajeDiv.style.display = 'none';
  
  mensajeElement.prepend(cerrarBtn);
  mensajeDiv.appendChild(mensajeElement);
  mensajeDiv.style.display = 'block';
  
  setTimeout(() => {
    mensajeDiv.style.display = 'none';
  }, 5000);
}

async function verificarDisponibilidad(fecha, hora) {
  try {
    const [horaSel, minSel] = hora.split(':').map(Number);
    const minutosSel = horaSel * 60 + minSel;
    
    const { data: citas, error } = await supabase
      .from('citas')
      .select('hora')
      .eq('fecha', fecha);
    
    if (error) throw error;
    
    for (const cita of citas) {
      const [horaExistente, minExistente] = cita.hora.split(':').map(Number);
      const minutosExistente = horaExistente * 60 + minExistente;
      
      const diferencia = Math.abs(minutosSel - minutosExistente);
      
      if (diferencia < CONFIG_VENEZUELA.intervaloEntreCitas) {
        return {
          disponible: false,
          mensaje: `El horario ${hora} no está disponible. Por favor elige otro.`
        };
      }
    }
    
    return { disponible: true };
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    return {
      disponible: false,
      mensaje: 'Error al verificar disponibilidad. Intenta nuevamente.'
    };
  }
}

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
  
  const [horaCita, minCita] = hora.split(':').map(Number);
  const [horaApertura] = CONFIG_VENEZUELA.horarioApertura.split(':').map(Number);
  const [horaCierre] = CONFIG_VENEZUELA.horarioCierre.split(':').map(Number);
  
  if (horaCita < horaApertura || horaCita >= horaCierre) {
    return {
      valido: false, 
      error: `Horario no disponible (${CONFIG_VENEZUELA.horarioApertura} a ${CONFIG_VENEZUELA.horarioCierre})`
    };
  }
  
  return {valido: true};
}

function inicializarSelectores() {
  const fechaInput = document.getElementById('fecha');
  const horaInput = document.getElementById('hora');
  
  if (!fechaInput || !horaInput) return;

  const hoy = new Date();
  const hoyVenezuela = hoy.toLocaleString('es-VE', { timeZone: CONFIG_VENEZUELA.zonaHoraria });
  const fechaMinima = hoyVenezuela.split(',')[0].trim().split('/').reverse().join('-');
  
  fechaInput.min = fechaMinima;
  fechaInput.value = fechaMinima;
  
  horaInput.min = CONFIG_VENEZUELA.horarioApertura;
  horaInput.max = CONFIG_VENEZUELA.horarioCierre;
  
  const horaActual = obtenerHoraActualVenezuela();
  horaInput.value = horaActual;
  
  fechaInput.addEventListener('change', function() {
    const fechaSeleccionada = new Date(this.value);
    const diaSemana = fechaSeleccionada.getDay();
    
    if (!CONFIG_VENEZUELA.diasTrabajo.includes(diaSemana)) {
      mostrarMensaje('No trabajamos los domingos. Por favor seleccione un día hábil de Lunes a Sábado.', 'error');
      this.value = fechaInput.min;
    }
  });
}

async function enviarNotificacionTelegram(citaData) {
  const BOT_TOKEN = "8234692500:AAGp3vPMX3i78TRhfpfDteNXX8S4PTGj6t4";
  const CHAT_ID = "5852644122";
  
  try {
    const mensaje = `📌 *Nueva cita agendada*:\n👤 Cliente: *${citaData.nombre}* (${citaData.telefono})\n📅 Fecha: *${citaData.fecha}*\n⏰ Hora: *${citaData.hora}*\n✂️ Servicio: *${citaData.servicio}*\n💈 Barbero: *${citaData.barbero}*`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) throw new Error('Error al enviar notificación a Telegram');
    console.log('Notificación enviada al barbero');
  } catch (error) {
    console.error('Error en notificación Telegram:', error);
  }
}

async function guardarCita(citaData) {
  if (!supabase) throw new Error('Error de conexión con el servidor');

  try {
    const disponibilidad = await verificarDisponibilidad(citaData.fecha, citaData.hora);
    if (!disponibilidad.disponible) throw new Error(disponibilidad.mensaje);

    const { data, error } = await supabase
      .from('citas')
      .insert([{
        ...citaData,
        estado: 'pendiente',
        creado_en: new Date().toISOString()
      }])
      .select();
    
    if (error) throw new Error(error.message || 'Error al guardar la cita');
    
    enviarNotificacionTelegram(citaData).catch(e => console.error(e));
    return data;
  } catch (error) {
    console.error('Error completo:', error);
    throw error;
  }
}

// =============================================
// === MEJORAS NUEVAS PARA MÓVILES/TABLETS ===
// =============================================
function esDispositivoMovil() {
  return window.innerWidth <= 1024; // Tablet o móvil
}

function optimizarUI() {
  if (!esDispositivoMovil()) return;

  // 1. Ajustar inputs y botones
  const elementosTouch = document.querySelectorAll('input, select, button, textarea');
  elementosTouch.forEach(elemento => {
    elemento.style.minHeight = '48px';
    elemento.style.fontSize = '16px';
    if (elemento.id === 'telefono') elemento.type = 'tel';
  });

  // 2. Formularios más anchos
  document.querySelectorAll('form').forEach(form => {
    form.style.padding = '12px';
    form.style.maxWidth = '100%';
  });

  // 3. Mensajes adaptados
  const mensajes = document.querySelectorAll('.mensaje');
  mensajes.forEach(msg => {
    msg.style.width = '90%';
    msg.style.left = '5%';
  });
}

// =============================================
// === INICIALIZACIÓN (Código existente + nuevo) ===
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  // Aplicar mejoras para móviles
  optimizarUI();
  window.addEventListener('resize', optimizarUI);

  // Código original de inicialización
  if (!supabase) {
    mostrarMensaje('Error en la configuración del sistema. Recarga la página.', 'error');
    return;
  }

  inicializarSelectores();

  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = citaForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
      
      try {
        const formData = {
          nombre: document.getElementById('nombre').value.trim(),
          telefono: document.getElementById('telefono').value.trim(),
          fecha: document.getElementById('fecha').value,
          hora: document.getElementById('hora').value,
          servicio: document.getElementById('servicio').value,
          barbero: document.getElementById('barbero').value
        };

        const validacion = validarFormulario(formData);
        if (!validacion.valido) throw new Error(validacion.error);

        const citaGuardada = await guardarCita(formData);
        mostrarMensaje('✅ Cita agendada correctamente. Te esperamos!', 'exito');
        citaForm.reset();
        inicializarSelectores();
        
      } catch (error) {
        mostrarMensaje(`❌ ${error.message}`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
});
