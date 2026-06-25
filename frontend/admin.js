const API = 'https://restaurante-production-b007.up.railway.app/api';
let token = localStorage.getItem('token') || null;
let productoEditandoId = null;
let categorias = [];

// ===== AUTH =====
async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const form = new FormData();
  form.append('username', email);
  form.append('password', password);

  try {
    const res = await fetch(`${API}/login`, { method: 'POST', body: form });
    if (!res.ok) throw new Error();
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('token', token);
    mostrarDashboard();
  } catch {
    document.getElementById('loginError').style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function authHeader() {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ===== DASHBOARD =====
async function mostrarDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  await cargarCategorias();
  await cargarProductos();
}

async function cargarCategorias() {
  const res = await fetch(`${API}/categorias`);
  categorias = await res.json();
  document.getElementById('statCategorias').textContent = categorias.length;

  const select = document.getElementById('pCategoria');
  select.innerHTML = '';
  categorias.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

async function cargarProductos() {
  const res = await fetch(`${API}/admin/productos`, {
    headers: authHeader()
  });
  const productos = await res.json();

  document.getElementById('statProductos').textContent = productos.length;
  document.getElementById('statActivos').textContent = productos.filter(p => p.disponible).length;

  const tbody = document.getElementById('tablaProductos');
  tbody.innerHTML = '';

  productos.forEach(p => {
    const cat = categorias.find(c => c.id === p.categoria_id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.nombre}</strong><br><small style="color:#888">${p.descripcion || ''}</small></td>
      <td>${cat ? cat.nombre : '—'}</td>
      <td>$${p.precio.toLocaleString('es-AR')}</td>
      <td><span class="badge ${p.disponible ? 'badge-active' : 'badge-inactive'}">${p.disponible ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" onclick="editarProducto(${p.id})"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== MODAL =====
function abrirModal(producto = null) {
  productoEditandoId = producto ? producto.id : null;
  document.getElementById('modalTitulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  document.getElementById('pNombre').value = producto ? producto.nombre : '';
  document.getElementById('pDescripcion').value = producto ? producto.descripcion || '' : '';
  document.getElementById('pPrecio').value = producto ? producto.precio : '';
  document.getElementById('pCategoria').value = producto ? producto.categoria_id : categorias[0]?.id;
  document.getElementById('pDisponible').value = producto ? String(producto.disponible) : 'true';
  document.getElementById('modalOverlay').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  productoEditandoId = null;
}

async function guardarProducto() {
  const body = {
    nombre: document.getElementById('pNombre').value,
    descripcion: document.getElementById('pDescripcion').value,
    precio: parseFloat(document.getElementById('pPrecio').value),
    categoria_id: parseInt(document.getElementById('pCategoria').value),
    disponible: document.getElementById('pDisponible').value === 'true'
  };

  const url = productoEditandoId
    ? `${API}/admin/productos/${productoEditandoId}`
    : `${API}/admin/productos`;

  const method = productoEditandoId ? 'PUT' : 'POST';

  await fetch(url, { method, headers: authHeader(), body: JSON.stringify(body) });
  cerrarModal();
  cargarProductos();
}

async function editarProducto(id) {
  const res = await fetch(`${API}/admin/productos`, { headers: authHeader() });
  const productos = await res.json();
  const producto = productos.find(p => p.id === id);
  abrirModal(producto);
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  await fetch(`${API}/admin/productos/${id}`, { method: 'DELETE', headers: authHeader() });
  cargarProductos();
}

// Enter en login
document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

// Auto-login si hay token
if (token) mostrarDashboard();