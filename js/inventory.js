document.addEventListener('DOMContentLoaded', function () {
    const API_BASE = window.location.origin;
    const authToken = localStorage.getItem('accessToken');

    if (!authToken) {
        console.error("Authentication token not found. Redirecting to login.");
        window.location.href = "/pharmacy/login/";
        return;
    }

    // --- DOM Elements ---
    const modal = document.getElementById('drug-modal');
    const addDrugBtn = document.getElementById('add-drug-btn');
    const closeBtn = modal.querySelector('.close-btn');
    const drugForm = document.getElementById('drug-form');
    const modalTitle = document.getElementById('modal-title');
    const inventoryTableBody = document.querySelector('#inventory-table tbody');
    const pharmacyNameSpan = document.getElementById('pharmacy-name');

    // --- API Utility ---
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    // --- Modal Handling ---
    if (addDrugBtn) {
        addDrugBtn.onclick = function () {
            modalTitle.textContent = 'Add New Drug';
            drugForm.reset();
            document.getElementById('drug-id').value = ''; // Clear hidden ID field
            modal.style.display = 'block';
        }
    }

    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.style.display = 'none';
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // --- Data Fetching and Rendering ---
    async function fetchInventory() {
        try {
            const response = await fetch(`${API_BASE}/api/inventory/`, { headers: getHeaders() });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = "/pharmacy/login/";
                }
                throw new Error(`Failed to fetch inventory: ${response.statusText}`);
            }
            const inventory = await response.json();
            renderInventory(inventory);

            if (inventory.length > 0 && inventory[0].pharmacy_name) {
                pharmacyNameSpan.textContent = inventory[0].pharmacy_name;
            } else {
                const pharmacyProfile = JSON.parse(localStorage.getItem('pharmacyProfile'));
                if (pharmacyProfile && pharmacyProfile.name) {
                    pharmacyNameSpan.textContent = pharmacyProfile.name;
                } else {
                    pharmacyNameSpan.textContent = "My Pharmacy";
                }
            }

        } catch (error) {
            console.error('Error fetching inventory:', error);
            inventoryTableBody.innerHTML = `<tr><td colspan="6">Could not load inventory. Please try again.</td></tr>`;
        }
    }

    function renderInventory(inventory) {
        inventoryTableBody.innerHTML = ''; // Clear existing rows
        if (!inventory || inventory.length === 0) {
            inventoryTableBody.innerHTML = '<tr><td colspan="6">Your inventory is empty. Add a new drug to get started.</td></tr>';
            return;
        }
        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.drug.name}</td>
                <td>${item.drug.manufacturer || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>${parseFloat(item.drug.price).toFixed(2)} XAF</td>
                <td>${new Date(item.updated_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-drug-id="${item.drug.id}">Edit</button>
                </td>
            `;
            inventoryTableBody.appendChild(row);
        });
    }

    // --- Form Submission ---
    if (drugForm) {
        drugForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Construct a single, nested payload for the atomic API call
            const payload = {
                drug: {
                    name: document.getElementById('drug-name').value,
                    manufacturer: document.getElementById('manufacturer').value,
                    price: document.getElementById('price').value,
                    description: "-", // Default description
                },
                quantity: document.getElementById('quantity').value
            };

            if (!payload.drug.name || !payload.drug.price || !payload.quantity) {
                alert("Please fill in all required fields.");
                return;
            }

            try {
                // Send a single request to the inventory endpoint
                const response = await fetch(`${API_BASE}/api/inventory/`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                const newInventoryItem = await response.json();
                if (!response.ok) {
                    // Provide a more detailed error message from the server
                    throw new Error(`Failed to add to inventory. Server says: ${JSON.stringify(newInventoryItem)}`);
                }

                alert('Drug added to inventory successfully!');
                modal.style.display = 'none';
                fetchInventory(); // Refresh the table

            } catch (error) {
                console.error('Error adding to inventory:', error);
                alert(`An error occurred: ${error.message}`);
            }
        });
    }

    // --- Initial Load ---
    fetchInventory();
});
