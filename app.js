/* ═══════════════════════════════════════
   PEBBLE STORE – app.js
   ═══════════════════════════════════════ */

const WHATSAPP_NUMBER = '919659451260';

let allProducts = [];
const cart = {};
const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// ── Boot: show correct UI for device ──
function initDevice() {
  if (isMobile) {
    document.getElementById('mobileActions').style.display = 'block';
  } else {
    document.getElementById('desktopActions').style.display = 'block';
    generateQR(); // show QR on page load for desktop
  }
}

// ── Load products.json ──
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const filtersEl = document.getElementById('categoryFilters');
  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('Failed');
    allProducts = await res.json();

    const categories = ['All', ...new Set(allProducts.map(p => p.category))];
    filtersEl.innerHTML = categories.map((cat, i) =>
      `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
    ).join('');

    filtersEl.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(btn.dataset.cat === 'All' ? allProducts : allProducts.filter(p => p.category === btn.dataset.cat));
      });
    });

    renderProducts(allProducts);
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--clay);grid-column:1/-1">⚠️ Could not load products.json. Make sure it is in the same folder as index.html.</p>';
  }
}

// ── Render product cards ──
function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--light-text);grid-column:1/-1;font-style:italic">No products in this category yet.</p>';
    return;
  }
  grid.innerHTML = products.map(p => {
    const qty = cart[p.id] || 0;
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-img ${p.colorClass}">
          <div class="pat"></div>
          <img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'" />
          <span class="emoji-fallback">${p.emoji}</span>
        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="product-tag">${p.tag}</span>
            <span class="product-cat">${p.category}</span>
          </div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description}</div>
          <div class="product-price">₹${p.price} / bar</div>
          <div class="card-bottom">
            <div class="qty-control">
              <button class="qty-btn" onclick="changeQty('${p.id}', -1)">−</button>
              <span class="qty-num" id="qty-${p.id}">${qty}</span>
              <button class="qty-btn" onclick="changeQty('${p.id}', 1)">+</button>
            </div>
            <button class="add-to-order-btn ${qty > 0 ? 'selected' : ''}" id="btn-${p.id}" onclick="addToOrder('${p.id}')">
              ${qty > 0 ? '✓ Added' : 'Add to Order'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Change qty ──
function changeQty(id, delta) {
  const newQty = Math.max(0, (cart[id] || 0) + delta);
  if (newQty === 0) delete cart[id]; else cart[id] = newQty;
  const qtyEl = document.getElementById('qty-' + id);
  const btnEl = document.getElementById('btn-' + id);
  if (qtyEl) qtyEl.textContent = newQty;
  if (btnEl) { btnEl.textContent = newQty > 0 ? '✓ Added' : 'Add to Order'; btnEl.classList.toggle('selected', newQty > 0); }
  updateSummary();
  if (!isMobile) refreshQR();
}

// ── Add to order ──
function addToOrder(id) {
  if (!cart[id]) {
    cart[id] = 1;
    const qtyEl = document.getElementById('qty-' + id);
    const btnEl = document.getElementById('btn-' + id);
    if (qtyEl) qtyEl.textContent = 1;
    if (btnEl) { btnEl.textContent = '✓ Added'; btnEl.classList.add('selected'); }
  }
  updateSummary();
  if (!isMobile) refreshQR();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
}

// ── Remove from cart ──
function removeFromCart(id) {
  delete cart[id];
  const qtyEl = document.getElementById('qty-' + id);
  const btnEl = document.getElementById('btn-' + id);
  if (qtyEl) qtyEl.textContent = 0;
  if (btnEl) { btnEl.textContent = 'Add to Order'; btnEl.classList.remove('selected'); }
  updateSummary();
  if (!isMobile) refreshQR();
}

// ── Update order summary ──
function updateSummary() {
  const container = document.getElementById('summaryContent');
  const items = Object.entries(cart).filter(([, q]) => q > 0);

  if (!items.length) {
    container.innerHTML = '<span class="empty-selection">No products added yet — set a quantity above and click "Add to Order"</span>';
    document.getElementById('hiddenOrder').value = '';
    document.getElementById('hiddenTotal').value = '';
    return;
  }

  let total = 0;
  const rows = items.map(([id, qty]) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return '';
    const sub = p.price * qty;
    total += sub;
    return `<tr>
      <td>${p.emoji} ${p.name}</td>
      <td style="text-align:center">₹${p.price}</td>
      <td style="text-align:center">${qty}</td>
      <td style="text-align:right">₹${sub}</td>
      <td style="text-align:center"><button class="summary-remove" onclick="removeFromCart('${id}')" title="Remove">×</button></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="summary-table">
      <thead><tr>
        <th>Product</th>
        <th style="text-align:center">Price</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Subtotal</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="summary-total-row">
        <td colspan="3">Total</td>
        <td style="text-align:right">₹${total}</td>
        <td></td>
      </tr></tfoot>
    </table>`;

  document.getElementById('hiddenOrder').value = items
    .map(([id, qty]) => { const p = allProducts.find(x => x.id === id); return p ? `${p.name} x${qty} = ₹${p.price * qty}` : ''; })
    .filter(Boolean).join(' | ');
  document.getElementById('hiddenTotal').value = `₹${total}`;
}

// ── Build WhatsApp URL ──
function buildWhatsAppUrl() {
  const name    = document.getElementById('custName').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const notes   = document.getElementById('notes').value.trim();

  let total = 0;
  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => {
      const p = allProducts.find(x => x.id === id);
      if (!p) return '';
      total += p.price * qty;
      return `• ${p.name} x${qty} = ₹${p.price * qty}`;
    }).filter(Boolean).join('\n');

  let msg = `🛒 *New Order – Pebble Store*\n\n`;
  if (name)    msg += `*Name:* ${name}\n`;
  if (phone)   msg += `*Phone:* ${phone}\n`;
  if (address) msg += `*Address:* ${address}\n`;
  msg += `\n*Order:*\n${lines}\n\n*Total: ₹${total}*`;
  if (notes)   msg += `\n\n*Notes:* ${notes}`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ── Generate / refresh QR code ──
function generateQR() {
  const container = document.getElementById('qrCode');
  container.innerHTML = '';
  new QRCode(container, {
    text: `https://wa.me/${WHATSAPP_NUMBER}`,
    width: 180, height: 180,
    colorDark: '#2b1f14', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function refreshQR() {
  // Only regenerate if QR library is loaded
  if (typeof QRCode === 'undefined') return;
  const container = document.getElementById('qrCode');
  container.innerHTML = '';
  new QRCode(container, {
    text: buildWhatsAppUrl(),
    width: 180, height: 180,
    colorDark: '#2b1f14', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

// ── Validate cart ──
function validateCart() {
  const hasItems = Object.values(cart).some(q => q > 0);
  const err = document.getElementById('errorMsg');
  if (!hasItems) {
    err.style.display = 'block';
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  err.style.display = 'none';
  return true;
}

// ── Show success page ──
function showSuccessPage() {
  const items = Object.entries(cart).filter(([, q]) => q > 0);
  let total = 0;

  const rows = items.map(([id, qty]) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return '';
    const sub = p.price * qty;
    total += sub;
    return `<div class="success-order-row">
      <span>${p.emoji} ${p.name} × ${qty}</span>
      <span>₹${sub}</span>
    </div>`;
  }).filter(Boolean).join('');

  document.getElementById('successOrderDetails').innerHTML = rows;
  document.getElementById('successTotal').innerHTML = `<span>Total</span><span>₹${total}</span>`;

  // Swap views
  document.getElementById('orderFormView').style.display = 'none';
  document.getElementById('orderSuccessView').style.display = 'block';
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
}

// ── Reset order (go back to browse) ──
function resetOrder() {
  // Clear cart
  Object.keys(cart).forEach(id => {
    delete cart[id];
    const qtyEl = document.getElementById('qty-' + id);
    const btnEl = document.getElementById('btn-' + id);
    if (qtyEl) qtyEl.textContent = 0;
    if (btnEl) { btnEl.textContent = 'Add to Order'; btnEl.classList.remove('selected'); }
  });
  updateSummary();
  document.getElementById('orderForm').reset();
  document.getElementById('orderSuccessView').style.display = 'none';
  document.getElementById('orderFormView').style.display = 'block';
  if (!isMobile) refreshQR();
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ── Email form submit ──
document.getElementById('orderForm').addEventListener('submit', function (e) {
  if (!validateCart()) { e.preventDefault(); return; }
  // Let Formspree handle it, then show success page
  e.preventDefault();

  const formData = new FormData(this);
  fetch(this.action, {
    method: 'POST',
    body: formData,
    headers: { 'Accept': 'application/json' }
  }).then(res => {
    if (res.ok) {
      showSuccessPage();
    } else {
      alert('Something went wrong. Please try again or use WhatsApp to order.');
    }
  }).catch(() => {
    alert('Network error. Please check your connection and try again.');
  });
});

// ── WhatsApp button (mobile) ──
const waBtn = document.getElementById('whatsappBtn');
if (waBtn) {
  waBtn.addEventListener('click', function () {
    if (!validateCart()) return;
    window.open(buildWhatsAppUrl(), '_blank');
    // Show success after short delay (they've been redirected to WA)
    setTimeout(showSuccessPage, 800);
  });
}

// ── Nav scroll highlight ──
const navSections = document.querySelectorAll('section[id]');
const navLinks    = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  navSections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  navLinks.forEach(a => { a.style.color = a.getAttribute('href') === '#' + current ? 'var(--bark)' : ''; });
});

// ── Init ──
loadProducts();
initDevice();
