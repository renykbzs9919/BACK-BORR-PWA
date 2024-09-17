const Preventa = require('../models/Preventa');
const Stock = require('../models/Stock');
const Producto = require('../models/Producto');
const Venta = require('../models/Venta');
const moment = require('moment-timezone');

// Crear una nueva preventa
exports.crearPreventa = async (req, res) => {
    try {
        const { clienteId, productos, fechaEntrega, notas } = req.body;

        // Verificar que la fecha de entrega no sea menor a la fecha actual en la zona horaria "America/La_Paz"
        const fechaActual = moment().tz('America/La_Paz').startOf('day');
        const fechaEntregaParsed = moment(fechaEntrega).tz('America/La_Paz').startOf('day');

        if (fechaEntregaParsed.isBefore(fechaActual)) {
            return res.status(400).json({ success: false, message: 'La fecha de entrega no puede ser menor a la fecha actual' });
        }

        // Validar si el cliente ya tiene 2 preventas para la misma fecha
        const preventasDelDia = await Preventa.find({ cliente: clienteId, fechaEntrega: fechaEntregaParsed.toDate() });

        if (preventasDelDia.length >= 2) {
            return res.status(400).json({ success: false, message: 'Ya has realizado 2 preventas para esta fecha.' });
        }

        // Obtener la lista de productos de las preventas existentes para esta fecha
        const productosExistentesEnPreventas = preventasDelDia.flatMap(preventa =>
            preventa.productos.map(producto => producto.producto.toString())
        );

        // Verificar si algún producto en la nueva preventa ya existe en las preventas anteriores del mismo día
        const productosRepetidos = productos.filter(item =>
            productosExistentesEnPreventas.includes(item.producto)
        );

        if (productosRepetidos.length > 0) {
            return res.status(400).json({
                success: false,
                message: `No puedes repetir productos ya existentes en preventas anteriores para esta fecha.`
            });
        }

        // Validar productos y calcular el total
        let total = 0;
        const productosConDetalles = [];

        for (const item of productos) {
            const producto = await Producto.findById(item.producto);
            if (!producto) {
                return res.status(404).json({ success: false, message: `Producto con ID ${item.producto} no encontrado` });
            }

            const precioProducto = producto.precioVenta;
            total += precioProducto * item.cantidad;

            // Añadir los detalles del producto al array
            productosConDetalles.push({
                producto: producto._id,
                cantidad: item.cantidad,
                precio: precioProducto  // Se toma el precio de la BD
            });

            // Actualizar el stock reservado
            const stockProducto = await Stock.findOne({ productoId: producto._id });
            if (stockProducto) {
                stockProducto.stockReservado += item.cantidad;  // Incrementa el stock reservado
                await stockProducto.save();  // Guarda los cambios en el stock
            } else {
                return res.status(404).json({ success: false, message: `No se encontró stock para el producto con ID ${item.producto}` });
            }
        }

        // Crear la preventa con estado "Pendiente"
        const nuevaPreventa = new Preventa({
            cliente: clienteId,
            productos: productosConDetalles,
            fechaEntrega: fechaEntregaParsed.toDate(),  // Fecha de entrega
            total: total,
            estado: 'Pendiente',  // Estado por defecto
            notas: notas || ''  // Notas opcionales
        });

        await nuevaPreventa.save();
        res.status(201).json({ success: true, preventa: nuevaPreventa });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear la preventa' });
    }
};

