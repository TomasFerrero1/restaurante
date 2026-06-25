const API = 'https://restaurante-production-b007.up.railway.app/api';

const emojis = {
  1: '🥗',
  2: '🍖',
  3: '🍮',
  4: '🥤'
};

let todosLosProductos = [];
let carrito = [];

// ===== CARRITO =====
function agregarAlCarrito(producto) {
  const existente = carrito.find(i => i.id === producto.id);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }
  actualizarCarrito();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(i => i.id !== id);
  actualizarCarrito();
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) eliminarDelCarrito(id);
  else actualizarCarrito();
}

function actualizarCarrito() {
  const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const cantidad = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  document.getElementById('carrito-count').textContent = cantidad;
  document.getElementById('carrito-total').textContent = `$${total.toLocaleString('es-AR')}`;

  const lista = document.getElementById('carrito-items');
  lista.innerHTML = '';

  if (carrito.length === 0) {
    lista.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
    return;
  }

  carrito.forEach(item => {
    const div = document.createElement('div');
    div.className = 'carrito-item';
    div.innerHTML = `
      <div class="carrito-item-info">
        <span class="carrito-item-nombre">${item.nombre}</span>
        <span class="carrito-item-precio">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
      </div>
      <div class="carrito-item-controls">
        <button onclick="cambiarCantidad(${item.id}, -1)">−</button>
        <span>${item.cantidad}</span>
        <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
        <button class="btn-eliminar" onclick="eliminarDelCarrito(${item.id})">🗑</button>
      </div>
    `;
    lista.appendChild(div);
  });
}

// ===== PRODUCTOS =====
async function cargarCategorias() {
  const res = await fetch(`${API}/categorias`);
  const categorias = await res.json();
  const contenedor = document.getElementById('categorias');
  categorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat.nombre;
    btn.dataset.id = cat.id;
    btn.addEventListener('click', () => filtrarProductos(cat.id, btn));
    contenedor.appendChild(btn);
  });
}

async function cargarProductos() {
  const res = await fetch(`${API}/productos`);
  todosLosProductos = await res.json();
  renderProductos(todosLosProductos);
}

function renderProductos(productos) {
  const contenedor = document.getElementById('productos');
  contenedor.innerHTML = '';
  if (productos.length === 0) {
    contenedor.innerHTML = '<p class="loading">No hay productos disponibles.</p>';
    return;
  }
  productos.forEach(p => {
    const emoji = emojis[p.categoria_id] || '🍽️';
    const card = document.createElement('div');
    card.className = 'producto-card';
    card.innerHTML = `
      <div class="producto-img">${emoji}</div>
      <div class="producto-body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion || ''}</p>
        <div class="producto-footer">
          <span class="precio">$${p.precio.toLocaleString('es-AR')}</span>
          <button class="btn-agregar" onclick="agregarAlCarrito(${JSON.stringify(p).replace(/"/g, '&quot;')})">Agregar</button>
        </div>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

function filtrarProductos(categoriaId, btnActivo) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btnActivo.classList.add('active');
  if (categoriaId === 'all') {
    renderProductos(todosLosProductos);
  } else {
    renderProductos(todosLosProductos.filter(p => p.categoria_id == categoriaId));
  }
}

document.querySelector('.cat-btn[data-id="all"]').addEventListener('click', (e) => {
  filtrarProductos('all', e.target);
});

// Iniciar
cargarCategorias();
cargarProductos();

function toggleCarrito() {
  document.getElementById('carritoPanel').classList.toggle('open');
  document.getElementById('carritoOverlay').classList.toggle('open');
}

function confirmarPedido() {
  if (carrito.length === 0) return;
  alert('¡Pedido confirmado! En breve nos contactamos.');
  carrito = [];
  actualizarCarrito();
  toggleCarrito();
}