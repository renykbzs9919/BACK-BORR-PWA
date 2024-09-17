const express = require('express');
const router = express.Router();
const preventaController = require('../controllers/preventaController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

//confirmar entrega de preventa
router.post('/confirmar-entrega', authMiddleware, checkPermissions('confirmar_entrega_preventa'), preventaController.confirmarEntregaPreventa);
// Crear una nueva preventa
router.post('/', authMiddleware, checkPermissions('crear_preventa'), preventaController.crearPreventa);

// Obtener todas las preventas
router.get('/', authMiddleware, checkPermissions('ver_preventas'), preventaController.obtenerPreventas);

// Obtener una preventa por ID
router.get('/:id', authMiddleware, checkPermissions('ver_preventa_id'), preventaController.obtenerPreventaPorId);

// Actualizar una preventa
router.put('/:id', authMiddleware, checkPermissions('actualizar_preventa_id'), preventaController.actualizarPreventa);

// Eliminar una preventa
router.delete('/:id', authMiddleware, checkPermissions('eliminar_preventa_id'), preventaController.eliminarPreventa);

// Obtener preventas por cliente
router.get('/cliente/:clienteId', authMiddleware, checkPermissions('ver_preventa_cliente'), preventaController.obtenerPreventasPorCliente);

module.exports = router;
