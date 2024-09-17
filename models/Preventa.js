const mongoose = require('mongoose');

// Esquema para los productos en la preventa
const preventaProductoSchema = new mongoose.Schema({
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad: { type: Number, required: true },
    precio: { type: Number, required: true },  // Precio en el momento de la preventa
}, { _id: false });

// Esquema de Preventa
const preventaSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Referencia al cliente que hace la preventa
    productos: [preventaProductoSchema],  // Lista de productos en la preventa
    fechaPreventa: { type: Date, default: Date.now },  // Fecha en que se creó la preventa
    fechaEntrega: { type: Date, required: true },  // Fecha estimada de entrega de los productos
    estado: {
        type: String,
        enum: ['Pendiente', 'Confirmada', 'Cancelada'],
        default: 'Pendiente'  // Estado de la preventa
    },
    total: { type: Number, required: true },  // Total de la preventa (suma de los productos)
    notas: { type: String },  // Cualquier nota adicional sobre la preventa
}, { timestamps: true });

module.exports = mongoose.model('Preventa', preventaSchema);
