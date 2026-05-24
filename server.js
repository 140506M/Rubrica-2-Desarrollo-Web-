const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─────────────────────────────────────────
// RUTAS AUTH - CLIENTES
// ─────────────────────────────────────────

// Registro cliente
app.post('/api/auth/cliente/register', async (req, res) => {
  const { nombre, email, password, telefono, direccion } = req.body;
  if (!nombre || !email || !password || !telefono || !direccion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO clientes (nombre, email, password, telefono, direccion) VALUES (?,?,?,?,?)',
      [nombre, email, hash, telefono, direccion],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El email ya está registrado' });
          return res.status(500).json({ error: err.message });
        }
        res.json({ ok: true, id: this.lastID, nombre, email, tipo: 'cliente' });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login cliente
app.post('/api/auth/cliente/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM clientes WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    res.json({ ok: true, id: row.id, nombre: row.nombre, email: row.email, direccion: row.direccion, tipo: 'cliente' });
  });
});

// ─────────────────────────────────────────
// RUTAS AUTH - DUEÑOS
// ─────────────────────────────────────────

// Registro dueño
app.post('/api/auth/dueno/register', async (req, res) => {
  const { nombre, nombre_tienda, email, password, telefono, direccion, barrio, ciudad } = req.body;
  if (!nombre || !nombre_tienda || !email || !password || !telefono || !direccion) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO duenos (nombre, nombre_tienda, email, password, telefono, direccion, barrio, ciudad) VALUES (?,?,?,?,?,?,?,?)',
      [nombre, nombre_tienda, email, hash, telefono, direccion, barrio || '', ciudad || 'Barranquilla'],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El email ya está registrado' });
          return res.status(500).json({ error: err.message });
        }
        const duenoId = this.lastID;
        // Insertar métodos de pago por defecto
        const metodos = [
          [duenoId, 'Nequi', 1, ''],
          [duenoId, 'Efectivo', 1, 'Cambio hasta $50.000'],
          [duenoId, 'Llave Bancolombia', 0, ''],
          [duenoId, 'Daviplata', 0, '']
        ];
        metodos.forEach(m => {
          db.run('INSERT INTO metodos_pago (dueno_id, nombre, activo, detalle) VALUES (?,?,?,?)', m);
        });
        res.json({ ok: true, id: duenoId, nombre, nombre_tienda, email, tipo: 'dueno' });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login dueño
app.post('/api/auth/dueno/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM duenos WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    res.json({ ok: true, id: row.id, nombre: row.nombre, nombre_tienda: row.nombre_tienda, email: row.email, tipo: 'dueno' });
  });
});

// ─────────────────────────────────────────
// RUTAS TIENDAS (para cliente)
// ─────────────────────────────────────────

