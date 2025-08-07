document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Barbería cargado');
    
    // Código para manejar interacciones del usuario
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Botón clickeado:', this.textContent);
        });
    });
    
    // Puedes agregar más funcionalidades aquí
});
