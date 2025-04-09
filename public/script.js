window.onload = () => {
  let checkoutBtn = document.getElementById('checkout');

  checkoutBtn.onclick = () => {
    checkout()
  }
}

function checkout()
{
    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    window.location.href = `/checkout.html?id=${cartItems.join(',')}`
}

async function getProducts(){
    const response = await fetch('/products')
    const data = await response.json()
    createProductCard(data)
}
getProducts()

function createProductCard(data) {
  const container = document.getElementById('product-list');
  container.innerHTML = '';

  for (const category in data) {
    // Create a category section
    const section = document.createElement('div');
    section.className = 'category-section';

    const title = document.createElement('h2');
    title.textContent = category;
    section.appendChild(title);

    const productGrid = document.createElement('div');
    productGrid.className = 'product-grid';

    data[category].forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.id = product.id;

      card.innerHTML = `
        <img src="${product.imageUrl}" alt="Product Image">
        <div class="product-name">${product.Product_Name}</div>
        <div class="product-price">₹${product.Unit_Price || 'N/A'}</div>
        <div class="product-desc">${product.Product_Description || 'No description available.'}</div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `/product.html?id=${product.id}`;
      });

      productGrid.appendChild(card);
    });

    section.appendChild(productGrid);
    container.appendChild(section);
  }
}