// Obtener todas las preventas
exports.obtenerPreventas = async (req, res) => {
    try {
        const preventas = await Preventa.find().populate('cliente').populate('productos.producto');
        res.status(200).json({ success: true, preventas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener las preventas' });
    }
};

// Obtener una preventa por ID
exports.obtenerPreventaPorId = async (req, res) => {
    try {
        const preventa = await Preventa.findById(req.params.id).populate('cliente').populate('productos.producto');
        if (!preventa) {
            return res.status(404).json({ success: false, message: 'Preventa no encontrada' });
        }
        res.status(200).json({ success: true, preventa });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener la preventa' });
    }
};

// Actualizar una preventa
exports.actualizarPreventa = async (req, res) => {
    try {
        const { productos, fechaEntrega, estado, notas } = req.body;

        // Verificar si existe la preventa
        let preventa = await Preventa.findById(req.params.id);
        if (!preventa) {
            return res.status(404).json({ success: false, message: 'Preventa no encontrada' });
        }

        // Calcular el nuevo total si se actualizan los productos
        let total = preventa.total;
        if (productos) {
            total = 0;
            for (const item of productos) {
                const producto = await Producto.findById(item.producto);
                if (!producto) {
                    return res.status(404).json({ success: false, message: `Producto con ID ${item.producto} no encontrado` });
                }
                total += producto.precioVenta * item.cantidad;
            }
        }

        // Actualizar la preventa
        preventa.productos = productos || preventa.productos;
        preventa.fechaEntrega = fechaEntrega || preventa.fechaEntrega;
        preventa.estado = estado || preventa.estado;
        preventa.total = total;
        preventa.notas = notas || preventa.notas;

        await preventa.save();
        res.status(200).json({ success: true, preventa });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar la preventa' });
    }
};

// Eliminar una preventa y actualizar el stock reservado
exports.eliminarPreventa = async (req, res) => {
    try {
        // Buscar la preventa por ID
        const preventa = await Preventa.findById(req.params.id);
        if (!preventa) {
            return res.status(404).json({ success: false, message: 'Preventa no encontrada' });
        }

        // Actualizar el stock reservado (reducirlo)
        for (const item of preventa.productos) {
            const stockProducto = await Stock.findOne({ productoId: item.producto });
            if (stockProducto) {
                stockProducto.stockReservado -= item.cantidad;
                if (stockProducto.stockReservado < 0) stockProducto.stockReservado = 0;  // Asegurarse de que no sea negativo
                await stockProducto.save();  // Guardar el cambio en el stock
            }
        }

        // Eliminar la preventa
        await Preventa.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Preventa eliminada correctamente y el stock ha sido actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar la preventa' });
    }
};

// Obtener preventas por cliente
exports.obtenerPreventasPorCliente = async (req, res) => {
    try {
        const preventas = await Preventa.find({ cliente: req.params.clienteId }).populate('productos.producto');
        if (!preventas.length) {
            return res.status(404).json({ success: false, message: 'No se encontraron preventas para este cliente' });
        }
        res.status(200).json({ success: true, preventas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener las preventas del cliente' });
    }
};


// Confirmar entrega de preventa y convertirla en venta o cancelarla
exports.confirmarEntregaPreventa = async (req, res) => {
    try {
        const { clienteId, fechaEntrega, confirmacion } = req.body;  // confirmacion: true si se entregó, false si no se entregó

        // Buscar la preventa para la fecha y cliente
        const preventa = await Preventa.findOne({ cliente: clienteId, fechaEntrega: fechaEntrega, estado: 'Pendiente' });

        if (!preventa) {
            return res.status(404).json({ success: false, message: 'No se encontró una preventa pendiente para esta fecha' });
        }

        // Decrementar el stock reservado antes de hacer cualquier acción
        for (const item of preventa.productos) {
            const stockProducto = await Stock.findOne({ productoId: item.producto });
            if (stockProducto) {
                stockProducto.stockReservado -= item.cantidad;  // Decrementar el stock reservado
                if (stockProducto.stockReservado < 0) stockProducto.stockReservado = 0;  // Evitar valores negativos
                await stockProducto.save();
            }
        }

        if (confirmacion === true) {
            // Si la preventa fue entregada, convertirla en una venta
            const nuevaVenta = new Venta({
                cliente: preventa.cliente,
                vendedor: req.user._id,  // Asumiendo que el vendedor es el usuario autenticado
                productos: preventa.productos.map(producto => ({
                    productoId: producto.producto,
                    cantidad: producto.cantidad,
                    precioUnitario: producto.precio
                })),
                totalVenta: preventa.total,
                saldoVenta: preventa.total - (preventa.pagoInicial || 0),
                pagoInicial: preventa.pagoInicial || 0,
                fechaVenta: new Date(),
                estado: 'pendiente',  // La venta está completada ya que se entregó
                notas: preventa.notas
            });

            await nuevaVenta.save();

            // Actualizar el estado de la preventa a "Completada"
            preventa.estado = 'Confirmada';
            await preventa.save();

            return res.status(201).json({ success: true, message: 'La preventa ha sido entregada y convertida en venta', venta: nuevaVenta });
        } else {
            // Si la preventa no fue entregada, marcarla como "Cancelada"
            preventa.estado = 'Cancelada';
            await preventa.save();

            return res.status(200).json({ success: true, message: 'La preventa ha sido cancelada' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al procesar la preventa' });
    }
};