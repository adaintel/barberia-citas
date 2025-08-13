document.addEventListener('DOMContentLoaded', () => {
    const newAppointmentBtn = document.getElementById('new-appointment');
    
    if (newAppointmentBtn) {
        newAppointmentBtn.addEventListener('click', () => {
            // Lógica para crear nueva cita
            console.log('Creando nueva cita...');
            // Aquí iría el código para mostrar un formulario de cita
        });
    }
    
    // Cargar citas del usuario
    loadUserAppointments();
});

async function loadUserAppointments() {
    try {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', supabase.auth.user()?.id);
            
        if (error) throw error;
        
        const appointmentsList = document.getElementById('appointments-list');
        if (appointmentsList) {
            appointmentsList.innerHTML = appointments.map(appointment => `
                <div class="appointment-card">
                    <h3>${appointment.service}</h3>
                    <p>Barbero: ${appointment.barber_name}</p>
                    <p>Fecha: ${new Date(appointment.date).toLocaleDateString()}</p>
                    <p>Hora: ${appointment.time}</p>
                    <button onclick="cancelAppointment('${appointment.id}')">Cancelar</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar citas:', error.message);
    }
}

function cancelAppointment(appointmentId) {
    // Lógica para cancelar cita
    console.log('Cancelando cita:', appointmentId);
}