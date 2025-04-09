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

async function fetchProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const card = document.getElementById("productCard");
    card.innerHTML = "Loading...";

    try {
        const res = await fetch(`/product/${id}`);
        if (!res.ok) throw new Error("Failed to fetch product.");

        const data = await res.json();
        const product = data.data[0]; // Assuming single product data is in array

        card.innerHTML = `
        <div class="card">
            <img src="${product.imageUrl}" alt="Product Image">
            <div>
                <h2>${product.Product_Name}</h2>
                <p><strong>Category:</strong> ${product.Category.name || 'N/A'}</p>
                <p><strong>Price:</strong> ₹${product.Unit_Price}</p>
                <p><strong>Description:</strong> ${product.Product_Description || 'N/A'}</p>
                <div class="buttons">
                    <button onclick="addToCart('${product.id}')" class="button">Add to Cart</button>
                    <button onclick="buyNow('${product.id}')" class="button">Buy Now</button>
                </div>
            </div>
        </div>
        `;
    } catch (err) {
        card.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}
fetchProduct()

function addToCart(productId)
{
    // Get current cart from localStorage or initialize empty
    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    // Check if productId is already in cart
    if (!cartItems.includes(productId)) {
        cartItems.push(productId);
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        alert(`Product ${productId} added to cart.`);
    } else {
        alert(`Product ${productId} is already in cart.`);
    }
}

function buyNow(productId)
{
    window.location.href = `/checkout.html?id=${productId}`;
}