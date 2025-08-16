document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button');

    try {
        submitBtn.disabled = true;
        errorElement.textContent = '';
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: "admin",  // Credenciales fijas para prueba
                password: "admin123" 
            }),
            credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error en la autenticación');
        }

        // Redirigir solo si la respuesta es exitosa
        if (data.success) {
            window.location.href = 'panel-admin.html';
        } else {
            throw new Error('Credenciales incorrectas');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = error.message;
    } finally {
        submitBtn.disabled = false;
    }
});