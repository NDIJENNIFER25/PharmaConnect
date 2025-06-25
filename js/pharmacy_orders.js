document.addEventListener('DOMContentLoaded', function() {
    const API_BASE = window.location.origin;
    const authToken = localStorage.getItem('accessToken');
    const ordersTableBody = document.getElementById('orders-table-body');

    if (!authToken || !ordersTableBody) {
        console.log("Orders script: Missing auth token or table body element. Exiting.");
        return;
    }

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    async function fetchOrders() {
        try {
            const response = await fetch(`${API_BASE}/api/orders/`, { headers: getHeaders() });
            if (!response.ok) {
                throw new Error(`Failed to fetch orders: ${response.statusText}`);
            }
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersTableBody.innerHTML = '<tr><td colspan="5">Could not load recent orders.</td></tr>';
        }
    }

    function renderOrders(orders) {
        ordersTableBody.innerHTML = ''; // Clear existing rows
        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="5">No recent orders found.</td></tr>';
            return;
        }

        // Show only the 5 most recent orders
        const recentOrders = orders.slice(0, 5);

        recentOrders.forEach(order => {
            const row = document.createElement('tr');
            const orderStatusClass = `status-${order.status.toLowerCase()}`;
            
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>${order.customer.username}</td>
                <td>${parseFloat(order.total_price).toFixed(2)} XAF</td>
                <td><span class="status-pill ${orderStatusClass}">${order.status}</span></td>
            `;
            ordersTableBody.appendChild(row);
        });
    }

    fetchOrders();
});
