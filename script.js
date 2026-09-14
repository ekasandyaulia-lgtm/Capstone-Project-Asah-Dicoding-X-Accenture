// ========== 0. API CONFIGURATION ==========
const API_BASE_URL = '/api';

/**
 * Helper: Generic Fetch Wrapper
 */
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        // Optional: Handle 401 Unauthorized globally
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
             logout();
             return null;
        }

        if (!response.ok) {
            console.error(`API Error: ${response.status} - ${response.statusText}`);
            showAlert(`API Error: ${response.status} - ${response.statusText} for ${endpoint}`, "API Error", "error");
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Network Error:", error);
        showAlert("Gagal terhubung ke server. Pastikan backend berjalan.", "Network Error", "error");
        return null;
    }
}


// ========== 1. AUTHENTICATION ==========

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    const token = localStorage.getItem('authToken');
    if (token) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Restore Session UI
        document.getElementById('profile-name').innerText = localStorage.getItem('currentUser') || 'User';
        document.getElementById('profile-role').innerText = localStorage.getItem('currentRole') || 'Viewer';
        
        checkRoleAccess();
        renderDashboard();
        initChart();
        populateShippingDropdown();
        loadMiningFleetData(); // Ensure UI updated

        // === INIT NAV STATE ===
        currentPage = 'dashboard';
        pageHistory = [];
        updateBackButton();

    }
});

async function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if (!user || !pass) {
        showAlert('Mohon isi username dan password!', "Input Error", "warning");
        return;
    }

    const btn = event.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Loading...';
    btn.disabled = true;

    try {
        const res = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });

        if (res && res.token) {
            // Save Token & User Info
            localStorage.setItem('authToken', res.token);
            // Assuming res.user object exists as per docs
            const username = res.user ? res.user.username : user;
            const role = res.user ? res.user.role : 'Admin'; // Default fallback

            localStorage.setItem('currentUser', username);
            localStorage.setItem('currentRole', role);

            // UI Update
            document.getElementById('profile-name').innerText = username;
            document.getElementById('profile-role').innerText = role;

            // Animation
            const screen = document.getElementById('login-screen');
            screen.classList.add('opacity-0');
            setTimeout(() => {
                screen.classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                renderDashboard();
                checkRoleAccess();
                initChart();
                populateShippingDropdown();
                currentPage = 'dashboard';
                pageHistory = [];
                updateBackButton();
            }, 500);
        } else {
            showAlert(res && res.message ? res.message : 'Login Gagal. Cek username/password.', "Login Failed", "error");
        }
    } catch (e) {
        console.error(e);
        showAlert('Login Error', "System Error", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function logout() {
    // Optional: Call Logout API to invalidate session/log on server
    await fetchAPI('/auth/logout', { method: 'POST' });

    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentRole');
    location.reload();
}

function checkRoleAccess() {
    const role = localStorage.getItem('currentRole') || 'viewer';
    const allNavs = document.querySelectorAll('.role-restricted');
    
    // Normalize role string comparison
    const roleLower = role.toLowerCase();

    allNavs.forEach(el => {
        // logic: hidden by default
        el.classList.add('hidden');
        el.classList.remove('flex'); // remove flex to hide properly if it uses flex
        
        if (roleLower === 'admin') {
             el.classList.remove('hidden');
             el.classList.add('flex');
        } else if (el.classList.contains(`role-${roleLower}`)) {
             el.classList.remove('hidden');
             el.classList.add('flex');
        }
    });

    // Handle specific page restrictions if current page is not allowed
    // (Simple check: if current page is 'users' and role not admin, redirect)
    // For now we rely on UI hiding.
}


// ========== 2. NAVIGATION & STATE ==========
let pageHistory = [];
let currentPage = 'dashboard';
function switchPage(pageId) {
    if (!localStorage.getItem('authToken')) return;

    // === SAVE HISTORY (UNTUK TOMBOL BACK) ===
    if (pageId !== currentPage) {
        pageHistory.push(currentPage);
    }

    // Reset Active States
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white');
        el.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700/50');
    });


    // Set Active
    const navMap = {
        'dashboard': 'nav-dashboard',
        'mining': 'nav-mining',
        'shipping': 'nav-shipping',
        'users': 'nav-users'
    };
    
    const activeNav = document.getElementById(navMap[pageId]);
    if (activeNav) {
        activeNav.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700/50');
        activeNav.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white');
    }

    // Hide All Pages
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));

    // Show Selected
    const page = document.getElementById(`page-${pageId}`);
    if (page) {
        page.classList.remove('hidden');
        page.classList.add('animate-fade-in');
    
        // Update Title
        const titles = {
            'dashboard': 'Dashboard Overview',
            'mining': 'Mining Plan Optimization',
            'shipping': 'Shipping Schedule & Risk',
            'users': 'User Management'
        };
        document.getElementById('page-title').innerText = titles[pageId];

        // Load Data per Page
        if (pageId === 'dashboard') renderDashboard();
        if (pageId === 'users') loadUsers();
        if (pageId === 'mining') populateMiningWeeks();
    }
    // === UPDATE CURRENT PAGE & BACK BUTTON ===
    currentPage = pageId;
    updateBackButton();
}

function goBackPage() {
    if (pageHistory.length === 0) return;
    const prevPage = pageHistory.pop();
    switchPage(prevPage);
}

function updateBackButton() {
    const btn = document.getElementById('btn-back');
    if (!btn) return;

    if (currentPage === 'dashboard') {
        btn.classList.add('hidden');
    } else {
        btn.classList.remove('hidden');
    }
}

// ========== 3. USER MANAGEMENT ==========

