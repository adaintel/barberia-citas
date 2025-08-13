document.addEventListener('DOMContentLoaded', async () => {
    // Cargar citas del barbero
    const loadBarberAppointments = async () => {
        try {
            const user = supabase.auth.user();
            if (!user) return;
            
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('*, clients:profiles(name, phone)')
                .eq('barber_id', user.id)
                .order('date', { ascending: true });
                
            if (error) throw error;
            
            const appointmentsList = document.getElementById('appointments-list');
            if (appointmentsList) {
                appointmentsList.innerHTML = appointments.map(appt => `
                    <div class="appointment-card ${appt.status}">
                        <h3>${appt.service}</h3>
                        <p>Cliente: ${appt.clients.name}</p>
                        <p>Teléfono: ${appt.clients.phone}</p>
                        <p>Fecha: ${new Date(appt.date).toLocaleDateString()}</p>
                        <p>Hora: ${appt.time}</p>
                        <p>Estado: ${appt.status}</p>
                        <div class="actions">
                            ${appt.status === 'pending' ? `
                                <button onclick="updateAppointment('${appt.id}', 'confirmed')">Confirmar</button>
                                <button onclick="updateAppointment('${appt.id}', 'cancelled')">Cancelar</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error cargando citas:', error.message);
        }
    };
    
    loadBarberAppointments();
});

async function updateAppointment(id, status) {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id);
            
        if (error) throw error;
        
        location.reload();
    } catch (error) {
        console.error('Error actualizando cita:', error.message);
    }
}