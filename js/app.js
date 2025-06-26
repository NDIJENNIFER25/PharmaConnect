document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded. Initializing app.js.'); // Debug 1: Script start
    const mapElement = document.getElementById('map');
    const mapboxAccessToken = mapElement.dataset.mapboxAccessToken;

    if (!mapboxAccessToken) {
        console.error('Mapbox access token is missing!');
        return;
    }

    // --- Helper Functions ---
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

    function handleLogout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userType');
        window.location.href = '/';
    }

    // --- Authentication Check ---
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) { // Simplified check, assumes customer user type for this page
        window.location.href = '/user/login/';
        return;
    }

    // --- Map Initialization ---
    mapboxgl.accessToken = mapboxAccessToken;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-0.1278, 51.5074], // Default center (London)
        zoom: 10
    });

    const markerMap = {}; // To store markers and related data

    // --- Map Controls ---
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());
    map.addControl(new mapboxgl.ScaleControl());

    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocate);

    // --- Main Logic on Map Load ---
    // --- Main Logic on Map Load (runs only once) ---
        map.once('load', () => {
        console.log('Map has fully loaded.'); // Debug 2: Map load event
        // --- AGGRESSIVE CLEANUP: Prevent UI duplication ---
        const geocoderContainer = document.getElementById('geocoder-container');
        const pharmacyList = document.getElementById('pharmacy-list');
        geocoderContainer.innerHTML = '';
        pharmacyList.innerHTML = '';

        // Add Geocoder
        const geocoder = new MapboxGeocoder({
            accessToken: mapboxAccessToken,
            mapboxgl: map,
            marker: false,
            placeholder: 'Search for a location'
        });
        geocoderContainer.appendChild(geocoder.onAdd(map));

        // Fetch and display pharmacies
        loadPharmacies();

        // Center map on user's location initially
        geolocate.trigger();

        // --- Set up Drug Search Event Listeners ---
        const drugSearchButton = document.getElementById('drug-search-button');
        const drugSearchInput = document.getElementById('drug-search-input');
        console.log('Attempting to find search button inside map.load:', drugSearchButton); // Debug 3: Element finding

        if (drugSearchButton) {
            console.log('Search button found. Attaching click listener.'); // Debug 4: Listener attachment
            drugSearchButton.addEventListener('click', handleDrugSearch);
        } else {
            console.error('Search button NOT found inside map.load.'); // Debug 5: Failure case
        }
        if (drugSearchInput) {
            drugSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleDrugSearch();
                }
            });
        }
    });

    // --- Pharmacy Loading and Display Function ---
    async function loadPharmacies() {
        const pharmacyList = document.getElementById('pharmacy-list');
        pharmacyList.innerHTML = ''; // Clear previous list

        // Clear existing markers from the map
        Object.values(markerMap).forEach(entry => entry.marker.remove());
        for (const key in markerMap) {
            delete markerMap[key];
        }

        try {
            const response = await fetch('/api/pharmacies/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/user/login/';
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch pharmacies');
            }

            const pharmacies = await response.json();

            if (!pharmacies || pharmacies.length === 0) {
                pharmacyList.innerHTML = '<p class="p-4">No pharmacies found nearby.</p>';
                return;
            }

            const bounds = new mapboxgl.LngLatBounds();

            pharmacies.forEach(pharmacy => {
                // Ensure pharmacy has an ID and valid coordinates
                if (pharmacy.id && pharmacy.latitude && pharmacy.longitude) {
                    const uniqueKey = `pharmacy-${pharmacy.id}`;

                    // --- FIX: Prevent Duplicate Sidebar Cards and Markers ---
                    if (markerMap[uniqueKey]) {
                        return; // Skip if already processed
                    }

                    const coords = [parseFloat(pharmacy.longitude), parseFloat(pharmacy.latitude)];

                    // --- CUSTOM MARKER: Create a green plus-sign marker ---
                    const el = document.createElement('div');
                    el.className = 'custom-marker';
                    el.innerHTML = '<i class="fas fa-plus"></i>';

                    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                        .setHTML(`<strong>${pharmacy.name}</strong><br>${pharmacy.address}`);

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat(coords)
                        .setPopup(popup)
                        .addTo(map);
                    
                    markerMap[uniqueKey] = { marker, popup, pharmacy };

                    // --- Create Sidebar Card ---
                    const card = document.createElement('div');
                    card.className = 'pharmacy-card';
                    card.id = `card-${uniqueKey}`;
                    card.innerHTML = `
                        <h3>${pharmacy.name}</h3>
                        <p>${pharmacy.address}</p>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-primary btn-view-map" data-key="${uniqueKey}">View on Map</button>
                            <button class="btn btn-sm btn-secondary btn-directions" data-coords="${coords.join(',')}">Get Directions</button>
                        </div>
                    `;
                    pharmacyList.appendChild(card);

                    bounds.extend(coords);
                }
            });

            // Fit map to bounds if pharmacies were found
            // if (!bounds.isEmpty()) {
            //     map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
            // }
            // Centering is now handled by geolocate.trigger() on map load

            // Add event listeners to new buttons
            addCardEventListeners();

        } catch (error) {
            console.error('Error loading pharmacies:', error);
            pharmacyList.innerHTML = '<p class="p-4 text-red-500">Could not load pharmacies.</p>';
        }
    }

    // --- Event Listener Setup ---
    function addCardEventListeners() {
        document.querySelectorAll('.btn-view-map').forEach(btn => {
            btn.addEventListener('click', function() {
                const key = this.dataset.key;
                const entry = markerMap[key];
                if (entry) {
                    map.flyTo({ center: entry.marker.getLngLat(), zoom: 15 });
                    entry.popup.addTo(map);
                }
            });
        });

        document.querySelectorAll('.btn-directions').forEach(btn => {
            btn.addEventListener('click', function() {
                const coords = this.dataset.coords.split(',').map(Number);
                getDirections(coords);
            });
        });
    }

    // --- Directions Logic ---
    function getDirections(destination) {
        // Use Mapbox Directions API
        geolocate.on('geolocate', (e) => {
            const origin = [e.coords.longitude, e.coords.latitude];
            const directionsApiUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?steps=true&geometries=geojson&access_token=${mapboxAccessToken}`;

            fetch(directionsApiUrl)
                .then(response => response.json())
                .then(data => {
                    const route = data.routes[0].geometry.coordinates;
                    const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: route } };

                    if (map.getSource('route')) {
                        map.getSource('route').setData(geojson);
                    } else {
                        map.addLayer({
                            id: 'route',
                            type: 'line',
                            source: { type: 'geojson', data: geojson },
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#3887be', 'line-width': 5, 'line-opacity': 0.75 }
                        });
                    }
                });
        });
        geolocate.trigger(); // Trigger geolocation to get origin
    }

    // --- Drug Search Logic ---
    async function handleDrugSearch() {
        console.log('handleDrugSearch function was called!'); // Debug 6: Function execution
        const searchInput = document.getElementById('drug-search-input');
        const searchTerm = searchInput.value.trim();
        const pharmacyList = document.getElementById('pharmacy-list');

        if (!searchTerm) {
            // If search is cleared, reload all pharmacies
            loadPharmacies();
            return;
        }

        // Clear current list and markers
        pharmacyList.innerHTML = '<p class="p-4">Searching...</p>';
        Object.values(markerMap).forEach(entry => entry.marker.remove());
        for (const key in markerMap) {
            delete markerMap[key];
        }

        try {
            const response = await fetch(`/api/inventory/search/?drug_name=${encodeURIComponent(searchTerm)}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Search request failed');
            }

            const results = await response.json();
            pharmacyList.innerHTML = ''; // Clear 'Searching...' message

            if (!results || results.length === 0) {
                pharmacyList.innerHTML = '<p class="p-4">No pharmacies found with that drug.</p>';
                return;
            }

            const bounds = new mapboxgl.LngLatBounds();

            results.forEach(item => {
                const pharmacy = item.pharmacy;
                if (pharmacy && pharmacy.latitude && pharmacy.longitude) {
                    const uniqueKey = `pharmacy-${pharmacy.id}`;
                    if (markerMap[uniqueKey]) return; // Avoid duplicates

                    const coords = [parseFloat(pharmacy.longitude), parseFloat(pharmacy.latitude)];

                    const el = document.createElement('div');
                    el.className = 'custom-marker';
                    el.innerHTML = '<i class="fas fa-pills"></i>'; // Use a pill icon for search results

                    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                        .setHTML(`<strong>${pharmacy.name}</strong><br>${item.drug_name} - <strong>Quantity: ${item.quantity}</strong>`);

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat(coords)
                        .setPopup(popup)
                        .addTo(map);

                    markerMap[uniqueKey] = { marker, popup, pharmacy };

                    const card = document.createElement('div');
                    card.className = 'pharmacy-card';
                    card.id = `card-${uniqueKey}`;
                    card.innerHTML = `
                        <h3>${pharmacy.name}</h3>
                        <p><strong>${item.drug_name}</strong></p>
                        <p>Available: ${item.quantity}</p>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-primary btn-view-map" data-key="${uniqueKey}">View on Map</button>
                            <button class="btn btn-sm btn-secondary btn-directions" data-coords="${coords.join(',')}">Get Directions</button>
                        </div>
                    `;
                    pharmacyList.appendChild(card);
                    bounds.extend(coords);
                }
            });

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
            }

            addCardEventListeners();

        } catch (error) {
            console.error('Error during drug search:', error);
            pharmacyList.innerHTML = '<p class="p-4 text-red-500">An error occurred during the search.</p>';
        }
    }


    // --- UI Event Listeners (Sidebar, Logout) ---
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }



    document.querySelectorAll('.logout-button').forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
});
