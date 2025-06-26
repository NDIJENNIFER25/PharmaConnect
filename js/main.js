// Main JavaScript for PharmaConnect
// Handles common functionality across all pages

document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu toggle if it exists on the page
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-collapsed');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && 
                !sidebar.contains(event.target) && 
                !menuToggle.contains(event.target) &&
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                mainContent.classList.remove('sidebar-collapsed');
            }
        });
    }
    
    // Handle active navigation links
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        const linkPath = link.getAttribute('href').split('/').pop();
        if (currentPath === linkPath || 
            (currentPath === '' && linkPath === 'index.html')) {
            link.classList.add('active');
            // Also highlight parent menu item if this is a submenu item
            const parentMenuItem = link.closest('.has-submenu');
            if (parentMenuItem) {
                parentMenuItem.querySelector('.menu-title').classList.add('active');
            }
        }
    });
    
    // Toggle submenus
    document.querySelectorAll('.menu-title').forEach(menuTitle => {
        menuTitle.addEventListener('click', function(e) {
            if (this.parentElement.classList.contains('has-submenu')) {
                e.preventDefault();
                this.parentElement.classList.toggle('open');
            }
        });
    });
});

// Show loading state for buttons
function showLoading(button, show = true) {
    if (show) {
        button.classList.add('loading');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + button.textContent.trim();
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        // Restore original button content (remove after last > and before first <)
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
        }
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification on close button click
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 5000);
}

// Handle form submissions with loading state
document.addEventListener('submit', function(e) {
    const form = e.target.closest('form');
    if (!form) return;
    
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.setAttribute('data-original-text', submitButton.innerHTML);
        showLoading(submitButton, true);
    }
});
