const product = JSON.parse(localStorage.getItem("checkout_product"));
const card = document.getElementById("checkoutCard");
const params = new URLSearchParams(window.location.search);
const ids = params.get("id");

getCartItems()

async function getCartItems() {
    const res = await fetch(`/cartItems?ids=${ids}`);
    const products = await res.json();

    card.innerHTML = "";

    if (products.length === 0) {
        card.innerHTML = "<p style='color: red;'>No product selected for checkout.</p>";
        return;
    }

    const form = document.createElement("form");
    form.id = "checkoutForm";

    products.forEach(product => {
        const item = document.createElement("div");
        item.className = "cartItem";
        item.innerHTML = `
            <img src="${product.imageUrl}" alt="Product Image" />
            <div>
                <h2>${product.Product_Name}</h2>
                <p><strong>Price:</strong> ₹${product.Unit_Price}</p>
                <label for="qty-${product.id}">Qty:</label>
                <input id="qty-${product.id}" name="qty-${product.id}" type="number" min="1" max="${product.Qty_in_Stock}" value="1" style="width: 60px;" />
            </div>
            <button class="remove-btn" data-id="${product.id}">×</button>
        `;

        form.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const idToRemove = e.target.getAttribute('data-id');
        
                // Remove from DOM
                e.target.closest('.cartItem').remove();
        
                // Remove from localStorage
                let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
                const updated = cartItems.filter(id => id !== idToRemove);
                localStorage.setItem('cartItems', JSON.stringify(updated));
        
                // Also update URL query param (optional but keeps state clean)
                const url = new URL(window.location);
                url.searchParams.set('id', updated.join(','));
                window.history.replaceState({}, '', url);
            }
        })
        
        form.appendChild(item);
    });

    const customerDetailForm = document.createElement('div')
    customerDetailForm.innerHTML = `
            <h3>Customer Details</h3>
            <label>Full Name:</label><br>
            <input type="text" name="name" required /><br><br>

            <label>Email:</label><br>
            <input type="email" name="email" required /><br><br>

            <label>Phone:</label><br>
            <input type="tel" name="phone" required /><br><br>

            <label>Shipping Street:</label><br>
            <input type="tel" name="Shipping Street" required /><br><br>

            <label>Shipping City:</label><br>
            <input type="tel" name="Shipping City" required /><br><br>

            <label>Shipping State:</label><br>
            <input type="tel" name="Shipping State" required /><br><br>

            <label>Shipping Zipcode:</label><br>
            <input type="tel" name="Shipping Zipcode" required /><br><br>

            <label>Shipping Country:</label><br>
            <input type="tel" name="Shipping Country" required /><br><br>
        `
    
    const placeOrderBtn = document.createElement('button');
    placeOrderBtn.className = "button";
    placeOrderBtn.textContent = "Place Order";
    placeOrderBtn.type = "submit";

    form.appendChild(customerDetailForm)
    form.appendChild(placeOrderBtn);

    form.onsubmit = (e) => {
        e.preventDefault()
        const formData = new FormData(form);

        const customer = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            shippingStreet: formData.get("Shipping Street"),
            shippingCity: formData.get("Shipping City"),
            shippingState: formData.get("Shipping State"),
            shippingZipcode: formData.get("Shipping Zipcode"),
            shippingCountry: formData.get("Shipping Country")
        };

        const orderItems = [];
        for (let [key, value] of formData.entries()) {
            if (key.startsWith("qty-")) {
                orderItems.push({
                    id: key.replace("qty-", ""),
                    quantity: parseInt(value)
                });
            }
        }

        if(orderItems.length > 0)
        {
            placeOrder({ customer, items: orderItems })
        }
        else {
            alert("Your cart is empty")
            window.location.href = '/'
        }
    };
    const heading = document.createElement('h3')
    heading.textContent = "Products"
    card.appendChild(heading)
    card.appendChild(form);
}


function placeOrder(orderData) {
    // Example POST request to server
    fetch('/placeOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        localStorage.clear("checkout_product")
        window.location.href = `/orderStatus.html?id=${data.salesOrderId}`
    })
    .catch(err => {
        console.error("Order failed", err);
        alert("Failed to place order");
    });
}