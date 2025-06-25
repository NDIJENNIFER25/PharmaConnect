document.addEventListener('DOMContentLoaded', function () {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || localStorage.getItem('userType') !== 'customer') {
        window.location.href = '/user/login/';
        return;
    }

    const orderListContainer = document.getElementById('order-list-container');

    const orderStatus = sessionStorage.getItem('orderStatus');
    if (orderStatus === 'success') {
        const successBanner = document.createElement('div');
        successBanner.className = 'success-banner';
        successBanner.textContent = 'Order placed successfully!';
        orderListContainer.parentNode.insertBefore(successBanner, orderListContainer);
        sessionStorage.removeItem('orderStatus');
    }

    const fetchOrders = () => {
        fetch('/api/orders/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/user/login/';
                return;
            }
            return response.json();
        })
        .then(orders => {
            if (!orders || orders.length === 0) {
                orderListContainer.innerHTML = '<p>You have no past orders.</p>';
                return;
            }

            orderListContainer.innerHTML = ''; // Clear loading message
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';

                const itemsHtml = order.items.map(item => 
                    `<li>${item.quantity} x ${item.drug.name} ($${item.price})</li>`
                ).join('');

                orderCard.innerHTML = `
                    <div class="order-card-header">
                        <h4>Order #${order.id} - ${order.pharmacy.pharmacy_name}</h4>
                        <span class="status-pill status-${order.status.toLowerCase().replace(/ /g, '-')}">${order.status}</span>
                    </div>
                    <div class="order-card-body">
                        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                        <p><strong>Total:</strong> $${order.total_price}</p>
                        <h5>Items:</h5>
                        <ul>${itemsHtml}</ul>
                    </div>
                `;
                orderListContainer.appendChild(orderCard);
            });
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            orderListContainer.innerHTML = '<p style="color: red;">Could not load your orders.</p>';
        });
    };

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userType');
            window.location.href = '/';
        });
    }

    fetchOrders();
});