async function loadUsers() {
    const list = document.getElementById('user-list');
    if (!list) return;
    
    list.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Loading...</td></tr>';

    const res = await fetchAPI('/users');
    
    if (res && res.message && res.message.users) {
        const users = res.message.users;
        list.innerHTML = ''; // Clear

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors';
            
            const r = (u.role || '').toLowerCase();
            const isActive = r !== 'inactive';
            
            // Map Role Color
            let roleColor = 'text-gray-500';
            if (isActive) {
                if (r === 'admin') roleColor = 'text-red-500 font-bold';
                if (r === 'mining') roleColor = 'text-blue-500';
                if (r === 'shipping') roleColor = 'text-purple-500';
            } else {
                roleColor = 'text-gray-400 italic';
            }

            const displayRole = isActive ? u.role : 'Suspended';
            
            const statusBadge = isActive 
                ? '<span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs">Active</span>'
                : '<span class="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">Inactive</span>';

            tr.innerHTML = `
                <td class="p-4 text-gray-900 dark:text-white font-medium">${u.username}</td>
                <td class="p-4 ${roleColor}">${displayRole}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right">
                    <button onclick="editUser('${u.user_id}', '${u.username}', '${u.role}')" class="text-blue-400 hover:text-blue-600 mr-2">Edit</button>
                    <button onclick="deleteUser('${u.user_id}')" class="text-red-400 hover:text-red-600">Hapus</button>
                </td>
            `;
            list.appendChild(tr);
        });
    } else {
        list.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Gagal memuat data user.</td></tr>';
    }
}

