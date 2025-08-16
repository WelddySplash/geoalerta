require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend')); // Sirve archivos estáticos desde la carpeta frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
// Conexión a Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Endpoint para registrar pacientes
app.post('/registrar-paciente', async (req, res) => {
    try {
        const uuid = uuidv4(); // Generar UUID único
        const fichaUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/ficha-medica.html?uuid=${uuid}`;
        
        const query = `
            INSERT INTO usuarios (
                nombre, fechaNac, sexo, tipo_sangre, alergias, 
                enfermedades, medicamentos, nss, 
                contacto1n, contacto1, contacto2n, contacto2, contacto3n, contacto3,
                uuid, ficha_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, nombre, ficha_url`;
        
        const values = [
            req.body.nombre,
            req.body.fechaNac,
            req.body.sexo,
            req.body.tipo_sangre,
            req.body.alergias,
            req.body.enfermedades,
            req.body.medicamentos,
            req.body.nss,
            req.body.contacto1n,
            req.body.contacto1,
            req.body.contacto2n,
            req.body.contacto2,
            req.body.contacto3n,
            req.body.contacto3,
            uuid,
            fichaUrl
        ];

        const { rows } = await pool.query(query, values);
        
        // Asegúrate de devolver la ficha_url en la respuesta
        res.json({
            id: rows[0].id,
            nombre: rows[0].nombre,
            ficha_url: rows[0].ficha_url
        });
        
    } catch (err) {
        console.error('Error en el registro:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para obtener ficha médica
async function obtenerFichaMedica(id) {
    try {
        const query = 'SELECT * FROM fichas_medicas WHERE id = $1'; // Ajusta el nombre de la tabla
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            console.log("⚠️ No se encontró la ficha con ID:", id);
            return null;
        }
        
        return result.rows[0]; // Retorna el primer registro encontrado

    } catch (error) {
        console.error("❌ Error en la consulta PostgreSQL:", error.message);
        return null;
    }
}

// Endpoint para obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios ORDER BY creado_en DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar usuario
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.sendStatus(204); // Respuesta exitosa sin contenido
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/pacientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { v4: uuidv4 } = require('uuid');

// Endpoint para actualizar el link UUID
app.put('/actualizar-link/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Generar nuevos valores
        const newUuid = uuidv4();
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const newFichaUrl = `${baseUrl}/ficha-medica.html?uuid=${newUuid}`;

        // 2. Actualizar DB
        const { rows } = await pool.query(`
            UPDATE usuarios 
            SET uuid = $1, ficha_url = $2 
            WHERE id = $3 
            RETURNING uuid, ficha_url
        `, [newUuid, newFichaUrl, id]);

        // 3. Verificar y responder
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Usuario no encontrado' 
            });
        }

        res.json({ 
            success: true,
            uuid: rows[0].uuid,
            ficha_url: rows[0].ficha_url
        });

    } catch (err) {
        console.error('Error en /actualizar-link:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});
// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));