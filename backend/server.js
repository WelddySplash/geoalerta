require('dotenv').config();
const express = require('express');
const path = require('path'); // Añade esto al inicio
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());

// Middlewares cruciales (colócalos en este orden)
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Ruta absoluta

// Ruta para la raíz
app.get('/', (req,res) => {
    console.log()
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
        const fichaUrl = `${process.env.BASE_URL || 'https://geoalerta.vercel.app'}/ficha-medica.html?uuid=${uuid}`;
        
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
// Endpoint SIMPLIFICADO para ficha médica
app.get('/ficha-medica/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        // Consulta DIRECTA a la base de datos
        const { rows } = await pool.query(`
            SELECT * FROM usuarios 
            WHERE uuid = $1
        `, [uuid]);
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                error: 'Paciente no encontrado' 
            });
        }
        // Devuelve TODOS los datos sin filtrar
        res.status(200).json(rows[0]);
        
    } catch (err) {
        console.error('Error en ficha médica:', err);
        res.status(500).json({ 
            error: 'Error de servidor',
            details: err.message 
        });
    }
});

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
        const baseUrl = process.env.BASE_URL || 'https://geoalerta.vercel.app';
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

// Endpoint para solicitar ayuda
app.post('/solicitar-ayuda', async (req, res) => {
    try {
        const { uuid, latitud, longitud } = req.body;

        // 1. Verificar que el UUID existe y obtener el ID del usuario
        const userQuery = await pool.query(
            'SELECT id FROM usuarios WHERE uuid = $1', 
            [uuid]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Paciente no encontrado' 
            });
        }

        const usuarioId = userQuery.rows[0].id;

        // 2. Insertar la solicitud de ayuda
        const insertQuery = `
            INSERT INTO solicitudes_ayuda (
                usuario_id, uuid, latitud, longitud
            ) VALUES ($1, $2, $3, $4)
            RETURNING id, timestamp
        `;

        const { rows } = await pool.query(insertQuery, [
            usuarioId,
            uuid,
            latitud,
            longitud
        ]);

        // 3. Obtener información del paciente y contactos para notificación
        const pacienteQuery = await pool.query(`
            SELECT nombre, contacto1, contacto2, contacto3 
            FROM usuarios 
            WHERE id = $1
        `, [usuarioId]);

        const paciente = pacienteQuery.rows[0];

        // 4. Responder con éxito
        res.json({ 
            success: true,
            solicitud_id: rows[0].id,
            timestamp: rows[0].timestamp,
            paciente: {
                nombre: paciente.nombre,
                contactos: [
                    paciente.contacto1,
                    paciente.contacto2,
                    paciente.contacto3
                ].filter(Boolean) // Filtrar contactos vacíos
            },
            ubicacion: { latitud, longitud },
            mapa_url: `https://www.google.com/maps?q=${latitud},${longitud}`
        });

    } catch (err) {
        console.error('Error en solicitud de ayuda:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// Endpoint para obtener solicitudes de ayuda
app.get('/solicitudes-ayuda', async (req, res) => {
    try {
        const { limit = 50, atendido } = req.query;
        
        let query = `
            SELECT 
                sa.id, sa.timestamp, sa.latitud, sa.longitud, sa.atendido,
                u.id as usuario_id, u.nombre, u.contacto1, u.contacto2, u.contacto3
            FROM solicitudes_ayuda sa
            JOIN usuarios u ON sa.usuario_id = u.id
            ORDER BY sa.timestamp DESC
            LIMIT $1
        `;
        
        let params = [limit];
        
        if (atendido !== undefined) {
            query = query.replace('LIMIT $1', 'WHERE sa.atendido = $2 LIMIT $1');
            params.push(atendido === 'true');
        }
        
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error obteniendo solicitudes:', err);
        res.status(500).json({ error: err.message });
    }
});
// Endpoint para marcar solicitud como atendida
app.put('/solicitudes-ayuda/:id/atender', async (req, res) => {
    try {
        const { id } = req.params;
        const { notas } = req.body;
        
        const { rows } = await pool.query(`
            UPDATE solicitudes_ayuda 
            SET atendido = TRUE, notas = $2
            WHERE id = $1
            RETURNING *
        `, [id, notas]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error actualizando solicitud:', err);
        res.status(500).json({ error: err.message });
    }
});
// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));