document.addEventListener('DOMContentLoaded', () => {
    // Inicializar calendario interactivo
    const calendarEl = document.getElementById('calendar');
    
    if (calendarEl) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: async (fetchInfo, successCallback, failureCallback) => {
                try {
                    const user = supabase.auth.user();
                    if (!user) return;
                    
                    const { data: appointments, error } = await supabase
                        .from('appointments')
                        .select('*')
                        .eq('user_id', user.id)
                        .gte('date', fetchInfo.startStr)
                        .lte('date', fetchInfo.endStr);
                        
                    if (error) throw error;
                    
                    const events = appointments.map(appt => ({
                        title: appt.service,
                        start: `${appt.date}T${appt.time}`,
                        extendedProps: {
                            barber: appt.barber_name,
                            status: appt.status
                        }
                    }));
                    
                    successCallback(events);
                } catch (error) {
                    failureCallback(error);
                }
            },
            eventClick: (info) => {
                alert(`Cita: ${info.event.title}\nBarbero: ${info.event.extendedProps.barber}\nEstado: ${info.event.extendedProps.status}`);
            }
        });
        
        calendar.render();
    }
});