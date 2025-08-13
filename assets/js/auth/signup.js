document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const name = signupForm.name.value;
            const phone = signupForm.phone.value;
            
            try {
                // Registrar usuario en Auth
                const { user, error } = await supabase.auth.signUp({
                    email,
                    password
                });
                
                if (error) throw error;
                
                // Guardar datos adicionales en tabla profiles
                const { data, error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: user.id, 
                            name, 
                            phone,
                            role: 'client' 
                        }
                    ]);
                
                if (profileError) throw profileError;
                
                alert('Registro exitoso! Por favor verifica tu email.');
                window.location.href = 'client-dashboard.html';
            } catch (error) {
                console.error('Error en registro:', error.message);
                alert('Error en registro: ' + error.message);
            }
        });
    }
});