document.addEventListener('DOMContentLoaded', async () => {
    const loadBarbers = async () => {
        try {
            const { data: barbers, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'barber')
                .limit(10);
                
            if (error) throw error;
            
            const barbersList = document.getElementById('barbers-list');
            if (barbersList) {
                barbersList.innerHTML = barbers.map(barber => `
                    <div class="barber-card">
                        <img src="${barber.avatar_url || 'assets/img/default-barber.jpg'}" alt="${barber.name}">
                        <h3>${barber.name}</h3>
                        <p>${barber.specialty || 'Barbero profesional'}</p>
                        <p>⭐ ${barber.rating || '5.0'}</p>
                        <button onclick="viewBarber('${barber.id}')">Ver perfil</button>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error cargando barberos:', error.message);
        }
    };
    
    loadBarbers();
});

function viewBarber(barberId) {
    window.location.href = `barber-profile.html?id=${barberId}`;
}