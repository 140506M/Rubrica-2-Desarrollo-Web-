const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'tiendaya.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.message);
  } else {
    console.log('Conectado a SQLite - TiendaYa DB');
    inicializarTablas();
  }
});

function inicializarTablas() {
  db.serialize(() => {

    // Tabla clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT NOT NULL,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla dueños
    db.run(`CREATE TABLE IF NOT EXISTS duenos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      nombre_tienda TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT NOT NULL,
      barrio TEXT,
      ciudad TEXT DEFAULT 'Barranquilla',
      horario_semana TEXT DEFAULT '6:00 am - 9:00 pm',
      horario_domingo TEXT DEFAULT '7:00 am - 2:00 pm',
      tienda_abierta INTEGER DEFAULT 1,
      domicilios_activos INTEGER DEFAULT 1,
      latitud REAL DEFAULT 10.9685,
      longitud REAL DEFAULT -74.7813,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla métodos de pago por tienda
    db.run(`CREATE TABLE IF NOT EXISTS metodos_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dueno_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      detalle TEXT,
      FOREIGN KEY (dueno_id) REFERENCES duenos(id)
    )`);

    // Tabla productos
    db.run(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dueno_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      categoria TEXT DEFAULT 'General',
      precio REAL NOT NULL,
      unidad TEXT DEFAULT 'unidad',
      stock REAL DEFAULT 0,
      stock_minimo REAL DEFAULT 5,
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (dueno_id) REFERENCES duenos(id)
    )`);

    // Tabla domiciliarios
    db.run(`CREATE TABLE IF NOT EXISTS domiciliarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dueno_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      cedula TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      vehiculo TEXT DEFAULT 'Moto',
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (dueno_id) REFERENCES duenos(id)
    )`);

    // Tabla pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      dueno_id INTEGER NOT NULL,
      domiciliario_id INTEGER,
      total REAL NOT NULL,
      costo_envio REAL DEFAULT 2500,
      estado TEXT DEFAULT 'pendiente_pago',
      metodo_pago TEXT NOT NULL,
      direccion_entrega TEXT NOT NULL,
      fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_confirmacion DATETIME,
      fecha_expiracion DATETIME,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (dueno_id) REFERENCES duenos(id),
      FOREIGN KEY (domiciliario_id) REFERENCES domiciliarios(id)
    )`);

    // Tabla detalle de pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedido_detalles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);

    console.log('Tablas inicializadas correctamente');
  });
}

module.exports = db;
