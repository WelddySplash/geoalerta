document.getElementById('formulario-paciente').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener todos los datos del formulario
    const formData = {
        nombre: document.getElementById('nombre').value.trim(),
        fechaNac: document.getElementById('fechaNac').value,
        sexo: document.getElementById('sexo').value,
        tipo_sangre: document.getElementById('tipo_sangre').value || null,
        alergias: document.getElementById('alergias').value.trim() || 'N/A',
        enfermedades: document.getElementById('enfermedades').value.trim() || 'N/A',
        medicamentos: document.getElementById('medicamentos').value.trim() || 'N/A',
        nss: document.getElementById('nss').value.trim(),
        contacto1n: document.getElementById('contacto1n').value.trim() || null,
        contacto1: document.getElementById('contacto1').value.trim() || null,
        contacto2n: document.getElementById('contacto2n').value.trim() || null,
        contacto2: document.getElementById('contacto2').value.trim() || null,
        contacto3n: document.getElementById('contacto3n').value.trim() || null,
        contacto3: document.getElementById('contacto3').value.trim() || null
    };

    try {
        // Mostrar estado de carga
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        // Enviar datos al servidor
        const response = await fetch('http://localhost:3000/registrar-paciente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el registro');
        }

        const data = await response.json();
        
        // Verificar que la URL de ficha esté incluida en la respuesta
        if (!data.ficha_url) {
            throw new Error('El servidor no devolvió la URL de la ficha médica');
        }
        
        // Mostrar mensaje de éxito con la URL
        alert(`Registro exitoso!\n\nFicha médica: ${data.ficha_url}\n\nCopie este enlace para acceso futuro.`);
        
        // Opcional: Reiniciar el formulario
        e.target.reset();

    } catch (error) {
        console.error('Error en el registro:', error);
        alert(`Error al registrar: ${error.message}`);
    } finally {
        // Restaurar el botón
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Registrar Paciente';
        }
    }
});