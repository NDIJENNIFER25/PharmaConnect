document.addEventListener('DOMContentLoaded', function () {
    const logoutButton = document.getElementById('logout-button');
    const pharmacyNameSpan = document.getElementById('pharmacy-name');
    const pharmacyAddressSpan = document.getElementById('pharmacy-address');
    const authToken = localStorage.getItem('accessToken');

    // Redirect to login if no token is found
    if (!authToken) {
        console.log('No auth token found, redirecting to login.');
        window.location.href = '/pharmacy/login/';
        return;
    }

    // Handle logout
    if (logoutButton) {
        logoutButton.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userType');
            localStorage.removeItem('pharmacyProfile'); // Clear profile info
            window.location.href = '/pharmacy/login/';
        });
    }

    // Display pharmacy info from localStorage (if available)
    // This should be set upon successful login
    try {
        const pharmacyProfile = JSON.parse(localStorage.getItem('pharmacyProfile'));
        if (pharmacyProfile) {
            if (pharmacyNameSpan && pharmacyProfile.name) {
                pharmacyNameSpan.textContent = pharmacyProfile.name;
            }
            if (pharmacyAddressSpan && pharmacyProfile.address) {
                pharmacyAddressSpan.textContent = pharmacyProfile.address;
            }
        }
    } catch (error) {
        console.error('Could not parse pharmacy profile from localStorage:', error);
    }
});
