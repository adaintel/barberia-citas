document.addEventListener('DOMContentLoaded', function() {
    // Cerrar automáticamente las alertas después de 5 segundos
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Validación de campos de fecha/hora
    const fechaInput = document.getElementById('fecha');
    const horaInput = document.getElementById('hora');
    
    if (fechaInput && horaInput) {
        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
        
        // Validar horario laboral
        horaInput.addEventListener('change', function() {
            const hora = this.value;
            if (hora < '09:00' || hora > '18:00') {
                this.setCustomValidity('Horario de atención: 09:00 - 18:00');
            } else {
                this.setCustomValidity('');
            }
        });
    }
});
