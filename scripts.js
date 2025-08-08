const supabaseUrl = 'TU_URL_SUPABASE';
const supabaseKey = 'TU_KEY_PUBLICA'; // Usa la clave ANON/public
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Agendar cita
document.getElementById('citaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cita = {
    nombre: document.getElementById('nombre').value,
    telefono: document.getElementById('telefono').value,
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value,
    servicio: document.getElementById('servicio').value,
    barbero: 'Juan', // Puedes hacerlo dinámico
    estado: 'pendiente'
  };

  const { error } = await supabase.from('citas').insert([cita]);
  
  if (!error) {
    alert('¡Cita agendada!');
    window.location.href = 'index.html';
  }
});

// Mostrar citas (para barbero)
async function loadCitas() {
  const { data: citas } = await supabase.from('citas').select('*');
  
  if (citas) {
    const table = document.createElement('table');
    citas.forEach(cita => {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${cita.nombre}</td>
        <td>${cita.telefono}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>${cita.servicio}</td>
        <td>${cita.estado}</td>
      `;
    });
    document.body.appendChild(table);
  }
}

// Ejecutar solo en barbero.html
if (window.location.pathname.includes('barbero.html')) {
  loadCitas();
}