// Listar tiendas abiertas
app.get('/api/tiendas', (req, res) => {
  db.all(
    `SELECT d.id, d.nombre_tienda, d.direccion, d.barrio, d.ciudad, d.telefono,
            d.horario_semana, d.horario_domingo, d.tienda_abierta, d.domicilios_activos,
            d.latitud, d.longitud,
            GROUP_CONCAT(mp.nombre) as metodos_pago
     FROM duenos d
     LEFT JOIN metodos_pago mp ON mp.dueno_id = d.id AND mp.activo = 1
     GROUP BY d.id`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ─────────────────────────────────────────
// RUTAS PRODUCTOS
// ─────────────────────────────────────────

// Obtener productos de una tienda
app.get('/api/productos/:duenoId', (req, res) => {
  db.all(
    'SELECT * FROM productos WHERE dueno_id = ? AND activo = 1 ORDER BY categoria, nombre',
    [req.params.duenoId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Crear producto
app.post('/api/productos', (req, res) => {
  const { dueno_id, nombre, categoria, precio, unidad, stock, stock_minimo } = req.body;
  if (!dueno_id || !nombre || !precio) return res.status(400).json({ error: 'Faltan datos' });
  db.run(
    'INSERT INTO productos (dueno_id, nombre, categoria, precio, unidad, stock, stock_minimo) VALUES (?,?,?,?,?,?,?)',
    [dueno_id, nombre, categoria || 'General', precio, unidad || 'unidad', stock || 0, stock_minimo || 5],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// Actualizar producto
app.put('/api/productos/:id', (req, res) => {
  const { nombre, categoria, precio, unidad, stock, stock_minimo } = req.body;
  db.run(
    'UPDATE productos SET nombre=?, categoria=?, precio=?, unidad=?, stock=?, stock_minimo=? WHERE id=?',
    [nombre, categoria, precio, unidad, stock, stock_minimo, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// Eliminar producto (soft delete)
app.delete('/api/productos/:id', (req, res) => {
  db.run('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// ─────────────────────────────────────────
// RUTAS DOMICILIARIOS
// ─────────────────────────────────────────

app.get('/api/domiciliarios/:duenoId', (req, res) => {
  db.all('SELECT * FROM domiciliarios WHERE dueno_id = ?', [req.params.duenoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/domiciliarios', (req, res) => {
  const { dueno_id, nombre, cedula, telefono, vehiculo } = req.body;
  if (!dueno_id || !nombre || !cedula || !telefono) return res.status(400).json({ error: 'Faltan datos' });
  db.run(
    'INSERT INTO domiciliarios (dueno_id, nombre, cedula, telefono, vehiculo) VALUES (?,?,?,?,?)',
    [dueno_id, nombre, cedula, telefono, vehiculo || 'Moto'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Cédula ya registrada' });
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true, id: this.lastID });
    }
  );
});

app.put('/api/domiciliarios/:id', (req, res) => {
  const { nombre, telefono, vehiculo, activo } = req.body;
  db.run(
    'UPDATE domiciliarios SET nombre=?, telefono=?, vehiculo=?, activo=? WHERE id=?',
    [nombre, telefono, vehiculo, activo, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

app.delete('/api/domiciliarios/:id', (req, res) => {
  db.run('DELETE FROM domiciliarios WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// ─────────────────────────────────────────
// RUTAS MÉTODOS DE PAGO
// ─────────────────────────────────────────

app.get('/api/metodos-pago/:duenoId', (req, res) => {
  db.all('SELECT * FROM metodos_pago WHERE dueno_id = ?', [req.params.duenoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/metodos-pago/:id', (req, res) => {
  const { activo, detalle } = req.body;
  db.run('UPDATE metodos_pago SET activo=?, detalle=? WHERE id=?', [activo, detalle, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// ─────────────────────────────────────────
// RUTAS CONFIGURACIÓN TIENDA
// ─────────────────────────────────────────

app.put('/api/tienda/:id/config', (req, res) => {
  const { horario_semana, horario_domingo, tienda_abierta, domicilios_activos } = req.body;
  db.run(
    'UPDATE duenos SET horario_semana=?, horario_domingo=?, tienda_abierta=?, domicilios_activos=? WHERE id=?',
    [horario_semana, horario_domingo, tienda_abierta, domicilios_activos, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

app.get('/api/tienda/:id', (req, res) => {
  db.get('SELECT * FROM duenos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Tienda no encontrada' });
    res.json(row);
  });
});

// ─────────────────────────────────────────
// RUTAS PEDIDOS
// ─────────────────────────────────────────

// Crear pedido (con temporizador 5 min)
app.post('/api/pedidos', (req, res) => {
  const { cliente_id, dueno_id, items, metodo_pago, direccion_entrega, costo_envio } = req.body;
  if (!cliente_id || !dueno_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) + (costo_envio || 2500);
  const ahora = new Date();
  const expiracion = new Date(ahora.getTime() + 5 * 60 * 1000); // +5 minutos

  db.run(
    `INSERT INTO pedidos (cliente_id, dueno_id, total, costo_envio, estado, metodo_pago, direccion_entrega, fecha_expiracion)
     VALUES (?,?,?,?,?,?,?,?)`,
    [cliente_id, dueno_id, total, costo_envio || 2500, 'pendiente_pago', metodo_pago, direccion_entrega, expiracion.toISOString()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const pedidoId = this.lastID;

      // Insertar detalles y reservar stock
      items.forEach(item => {
        db.run(
          'INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)',
          [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]
        );
        db.run('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);
      });

      res.json({ ok: true, pedido_id: pedidoId, expiracion: expiracion.toISOString(), total });
    }
  );
});

// Confirmar pago (cliente lo marca como confirmado)
app.put('/api/pedidos/:id/confirmar', (req, res) => {
  const ahora = new Date().toISOString();
  db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id], (err, pedido) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (new Date() > new Date(pedido.fecha_expiracion)) {
      // Liberar stock
      liberarStockPedido(pedido.id);
      db.run('UPDATE pedidos SET estado = ? WHERE id = ?', ['cancelado_tiempo', pedido.id]);
      return res.status(400).json({ error: 'El tiempo para confirmar el pago ha expirado. Pedido cancelado.' });
    }
    db.run(
      'UPDATE pedidos SET estado = ?, fecha_confirmacion = ? WHERE id = ?',
      ['pendiente', ahora, req.params.id],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true });
      }
    );
  });
});

function liberarStockPedido(pedidoId) {
  db.all('SELECT * FROM pedido_detalles WHERE pedido_id = ?', [pedidoId], (err, detalles) => {
    if (err || !detalles) return;
    detalles.forEach(d => {
      db.run('UPDATE productos SET stock = stock + ? WHERE id = ?', [d.cantidad, d.producto_id]);
    });
  });
}

// Pedidos del cliente
app.get('/api/pedidos/cliente/:clienteId', (req, res) => {
  db.all(
    `SELECT p.*, d.nombre_tienda, dom.nombre as domiciliario_nombre
     FROM pedidos p
     JOIN duenos d ON d.id = p.dueno_id
     LEFT JOIN domiciliarios dom ON dom.id = p.domiciliario_id
     WHERE p.cliente_id = ? AND p.estado != 'pendiente_pago' AND p.estado != 'cancelado_tiempo'
     ORDER BY p.fecha_pedido DESC`,
    [req.params.clienteId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Pedidos de la tienda (solo confirmados)
app.get('/api/pedidos/tienda/:duenoId', (req, res) => {
  db.all(
    `SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
            dom.nombre as domiciliario_nombre
     FROM pedidos p
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN domiciliarios dom ON dom.id = p.domiciliario_id
     WHERE p.dueno_id = ? AND p.estado NOT IN ('pendiente_pago','cancelado_tiempo')
     ORDER BY p.fecha_pedido DESC`,
    [req.params.duenoId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Detalle de un pedido
app.get('/api/pedidos/:id/detalle', (req, res) => {
  db.all(
    `SELECT pd.*, pr.nombre as producto_nombre, pr.unidad
     FROM pedido_detalles pd
     JOIN productos pr ON pr.id = pd.producto_id
     WHERE pd.pedido_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Cambiar estado pedido (dueño)
app.put('/api/pedidos/:id/estado', (req, res) => {
  const { estado, domiciliario_id } = req.body;
  const estadosValidos = ['pendiente', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  if (estado === 'cancelado') {
    liberarStockPedido(parseInt(req.params.id));
  }

  db.run(
    'UPDATE pedidos SET estado = ?, domiciliario_id = COALESCE(?, domiciliario_id) WHERE id = ?',
    [estado, domiciliario_id || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// Limpiar pedidos expirados (cron cada 1 minuto)
setInterval(() => {
  const ahora = new Date().toISOString();
  db.all(
    "SELECT id FROM pedidos WHERE estado = 'pendiente_pago' AND fecha_expiracion < ?",
    [ahora],
    (err, rows) => {
      if (err || !rows) return;
      rows.forEach(p => {
        liberarStockPedido(p.id);
        db.run("UPDATE pedidos SET estado = 'cancelado_tiempo' WHERE id = ?", [p.id]);
      });
      if (rows.length > 0) console.log(`${rows.length} pedido(s) expirados cancelados`);
    }
  );
}, 60000);

// Ruta raíz → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛒 TiendaYa corriendo en http://localhost:${PORT}\n`);
});
