document.addEventListener('DOMContentLoaded', function () {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || localStorage.getItem('userType') !== 'customer') {
        window.location.href = '/user/login/';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pharmacyId = urlParams.get('pharmacy_id');

    const productGrid = document.getElementById('product-grid');
    const pharmacyNameEl = document.getElementById('pharmacy-name');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    const searchInput = document.getElementById('search-input');

    let cart = [];
    let inventory = [];

    const renderProducts = (products) => {
        productGrid.innerHTML = '';
        products.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <h4>${item.drug.name}</h4>
                <p>${item.drug.description}</p>
                <p><strong>$${item.price}</strong></p>
                <p><em>Stock: ${item.quantity}</em></p>
                <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
            `;
            productGrid.appendChild(card);
        });
    }

    const filterAndRenderProducts = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredInventory = inventory.filter(item => 
            item.drug.name.toLowerCase().includes(searchTerm)
        );
        renderProducts(filteredInventory);
    };

    if (!pharmacyId) {
        pharmacyNameEl.textContent = 'Pharmacy not found';
        productGrid.innerHTML = '<p>No pharmacy was selected. Please go back and select a pharmacy.</p>';
        return;
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const fetchProducts = () => {
        fetch(`/api/pharmacies/${pharmacyId}/inventory/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch products.');
            return response.json();
        })
        .then(data => {
            inventory = data;
            if (inventory.length > 0) {
                pharmacyNameEl.textContent = `Products at ${inventory[0].pharmacy_name}`;
            } else {
                pharmacyNameEl.textContent = 'No products found at this pharmacy.';
            }
            renderProducts(inventory);
            searchInput.addEventListener('input', filterAndRenderProducts);
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            productGrid.innerHTML = '<p style="color: red;">Could not load products.</p>';
        });
    };

    const renderCart = () => {
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        }
        cart.forEach((item, index) => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <span>${item.name}</span>
                <div class="quantity-controls">
                    <button class="btn-quantity" data-index="${index}" data-action="decrease">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-quantity" data-index="${index}" data-action="increase">+</button>
                </div>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            `;
            cartItemsContainer.appendChild(cartItem);
            totalPrice += item.price * item.quantity;
        });
        cartTotalPriceEl.textContent = totalPrice.toFixed(2);
    };

    cartItemsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('btn-quantity')) {
            const index = parseInt(e.target.dataset.index, 10);
            const action = e.target.dataset.action;

            if (action === 'increase') {
                cart[index].quantity++;
            } else if (action === 'decrease') {
                cart[index].quantity--;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
            }
            renderCart();
        }
    });

    productGrid.addEventListener('click', e => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const inventoryId = parseInt(e.target.dataset.id, 10);
            const product = inventory.find(item => item.id === inventoryId);
            if (product) {
                const existingCartItem = cart.find(item => item.inventory_id === inventoryId);
                if (existingCartItem) {
                    existingCartItem.quantity++;
                } else {
                    cart.push({ 
                        inventory_id: product.id,
                        drug_id: product.drug.id, 
                        name: product.drug.name, 
                        price: product.price,
                        quantity: 1
                    });
                }
                renderCart();

                const button = e.target;
                button.textContent = 'Added!';
                button.disabled = true;
                button.classList.add('btn-success');

                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                    button.disabled = false;
                    button.classList.remove('btn-success');
                }, 1000);
            } else {
                
            }
        }
    });

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        const orderData = {
            pharmacy_id: pharmacyId,
            items: cart.map(item => ({ 
                drug_id: item.drug_id, 
                quantity: item.quantity
            })) 
        };

        fetch('/api/orders/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(orderData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to place order.');
        })
        .then(order => {
            sessionStorage.setItem('orderStatus', 'success');
            window.location.href = '/user/orders/'; 
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert(error.message);
        });
    });

    fetchProducts();
});
