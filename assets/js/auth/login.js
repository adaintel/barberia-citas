document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            
            try {
                const { user, error } = await supabase.auth.signIn({
                    email,
                    password
                });
                
                if (error) throw error;
                
                // Redirección según el rol del usuario
                if (user) {
                    // Aquí deberías verificar el rol del usuario
                    window.location.href = 'client-dashboard.html';
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error.message);
                alert('Error al iniciar sesión: ' + error.message);
            }
        });
    }
});