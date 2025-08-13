document.addEventListener('DOMContentLoaded', async () => {
    const setupSchedule = async () => {
        try {
            const user = supabase.auth.user();
            if (!user) return;
            
            // Cargar horario existente
            const { data: schedule, error } = await supabase
                .from('barber_schedules')
                .select('*')
                .eq('barber_id', user.id)
                .single();
                
            if (error && !error.message.includes('No rows found')) throw error;
            
            // Inicializar interfaz de horario
            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const scheduleContainer = document.getElementById('schedule-container');
            
            scheduleContainer.innerHTML = days.map(day => `
                <div class="day-schedule">
                    <h3>${day}</h3>
                    <label>
                        <input type="checkbox" class="working-day" data-day="${day.toLowerCase()}" 
                               ${schedule?.[`${day.toLowerCase()}_active`] ? 'checked' : ''}>
                        Trabaja este día
                    </label>
                    <div class="time-range">
                        <label>Inicio:</label>
                        <input type="time" class="start-time" data-day="${day.toLowerCase()}" 
                               value="${schedule?.[`${day.toLowerCase()}_start`] || '09:00'}">
                        <label>Fin:</label>
                        <input type="time" class="end-time" data-day="${day.toLowerCase()}" 
                               value="${schedule?.[`${day.toLowerCase()}_end`] || '18:00'}">
                    </div>
                </div>
            `).join('');
            
            // Configurar guardado
            const saveBtn = document.getElementById('save-schedule');
            saveBtn.addEventListener('click', saveSchedule);
        } catch (error) {
            console.error('Error configurando horario:', error.message);
        }
    };
    
    setupSchedule();
});

async function saveSchedule() {
    try {
        const user = supabase.auth.user();
        if (!user) return;
        
        const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const scheduleData = { barber_id: user.id };
        
        days.forEach(day => {
            const isWorking = document.querySelector(`.working-day[data-day="${day}"]`).checked;
            const startTime = document.querySelector(`.start-time[data-day="${day}"]`).value;
            const endTime = document.querySelector(`.end-time[data-day="${day}"]`).value;
            
            scheduleData[`${day}_active`] = isWorking;
            scheduleData[`${day}_start`] = isWorking ? startTime : null;
            scheduleData[`${day}_end`] = isWorking ? endTime : null;
        });
        
        // Upsert (insertar o actualizar)
        const { data, error } = await supabase
            .from('barber_schedules')
            .upsert(scheduleData);
            
        if (error) throw error;
        
        alert('Horario guardado exitosamente!');
    } catch (error) {
        console.error('Error guardando horario:', error.message);
        alert('Error guardando horario: ' + error.message);
    }
}