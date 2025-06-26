document.addEventListener('DOMContentLoaded', function () {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || localStorage.getItem('userType') !== 'pharmacy') {
        return; // Exit if not a logged-in pharmacy
    }

    const ordersTableBody = document.querySelector('#orders-table tbody');

    // Helper function to get CSRF token
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

    const renderOrderRow = (order) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', order.id);

        const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
            .map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('');

        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.user.username}</td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>$${order.total_price}</td>
            <td>
                <select class="status-select">${statusOptions}</select>
            </td>
            <td>
                <button class="btn btn-primary btn-sm btn-update-status">Update</button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    };

    const fetchAndRenderOrders = () => {
        if (!ordersTableBody) return;

        fetch('/api/orders/', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/pharmacy/login/';
                return;
            }
            return response.json();
        })
        .then(orders => {
            ordersTableBody.innerHTML = ''; // Clear existing rows
            if (orders && orders.length > 0) {
                orders.forEach(renderOrderRow);
            } else {
                ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No recent orders.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: red;">Could not load orders.</td></tr>';
        });
    };

    const handleUpdateStatus = (e) => {
        const updateButton = e.target.closest('.btn-update-status');
        if (!updateButton) return;

        const row = updateButton.closest('tr');
        const orderId = row.dataset.id;
        const statusSelect = row.querySelector('.status-select');
        const newStatus = statusSelect.value;

        fetch(`/api/orders/${orderId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => {
            if (response.ok) {
                alert('Order status updated successfully!');
                fetchAndRenderOrders(); // Refresh the list
            } else {
                response.json().then(data => {
                    alert('Error updating status: ' + JSON.stringify(data));
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An unexpected error occurred.');
        });
    };

    ordersTableBody.addEventListener('click', handleUpdateStatus);

    // Initial Load
    fetchAndRenderOrders();
});