// ADD USER (MODAL)
function addUser() {
    // Reset Form
    document.getElementById('add-user-name').value = '';
    document.getElementById('add-user-pass').value = '';
    document.getElementById('add-user-role').value = 'User';
    
    // Show Modal
    document.getElementById('add-user-modal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('add-user-modal').classList.add('hidden');
}

async function saveNewUser() {
    const username = document.getElementById('add-user-name').value;
    const role = document.getElementById('add-user-role').value;
    const password = document.getElementById('add-user-pass').value;

    if (!username || !password) {
        showAlert("Username dan Password wajib diisi!", "Validation Error", "warning");
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Creating...";

    try {
        const res = await fetchAPI('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (res && res.status === 'success') {
            showAlert('User berhasil ditambahkan!', "Success", "success");
            closeAddModal();
            loadUsers();
        } else {
            showAlert('Gagal menambah user: ' + (res?.message || 'Unknown error'), "Error", "error");
        }
    } catch (e) {
        console.error("Add user failed", e);
        showAlert('Gagal menambah user.', "System Error", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// EDIT USER (MODAL)
function editUser(id, oldName, oldRole) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = oldName;
    document.getElementById('edit-user-role-hidden').value = oldRole; // Store original role
    
    const statusSelect = document.getElementById('edit-user-status');
    const rLower = (oldRole||'').toLowerCase();

    if (rLower === 'inactive') {
        statusSelect.value = 'inactive';
    } else {
        statusSelect.value = 'active';
    }
    
    document.getElementById('edit-user-pass').value = ''; // Clear password
    document.getElementById('edit-user-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-user-modal').classList.add('hidden');
}

async function saveUserEdit() {
    const id = document.getElementById('edit-user-id').value;
    const newName = document.getElementById('edit-user-name').value;
    const oldRole = document.getElementById('edit-user-role-hidden').value;
    const status = document.getElementById('edit-user-status').value;
    const newPass = document.getElementById('edit-user-pass').value;

    // OPTIONAL PASSWORD:
    // Backend now supports partial updates.
    // If newPass is empty, backend will ignore it.
    
    // Determine Role:
    // If Inactive -> Role = 'inactive'
    // If Active -> Keep Old Role. OR if old role was inactive, default to 'User'.
    let finalRole = oldRole;
    if (status === 'inactive') {
        finalRole = 'inactive';
    } else {
        // Reactivating or keeping active
        if (oldRole.toLowerCase() === 'inactive') {
            finalRole = 'User'; // Default if reactivating (lost data)
        } else {
            finalRole = oldRole; // Preserve existing role (Admin/Mining/etc)
        }
    }

    const payload = { 
        username: newName, 
        role: finalRole
    };
    if(newPass) payload.password = newPass;

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Saving...";

    try {
        const res = await fetchAPI(`/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res) { 
            showAlert('User berhasil diupdate!', "Success", "success");
            closeEditModal();
            loadUsers();
        }
    } catch (e) {
        console.error("Edit failed", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function deleteUser(id) {
  openDeleteModal(id);
}
let deleteUserId = null;

function openDeleteModal(id) {
  deleteUserId = id;
  document.getElementById('delete-user-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  deleteUserId = null;
  document.getElementById('delete-user-modal').classList.add('hidden');
}

async function confirmDeleteUser() {
  if (!deleteUserId) return;

  const res = await fetchAPI(`/users/${deleteUserId}`, { method: 'DELETE' });

  if (res) {
    closeDeleteModal();
    loadUsers();
  }
}


function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  if (mainChart) updateChartTheme();
}

function initTheme() {
  if (
    localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  }
}

// ========== 4. CHATBOT LOGIC ==========

function toggleChat() {
    const chatBox = document.getElementById("chat-box");
    chatBox.classList.toggle("hidden");
    
    // Load history when opening
    if (!chatBox.classList.contains("hidden")) {
        loadChatHistory();
        // Focus input
        setTimeout(() => document.getElementById("chat-input").focus(), 100);
    }
}

async function loadChatHistory() {
    const msgContainer = document.getElementById("chat-messages");
    if(!msgContainer) return;
    
    // Keep the greeting? Or clear all? 
    // Docs say GET returns history. 
    // Let's clear and re-render.
    msgContainer.innerHTML = '';
    
    // Add default greeting first
    appendMessage('assistant', 'Halo! Saya siap membantu analisis tambang hari ini.');

    const res = await fetchAPI('/chat'); // GET
    if (res && res.history) {
        // Sort by time? Docs example shows array. Assuming chronological or we can sort.
        // Example: Created 11th then 12th. So appending in order is fine.
        res.history.forEach(item => {
            appendMessage('user', item.message);
            appendMessage('assistant', item.answer);
        });
        
        // Scroll to bottom
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    
    if (!message) return;

    // UI Optimistic Update
    appendMessage('user', message);
    input.value = '';
    
    // Show Loading/Typing...
    const loadingId = appendMessage('assistant', '...');

    try {
        const res = await fetchAPI('/chat', {
            method: 'POST',
            body: JSON.stringify({ message })
        });

        // Remove loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        let answer = null;

        // Format baru: { data: { answer } }
        if (res && res.data && res.data.answer) {
            answer = res.data.answer;

        // Format langsung: { answer }
        } else if (res && res.answer) {
            answer = res.answer;

        // Fallback lama: { message }
        } else if (res && res.message) {
            answer = res.message;
        }

        if (answer) {
            appendMessage('assistant', answer);
        } else {
            appendMessage('assistant', 'Maaf, respons AI tidak valid.');
        }

    } catch (e) {
        console.error(e);
        appendMessage('assistant', 'Terjadi kesalahan koneksi.');
    }
}


function appendMessage(sender, text) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "flex " + (sender === 'user' ? "justify-end" : "justify-start");
    
    // Use ID for removing loading mocks
    const id = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 9);
    div.id = id;

    const bubble = document.createElement("div");
    
    if (sender === 'user') {
        bubble.className = "bg-blue-600 text-white p-3 rounded-lg rounded-tr-none text-sm max-w-[85%] shadow-sm";
    } else {
        bubble.className = "bg-white dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-sm text-gray-700 dark:text-gray-300 max-w-[85%] border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none";
    }
    
    bubble.innerText = text;
    div.appendChild(bubble);
    container.appendChild(div);
    
    // Scroll
    container.scrollTop = container.scrollHeight;
    
    return id;
}

// Global State
let Weather_Condition = {};
// Fleet List and Shipment List are managed within their respective update functions or globals if needed.
let Fleet_Stats = { available: 0, maintenance: 0, intransit: 0 }; // For Mining Logic sharing

// B. DASHBOARD LOGIC
async function renderDashboard() {
    try {
        // 1. Fetch Summary
        const summaryMsg = await fetchAPI('/dashboard/summary');
        if (summaryMsg && summaryMsg.data) {
            const data = summaryMsg.data;
            document.getElementById('dash-prev-prod').innerText = (data.total_production || 0).toLocaleString();
            document.getElementById('dash-prev-date').innerText = `Week ${data.week_number || '--'}`;
            document.getElementById('dash-capacity').innerText = (data.total_capacity || 0).toLocaleString();
            document.getElementById('dash-achievement').innerText = (data.achievement || 0) + '%';
            
            const bar = document.getElementById('dash-achievement-bar');
            if(bar) bar.style.width = (data.achievement || 0) + '%';
        }

        // 2. Fetch Fleet
        const fleetResponse = await fetchAPI('/dashboard/fleet');
        if (fleetResponse) {
            // Handle wrapper: { data: [...] } or [...]
            const fleetData = Array.isArray(fleetResponse) ? fleetResponse : (fleetResponse.data || fleetResponse.message || []);
            
            // Calculate stats
            const total = fleetData.length;
            const active = fleetData.filter(f => f.fleet_status_new === 'available').length;
            const maint = fleetData.filter(f => f.fleet_status_new === 'maintenance').length;
            const intransit = fleetData.filter(f => f.fleet_status_new === 'transit').length;

            // Update Global Stats for Mining Page
            Fleet_Stats = { available: active, maintenance: maint, intransit: intransit };

            document.getElementById('fleet-total').innerText = total;
            document.getElementById('fleet-active').innerText = active;
            document.getElementById('fleet-maintenance').innerText = maint;
            document.getElementById('fleet-intransit').innerText = intransit;

            renderFleetChart(active, maint, intransit);
            
            // Force update Mining Plan data
            loadMiningFleetData();

            // Render List
            const fleetListEl = document.getElementById('fleet-list');
            fleetListEl.innerHTML = '';
            fleetData.forEach(f => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-xs';
                
                let statusColor = 'text-gray-500';
                if(f.fleet_status_new === 'available') statusColor = 'text-green-500';
                else if(f.fleet_status_new === 'maintenance') statusColor = 'text-red-500';
                else if(f.fleet_status_new === 'intransit') statusColor = 'text-yellow-500';

                div.innerHTML = `
                    <div>
                        <span class="font-bold text-gray-900 dark:text-white">${f.vehicle_id || f.vehicle_type}</span> 
                        <span class="text-gray-500">(${f.vehicle_type})</span>
                    </div>
                    <div class="text-right">
                        <div class="${statusColor} font-bold">${f.fleet_status_new}</div>
                    </div>
                `;
                fleetListEl.appendChild(div);
            });
        }

        // 3. Fetch Weather
        const weatherResponse = await fetchAPI('/dashboard/weather');
        if (weatherResponse) {
            const wData = weatherResponse.data || weatherResponse;
            Weather_Condition = wData; // store globally

            document.getElementById('weather-rain').innerText = (wData.rainfall_mm !== undefined ? wData.rainfall_mm : '--') + ' mm';
            // Check for temperature key variations
            const tempVal = wData.temperature !== undefined ? wData.temperature : (wData.temperature_c !== undefined ? wData.temperature_c : '--');
            document.getElementById('weather-temp').innerText = tempVal + '°C';
            document.getElementById('weather-wind').innerText = (wData.wind_speed_kmh !== undefined ? wData.wind_speed_kmh : '--') + ' km/h';
            document.getElementById('weather-wave').innerText = (wData.wave_height_m !== undefined ? wData.wave_height_m : '--') + ' m';
            
            const wsiEl = document.getElementById('weather-wsi');
            if(wsiEl) wsiEl.innerText = wData.wsi || '--';
            
            const statusEl = document.getElementById('weather-status');
            if(statusEl) statusEl.innerText = wData.weather_status || '--';
        }

        // 4. Fetch Shipments (Mini List)
        const shipResponse = await fetchAPI('/dashboard/shipments');
        if (shipResponse) {
             const shipData = Array.isArray(shipResponse) ? shipResponse : (shipResponse.data || shipResponse.message || []);
            
            const shipListEl = document.getElementById('shipment-list-mini');
            if (shipListEl) {
                shipListEl.innerHTML = '';
                shipData.forEach(s => {
                    const tr = document.createElement('tr');
                    const isGoodStatus = ['pending', 'ready', 'scheduled', 'on_time', 'completed'].includes((s.shipment_status || '').toLowerCase());
                    const fleetClass = isGoodStatus ? 'text-green-500' : 'text-red-500';
                    const displayStatus = s.shipment_status || 'Unknown';
                    
                    tr.innerHTML = `
                        <td class="py-2">
                            <div class="font-bold text-gray-900 dark:text-white">${s.vessel_name || 'Barge'}</div>
                            <div class="text-[10px] text-gray-500">${s.destination || 'Port'}</div>
                        </td>
                        <td class="py-2 text-xs text-gray-500">${s.departure_date ? new Date(s.departure_date).toLocaleDateString() : '--'}</td>
                        <td class="py-2 text-right text-xs ${fleetClass} font-bold">${displayStatus}</td>
                    `;
                    shipListEl.appendChild(tr);
                });
            }
        }

        // 5. Fetch Chart
        const chartResponse = await fetchAPI('/dashboard/chart');
        let chartData = Array.isArray(chartResponse) ? chartResponse : (chartResponse.data || chartResponse.message || []);
        
        if (chartData && mainChart) {
             // Expecting [{ "week_number": 12, "total_production": 12000 }, ... ]
             // Need to sort by week or assume sorted.
             chartData.sort((a,b) => a.week_number - b.week_number);
             
             mainChart.data.labels = chartData.map(d => 'Week ' + d.week_number);
             mainChart.data.datasets[0].data = chartData.map(d => d.total_production);
             mainChart.update();
        }

    } catch (e) {
        console.error("Dashboard render failed", e);
    }
}

let fleetChartInstance;
function renderFleetChart(active, maintenance, intransit) {
  const ctx = document.getElementById("fleetChart");
  if (!ctx) return;

  if (fleetChartInstance) fleetChartInstance.destroy();

  fleetChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Active", "Maintenance", "Intransit"],
      datasets: [
        {
          data: [active, maintenance, intransit],
          backgroundColor: ["#22c55e", "#ef4444", "#eab308"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      cutout: "70%",
    },
  });
}

// C. MINING PLAN LOGIC
// fleet_status_new is now Fleet_Stats (Global) populated by Dashboard API

async function populateMiningWeeks() {
    const select = document.getElementById('mining-week');
    if (!select) return;

    // Loading state
    select.innerHTML = '<option>Loading...</option>';

    try {
        // 1. Load All Available Weeks (from Chart or Mining Data)
        const res = await fetchAPI('/dashboard/chart');
        let weeks = [];
        
        if (res) {
            const data = Array.isArray(res) ? res : (res.data || res.message || []);
            const uniqueWeeks = [...new Set(data.map(d => d.week_number))];
            weeks = uniqueWeeks.sort((a,b) => b - a); // Descending
        }

        // 2. Load Closest/Current Week
        let closestWeek = null;
        try {
            const rangeRes = await fetchAPI('/mining/closest-week');
            if(rangeRes && rangeRes.message && rangeRes.message.week_number) {
                closestWeek = rangeRes.message.week_number;
            } else if (rangeRes && rangeRes.data && rangeRes.data.week_number) {
                closestWeek = rangeRes.data.week_number;
            }
        } catch(err) {
            console.warn("Could not fetch closest week", err);
        }

        // If no data, fallback
        if (weeks.length === 0) {
            select.innerHTML = '<option value="">No Data</option>';
            return;
        }

        // Populate
        select.innerHTML = '';
        weeks.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.text = `Week ${w}`;
            select.appendChild(opt);
        });

        // 3. Auto Select Closest
        if (closestWeek && weeks.includes(closestWeek)) {
            select.value = closestWeek;
        } else {
            select.selectedIndex = 0; // Default to latest
        }

        // Auto Run
        runMiningLogic();
        
        // Also Populate Vessels for Correction Dropdown
        populateMiningVessels();
        
    } catch (e) {
        console.error("Failed to load weeks", e);
        select.innerHTML = '<option value="48">Week 48 (Fallback)</option>';
    }
}

async function populateMiningVessels() {
    const select = document.getElementById('mining-correct-vessel');
    if (!select) return;
    
    // Avoid re-fetching if already populated (optional optimization)
    if (select.options.length > 1) return;

    try {
        const weekInput = document.getElementById('mining-week').value;
        const weekNumber = parseInt(weekInput.replace(/\D/g, '')) || 48;

        const res = await fetchAPI('/mining/vessels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                week_number: weekNumber
            })
        });

        if (res) {
            let vessels = [];

            if (Array.isArray(res)) {
                vessels = res;
            } else if (Array.isArray(res.data)) {
                vessels = res.data;
            } else if (res.message && Array.isArray(res.message)) {
                vessels = res.message;
            } else if (res.message?.rows && Array.isArray(res.message.rows)) {
                vessels = res.message.rows;
            }

            if (vessels.length > 0) {
                select.innerHTML = '<option value="">-- Pilih Unit --</option>';

                vessels.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.vessel_name;
                    opt.textContent = v.vessel_name;
                    select.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Failed to load mining vessels", e);
    }

}

function loadMiningFleetData() {
    // Populate UI with data (Read-Only)
    // Ensure Fleet_Stats is populated (e.g. by renderDashboard)
    document.getElementById('mining-fleet-avail').innerText = Fleet_Stats.available;
    document.getElementById('mining-fleet-maint').innerText = Fleet_Stats.maintenance;
    document.getElementById('mining-fleet-transit').innerText = Fleet_Stats.intransit;
}

async function runMiningLogic(evt) {
    const btn = evt?.currentTarget || document.getElementById('btn-run-mining');
    const originalText = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⚙️ Menghitung...';
    }

    document.getElementById('mining-result').classList.add('hidden');

    try {
        const weekInput = document.getElementById('mining-week').value;
        const weekNumber = parseInt(weekInput.replace(/\D/g, '')) || 48;

        const res = await fetchAPI('/mining/simulate', {
            method: 'POST',
            body: JSON.stringify({ week_number: weekNumber })
        });

        // ====== HASIL SIMULASI (KODE KAMU, TETAP DI SINI) ======
        if (res && res.message) {
            const msg = res.message;
            const features = msg.features;

            const production = msg.predicted_production_ton;
            const achievement = msg.achievement_percent;

            document.getElementById('sim-capacity').innerText =
                features.capacity_ton ? features.capacity_ton.toLocaleString() : '-';

            document.getElementById('sim-capacity-comp').innerText =
                features.capacity_ton ? features.capacity_ton.toLocaleString() : '-';

            document.getElementById('sim-weather-factor').innerText =
                features.weather_factor ?? '-';

            document.getElementById('sim-effective').innerText =
                Math.round(production).toLocaleString();

            document.getElementById('sim-result-ton').innerText =
                Math.round(production).toLocaleString();

            document.getElementById('sim-result-ach').innerText =
                achievement.toFixed(2) + '%';

            document.getElementById('wsi-value').innerText =
                features.wsi ? features.wsi.toFixed(2) : '-';

            // ====== RECOMMENDATION ======
            let recs = [];
            if (achievement < 85)
                recs.push(`Achievement low (${achievement.toFixed(1)}%) -> Check Fleet Availability.`);
            if (features.weather_factor > 0.6)
                recs.push("Weather factor high -> Potential delays.");
            if (features.is_extreme)
                recs.push("Extreme weather predicted -> Safety warning.");
            if (recs.length === 0)
                recs.push("Mining plan looks optimal.");

            const recListHtml = recs
                .map(r => `<li class="mb-1">• ${r}</li>`)
                .join('');

            document.getElementById('sim-recommendation').innerHTML =
                `<ul class="text-sm text-gray-700 dark:text-gray-300 italic text-left list-none">
                    ${recListHtml}
                 </ul>`;

            document.getElementById('sim-justification').innerText =
                `Simulation based on Week ${msg.week_number} data.`;

            document.getElementById('mining-result').classList.remove('hidden');
            document.getElementById('mining-result')
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

    } catch (e) {
        console.error("Mining Simulation Failed", e);

    } finally {
        // ====== INI TETAP DI BAWAH, WAJIB ======
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function approvePlan() {
    // Determine active page to know which approve endpoint to call
    const activePage = document.querySelector('.page-content:not(.hidden)').id;
    
    if (activePage === 'page-mining') {
        const weekInput = document.getElementById('mining-week').value; 
        const weekNumber = parseInt(weekInput.replace(/\D/g, '')) || 48;
        const user = localStorage.getItem('currentUser') || 'User';

        const res = await fetchAPI('/mining/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                week_number: weekNumber,
                approved_by: user,
                notes: "Approved via Web Dashboard"
            })
        });

        if (res && res.status === 'success') {
            showAlert('Rencana Produksi Disetujui! Data tersimpan.', "Plan Approved", "success");
            switchPage('dashboard');
        }
    } else if (activePage === 'page-shipping') {
        const dateVal = document.getElementById('shipping-date').value;
        if (!dateVal) {
             showAlert("Pilih tanggal keberangkatan terlebih dahulu.", "Input Required", "warning");
             return;
        }
        
        // Calculate Week Number from Date
        const d = new Date(dateVal);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + 1) / 7);

        const user = localStorage.getItem('currentUser') || 'User';

        const res = await fetchAPI('/shipping/approve', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 week_number: weekNum,
                 approved_by: user,
                 notes: "Approved Shipping Plan via Web"
             })
        });

        if (res && res.status === 'success') {
             showAlert('Rencana Shipping Disetujui!', "Plan Approved", "success");
             switchPage('dashboard');
        }
    }
}

function revisePlan(type) {
    const formId = type === 'mining' ? 'mining-correction' : 'shipping-correction';
    const form = document.getElementById(formId);
    if (form) {
        form.classList.remove('hidden');
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus textarea
        const textId = type === 'mining' ? 'mining-correction-text' : 'shipping-correction-text';
        setTimeout(() => document.getElementById(textId).focus(), 500);
    }
}

function cancelCorrection(type) {
    const formId = type === 'mining' ? 'mining-correction' : 'shipping-correction';
    document.getElementById(formId).classList.add('hidden');
}

// MINING CORRECTION LOGIC


async function submitCorrection(type) {
    const inputId = type === 'mining' ? 'mining-correction-text' : 'shipping-correction-text';
    const input = document.getElementById(inputId).value;
    
    if (!input.trim()) {
        showAlert('Mohon isi detail koreksi/alasan untuk retraining.', "Input Required", "warning");
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '🔄 Retraining AI...';

    const user = localStorage.getItem('currentUser') || 'User';

    try {
        let payload = {};
        let endpoint = '';

        if (type === 'mining') {
             const weekInput = document.getElementById('mining-week').value; 
             const weekNumber = parseInt(weekInput.replace(/\D/g, '')) || 48;
             
             // Gather Mining Inputs
             const vessel = document.getElementById('mining-correct-vessel').value;
             const field = document.getElementById('mining-correct-field').value;
             const val = document.getElementById('mining-correct-value').value;
             
             if (!vessel || !val) { showAlert("Mohon lengkapi data koreksi.", "Input Incomplete", "warning"); return; }

             endpoint = '/mining/correction';
             payload = {
                 week_number: weekNumber,
                 vessel_name: vessel,
                 field_name: field,
                 new_value: parseFloat(val),
                 corrected_by: user,
                 reason: input
             };

         } else {
            // Shipping Correction
            const vName = document.getElementById('shipping-vessel').value;
            const dateRaw = document.getElementById('shipping-date').value;
            const dest = document.getElementById('shipping-dest').value;
            
            const field = document.getElementById('shipping-correct-field').value;
            const val = document.getElementById('shipping-correct-value').value;

            if (!vName || !dateRaw || !dest || !val) { 
                showAlert("Mohon lengkapi filter kapal dan data koreksi.", "Input Incomplete", "warning"); 
                return; 
            }

            // Convert date to YYYY-MM-DD 
            let date;
            if (dateRaw.includes('T')) {
                const d = new Date(dateRaw);
                date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            } else {
                date = dateRaw;
            }

           //revisi
            endpoint = '/shipping/correction';

            payload = {
                vessel_name: vName,
                departure_date: date,
                destination: dest,
                field_name: field,
                new_value: parseFloat(val),
                corrected_by: user,
                reason: input
            };
        }

        const res = await fetchAPI(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res && res.status === 'success') {
            showAlert(`Koreksi Berhasil Disimpan!`, "Success", "success");
            document.getElementById(inputId).value = '';
            // Clear other inputs too if needed
            if (type === 'mining') {
                document.getElementById('mining-correct-vessel').value = '';
                document.getElementById('mining-correct-value').value = '';
            } else {
                document.getElementById('shipping-correct-value').value = '';
            }

            cancelCorrection(type);
            
            // Refresh Data
            if (type === 'mining') {
                 document.getElementById('mining-result').scrollIntoView({ behavior: 'smooth' });
                 runMiningLogic();
            } else {
                 document.getElementById('shipping-result').scrollIntoView({ behavior: 'smooth' });
                 runShippingLogic();
            }
        }
    } catch (e) {
        console.error("Correction Failed", e);
        showAlert("Gagal menyimpan koreksi: " + e.message, "Correction Failed", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// D. SHIPPING PLAN LOGIC
async function populateShippingDropdown() {
    const selectVessel = document.getElementById('shipping-vessel');
    const selectDate = document.getElementById('shipping-date');
    const selectDest = document.getElementById('shipping-dest');

    // Initial State: Load Vessels
    const vesselsResponse = await fetchAPI('/shipping/vessels');
    selectVessel.innerHTML = '<option value="">-- Pilih Kapal --</option>';
    
    if (vesselsResponse) {
        // Correct unwrapping: check if .data is array, if not check .message
        let vessels = [];
        if (Array.isArray(vesselsResponse)) {
            vessels = vesselsResponse;
        } else if (Array.isArray(vesselsResponse.data)) {
            vessels = vesselsResponse.data;
        } else if (Array.isArray(vesselsResponse.message)) {
            vessels = vesselsResponse.message;
        }
        
        vessels.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.vessel_name;
            opt.text = v.vessel_name;
            selectVessel.appendChild(opt);
        });
    }

    // Event: Vessel Changed -> Load Dates
    selectVessel.addEventListener('change', async (e) => {
        const vName = e.target.value;
        selectDate.innerHTML = '<option value="">-- Pilih Tanggal --</option>';
        selectDest.innerHTML = '<option value="">-- Pilih Tujuan --</option>';
        document.getElementById('ship-detail-card').classList.add('hidden');
        
        if (vName) {
           const datesRes = await fetchAPI(`/shipping/departure-dates/${encodeURIComponent(vName)}`);
           if (datesRes && datesRes.message) { 
               const dates = datesRes.message; 
               dates.forEach(d => {
                   const opt = document.createElement('option');
                   opt.value = d.departure_date;
                   opt.text = new Date(d.departure_date).toLocaleDateString();
                   selectDate.appendChild(opt);
               });
           }
        }
    });

    // Event: Date Changed -> Load Destinations
    selectDate.addEventListener('change', async (e) => {
        const vName = selectVessel.value;
        const date = e.target.value;
        selectDest.innerHTML = '<option value="">-- Pilih Tujuan --</option>';
        document.getElementById('ship-detail-card').classList.add('hidden');

        if (vName && date) {
            // Correct Endpoint: /shipping/destination/:vessel/:date (Formatted YYYY-MM-DD)
            // Note: 'date' is ISO string from value (e.g. 2025-05-14T17:00:00.000Z)
            // We need to convert to Local Date YYYY-MM-DD for the backend
            const dObj = new Date(date);
            const year = dObj.getFullYear();
            const month = String(dObj.getMonth() + 1).padStart(2, '0');
            const day = String(dObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const destRes = await fetchAPI(`/shipping/destination/${encodeURIComponent(vName)}/${encodeURIComponent(dateStr)}`);
            
            if (destRes) {
                 // Handle wrapper: Standard parsing for new backend
                 let dests = [];
                 if (destRes && Array.isArray(destRes.data)) {
                     dests = destRes.data;
                 } else if (destRes && Array.isArray(destRes.message)) { // Fallback for old backend quirks
                     dests = destRes.message;
                 } else if (Array.isArray(destRes)) {
                     dests = destRes;
                 }
                 
                 dests.forEach(d => {
                      const opt = document.createElement('option');
                      opt.value = d.destination;
                      opt.text = d.destination;
                      selectDest.appendChild(opt);
                 });
            }
        }
    });


    // Event: Destination Changed -> Show Details
    selectDest.addEventListener('change', () => {
         updateShipDetails();
    });
}

async function updateShipDetails() {
    const vName = document.getElementById('shipping-vessel').value;
    const date = document.getElementById('shipping-date').value;
    const dest = document.getElementById('shipping-dest').value;

    if (!vName || !date || !dest) return;

    try {
        // WORKAROUND: The /shipping/details endpoint is broken (400 Bad Request).
        // Fetch full fleet summary and filter client-side.
        const res = await fetchAPI('/fleet/summary');
        
        let allUnits = [];
        // Handle inconsistent backend response structure
        if (res && res.message && res.message.units) {
            allUnits = res.message.units;
        } else if (res && res.data && res.data.units) {
            allUnits = res.data.units;
        }

        // Filter Logic
        let ship = allUnits.find(u => {
             if (u.vessel_name !== vName) return false;
             if (u.departure_date.startsWith(date)) return true;
             
             // ISO Fallback (Allow 24h window for timezone diffs)
             const uDate = new Date(u.departure_date);
             const targetDate = new Date(date);
             if (isNaN(uDate) || isNaN(targetDate)) return false; 
             const diff = Math.abs(uDate - targetDate);
             return diff < 86400000;
        });

        if (ship) {
            const card = document.getElementById('ship-detail-card');
            card.classList.remove('hidden');
            
            document.getElementById('ship-dest-val').innerText = ship.destination || dest;
            document.getElementById('ship-vol-val').innerText = (ship.cargo_volume_ton ? ship.cargo_volume_ton.toLocaleString() : '0') + ' MT';
            document.getElementById('ship-cap-val').innerText = (ship.capacity_ton ? ship.capacity_ton.toLocaleString() : '0') + ' MT';
            document.getElementById('ship-arrival-val').innerText = ship.arrival_estimate ? new Date(ship.arrival_estimate).toLocaleDateString() : '--';
            
            const statusEl = document.getElementById('ship-status-val');
            const st = ship.shipment_status || ship.status || 'Unknown';
            statusEl.innerText = st.replace(/_/g, ' ').toUpperCase();
            
            const stLower = st.toLowerCase();
            statusEl.className = (stLower === 'delayed' || stLower === 'cancelled' || stLower === 'maintenance') 
                ? 'font-bold text-red-500 block' 
                : 'font-bold text-green-500 block';
        }
    } catch (err) {
        console.error("Error fetching ship details via fleet summary:", err);
    }
}

async function runShippingLogic() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    const vName = document.getElementById('shipping-vessel').value;
    const date = document.getElementById('shipping-date').value;
    const dest = document.getElementById('shipping-dest').value;

    if (!vName || !date || !dest) {
        showAlert("Pilih kapal, tanggal, dan tujuan terlebih dahulu!", "Input Required", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Analisis Risiko...';
    document.getElementById('shipping-result').classList.add('hidden');

    const dObj = new Date(date);
    const dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;

    let payload = {
        vessel_name: vName,
        departure_date: dateStr,
        destination: dest
    };

    let res = await fetchAPI('/shipping/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // RETRY LOGIC: If YYYY-MM-DD fails, try ISO String
    const isError = !res || (res.status === 'error');
    const isNotFound = res && typeof res.message === 'string' && res.message.toLowerCase().includes('not found');

    if (isError || isNotFound) {
          console.warn("Retrying /simulate with ISO Date...");
          payload.departure_date = date; // Use original ISO string
          res = await fetchAPI('/shipping/simulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
    }

    btn.disabled = false;
    btn.innerHTML = originalText;

    // PARSING LOGIC: New Backend returns { features, risk_level, speed_status, delay_hours, rekomendasi, justifikasi }
    // Wrapped in standard response structure
    let data = null;
    if (res && res.data && res.data.features) {
        data = res.data;
    } else if (res && res.features) { 
        data = res;
    } else if (res && res.message && res.message.features) { // Fallback
         data = res.message;
    }

    if (data && data.features) {
        const feat = data.features;
        const risk = data.risk_level;
        const speedSt = data.speed_status;
        const delay = data.delay_hours || 0;
        const recs = data.rekomendasi || [];
        const just = data.justifikasi || "";

        document.getElementById('risk-wave').innerText = (feat.wave_height_m || 0).toFixed(2) + ' m';
        document.getElementById('risk-wind').innerText = (feat.wind_speed_kmh || 0).toFixed(2) + ' km/h';
        document.getElementById('risk-load').innerText = ((feat.load_ratio || 0)).toFixed(0) + '%'; 
        document.getElementById('risk-speed').innerText = (feat.actual_speed || 0).toFixed(1) + ' kts';
        document.getElementById('risk-duration').innerText = (feat.duration || 0).toFixed(1) + ' hours';
        
        document.getElementById('ship-speed-status').innerText = speedSt;
        
        // Fix: Derive Load Status from Ratio (since API doesn't return text status for load)
        const loadRatio = feat.load_ratio || 0;
        let loadStText = "Safe";
        let loadStClass = "text-xl font-bold mt-3 text-green-500";
        if (loadRatio > 1.1) {
             loadStText = "Overload";
             loadStClass = "text-xl font-bold mt-3 text-red-500";
        } else if (loadRatio > 1.0) {
             loadStText = "Warning";
             loadStClass = "text-xl font-bold mt-3 text-orange-500";
        }
        
        const loadStEl = document.getElementById('risk-load-status');
        loadStEl.innerText = loadStText;
        loadStEl.className = loadStClass; // Override classes to match style

        const riskEl = document.getElementById('ship-risk-level');
        riskEl.innerText = risk;
        riskEl.className = risk === 'High' ? 'text-3xl font-bold mt-2 text-red-600' : (risk === 'Medium' ? 'text-3xl font-bold mt-2 text-orange-500' : 'text-3xl font-bold mt-2 text-green-600');

        const delayEl = document.getElementById('ship-delay');
        delayEl.innerText = delay > 0 ? `+${delay.toFixed(1)} Jam` : '0 Jam';
        delayEl.className = delay > 0 ? 'text-3xl font-bold mt-2 text-red-500' : 'text-3xl font-bold mt-2 text-green-500';

        // Recommendations (Array to String)
        if (Array.isArray(recs)) {
             document.getElementById('ship-recommendation').innerText = recs.join(' ');
        } else {
             document.getElementById('ship-recommendation').innerText = recs;
        }

        document.getElementById('ship-justification').innerText = just;
        
        // Status Result (Derived)
        const statusResultEl = document.getElementById('ship-result-status');
        const opStatus = delay > 2 ? "Major Delay" : (delay > 0 ? "Minor Delay" : "On Time");
        statusResultEl.innerText = opStatus;
        statusResultEl.className = delay > 0 ? "font-bold text-red-600 text-lg" : "font-bold text-green-600 text-lg";

        const delayResultEl = document.getElementById('ship-result-delay');
        delayResultEl.innerText = delay > 0 ? `+${delay.toFixed(1)} Jam` : "Tepat Waktu";
        delayResultEl.className = delay > 0 ? "font-bold text-red-500 text-lg" : "font-bold text-green-500 text-lg";

        document.getElementById('shipping-result').classList.remove('hidden');
        const emptyEl = document.getElementById('shipping-empty');
        if(emptyEl) emptyEl.classList.add('hidden');
        document.getElementById('shipping-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
         console.warn("Simulation data missing or malformed", res);
         // Fallback alert if user clicks and nothing happens
         showAlert("Simulasi gagal: Data tidak lengkap dari server.", "Simulation Error", "error");
    }
}

// E. CHART (Historical Production)
let mainChart;
function initChart() {
  const ctx = document.getElementById("mainChart");
  if (ctx) {
    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "#374151" : "#e5e7eb";
    const tickColor = isDark ? "#9ca3af" : "#6b7280";

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "Week 41",
          "Week 42",
          "Week 43",
          "Week 44",
          "Week 45",
          "Week 46",
          "Week 47",
        ],
        datasets: [
          {
            label: "Produksi (MT)",
            data: [26000, 27500, 25000, 28000, 29000, 27000, 28500],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: { color: tickColor },
            title: {
              display: true,
              text: "Total Volume Muatan (Ton)",
              color: tickColor,
            },
          },
          x: {
            grid: { color: gridColor },
            ticks: { color: tickColor },
            title: {
              display: true,
              text: "Tanggal Keberangkatan",
              color: tickColor,
            },
          },
        },
      },
    });
  }
}

function updateChartTheme() {
  if (mainChart) {
    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "#374151" : "#e5e7eb";
    const tickColor = isDark ? "#9ca3af" : "#6b7280";
    mainChart.options.scales.x.grid.color = gridColor;
    mainChart.options.scales.x.ticks.color = tickColor;
    mainChart.options.scales.y.grid.color = gridColor;
    mainChart.options.scales.y.ticks.color = tickColor;
    mainChart.update();
  }
}

// ========== 6. GLOBAL ALERT SYSTEM ==========
function showAlert(message, title = "Notification", type = "info") {
    const modal = document.getElementById('alert-modal');
    if (!modal) {
        // Fallback if modal HTML is missing
        console.warn("Alert modal missing, falling back to window.alert");
        window.alert(message);
        return;
    }

    const msgEl = document.getElementById('alert-message');
    const titleEl = document.getElementById('alert-title');
    const iconEl = document.getElementById('alert-icon-container');

    msgEl.innerText = message;
    titleEl.innerText = title;
    
    // Icon logic
    let iconHtml = '';
    if (type === 'success') {
         iconHtml = `<div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 text-3xl shadow-lg border-4 border-white dark:border-gray-800 animate-bounce-short">✅</div>`;
         titleEl.className = "text-xl font-bold text-green-600 dark:text-green-400 mb-2";
    } else if (type === 'error') {
         iconHtml = `<div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-3xl shadow-lg border-4 border-white dark:border-gray-800 animate-pulse-short">❌</div>`;
         titleEl.className = "text-xl font-bold text-red-600 dark:text-red-400 mb-2";
    } else {
         iconHtml = `<div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl shadow-lg border-4 border-white dark:border-gray-800">ℹ️</div>`;
         titleEl.className = "text-xl font-bold text-blue-600 dark:text-blue-400 mb-2";
    }
    iconEl.innerHTML = iconHtml;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAlert() {
    const modal = document.getElementById('alert-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}