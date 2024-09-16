const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const initializeData = require('./lib');
const inicializarParametros = require('./parametrosInit');

// Cargar configuración de variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar datos por defecto (roles y usuario admin)
initializeData();

// Inicializar los parámetros
inicializarParametros();

// Inicializar la aplicación de Express
const app = express();

// Middleware para habilitar CORS y manejar JSON en las solicitudes
app.use(cors({
    origin: process.env.FRONTEND_URL, // Leer la URL del frontend desde .env
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Permitir métodos específicos si es necesario
    credentials: true // Si necesitas enviar cookies u otras credenciales
}));
app.use(express.json());

// Rutas
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const authRoutes = require('./routes/authRoutes');
const alertaRoutes = require('./routes/alertaRoutes');
const dashboardReportRoutes = require('./routes/dashboardreportRoutes');
const loteProduccionRoutes = require('./routes/loteProduccionRoutes');
const movimientoInventarioRoutes = require('./routes/movimientoInventarioRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const stockRoutes = require('./routes/stockRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const parametroRoutes = require('./routes/parametrosRoutes');
const prediccionesRoutes = require('./routes/prediccionRoutes');

// Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/dashboard', dashboardReportRoutes);
app.use('/api/lotes', loteProduccionRoutes);
app.use('/api/movimientos', movimientoInventarioRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/parametros', parametroRoutes);
app.use('/api/predicciones', prediccionesRoutes);

// Ruta de prueba para asegurarse de que el servidor esté funcionando
app.get('/', (req, res) => {
    res.send('API en funcionamiento');
});

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware para manejo de errores generales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error en el servidor' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});
