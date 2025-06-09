// public/script.js
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const loginErrorEl = document.getElementById('loginError');

const employeeForm = document.getElementById('employeeForm');
const employeeList = document.getElementById('employeeList');
const employeeIdField = document.getElementById('employeeId');
const clearFormBtn = document.getElementById('clearFormBtn');
const formErrorEl = document.getElementById('formError');
const listErrorEl = document.getElementById('listError');

const API_BASE_URL = ''; // Relative path, as frontend is served by the same server

// --- UI Update Functions ---
function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
    loginErrorEl.textContent = '';
    formErrorEl.textContent = '';
    listErrorEl.textContent = '';
}

function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    fetchEmployees();
    resetForm();
}

// --- Authentication ---
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`);
        if (!response.ok) { // Catches 4xx, 5xx errors that fetch doesn't throw by default
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.isLoggedIn) {
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        showLogin(); // Default to login if status check fails
        loginErrorEl.textContent = 'Error connecting to server. Please try again later.';
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginErrorEl.textContent = '';
    const username = loginForm.username.value;
    const password = loginForm.password.value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showApp();
        } else {
            loginErrorEl.textContent = data.message || "Login failed. Please check your credentials.";
        }
    } catch (error) {
        console.error('Login error:', error);
        loginErrorEl.textContent = 'An error occurred during login.';
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        // Still show login even if logout API call fails
        showLogin();
        alert('Error during logout. You have been logged out on the client.');
    }
});


// --- Employee CRUD Functions ---
async function fetchEmployees() {
    listErrorEl.textContent = '';
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees`);
        if (response.status === 401) { // Unauthorized
            alert('Session expired or unauthorized. Please log in again.');
            showLogin();
            return;
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({message: `HTTP error! status: ${response.status}`}));
            throw new Error(errorData.message || `Failed to fetch employees. Status: ${response.status}`);
        }
        const employees = await response.json();
        displayEmployees(employees);
    } catch (error) {
        console.error('Failed to fetch employees:', error);
        employeeList.innerHTML = '<tr><td colspan="6">Error loading employees.</td></tr>';
        listErrorEl.textContent = error.message;
    }
}

function displayEmployees(employees) {
    employeeList.innerHTML = '';
    if (employees.length === 0) {
        employeeList.innerHTML = '<tr><td colspan="6">No employees found.</td></tr>';
        return;
    }
    employees.forEach(emp => {
        const row = employeeList.insertRow();
        row.innerHTML = `
            <td>${emp.id}</td>
            <td>${emp.firstName}</td>
            <td>${emp.lastName}</td>
            <td>${emp.email}</td>
            <td>${emp.position}</td>
            <td>
                <button class="edit-btn" onclick="editEmployeeForm('${emp.id}', '${emp.firstName}', '${emp.lastName}', '${emp.email}', '${emp.position}')">Edit</button>
                <button class="delete-btn" onclick="deleteEmployee(${emp.id})">Delete</button>
            </td>
        `;
    });
}

employeeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formErrorEl.textContent = '';

    const id = employeeIdField.value;
    const employeeData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        position: document.getElementById('position').value,
    };

    // Basic client-side validation (server-side is authoritative)
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.email || !employeeData.position) {
        formErrorEl.textContent = 'All fields are required.';
        return;
    }
    if (!/^\S+@\S+\.\S+$/.test(employeeData.email)) {
        formErrorEl.textContent = 'Please enter a valid email address.';
        return;
    }


    try {
        let response;
        let method = 'POST';
        let url = `${API_BASE_URL}/api/employees`;

        if (id) { // Update
            method = 'PUT';
            url = `${API_BASE_URL}/api/employees/${id}`;
        }

        response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
        });

        if (response.status === 401) {
            alert('Session expired or unauthorized. Please log in again.');
            showLogin();
            return;
        }
        const data = await response.json(); // Must try to parse JSON for error messages too

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }

        resetForm();
        fetchEmployees();
    } catch (error) {
        console.error('Failed to save employee:', error);
        formErrorEl.textContent = `Error: ${error.message}`;
    }
});

function editEmployeeForm(id, firstName, lastName, email, position) {
    employeeIdField.value = id;
    document.getElementById('firstName').value = firstName;
    document.getElementById('lastName').value = lastName;
    document.getElementById('email').value = email;
    document.getElementById('position').value = position;
    clearFormBtn.style.display = 'inline-block';
    formErrorEl.textContent = '';
    window.scrollTo(0, 0);
}

async function deleteEmployee(id) {
    listErrorEl.textContent = '';
    if (!confirm('Are you sure you want to delete this employee?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
            method: 'DELETE'
        });

        if (response.status === 401) {
            alert('Session expired or unauthorized. Please log in again.');
            showLogin();
            return;
        }
         const data = await response.json(); // Must try to parse JSON for error messages too

        if (!response.ok) {
             throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }
        fetchEmployees();
    } catch (error) {
        console.error('Failed to delete employee:', error);
        listErrorEl.textContent = `Error: ${error.message}`;
    }
}

function resetForm() {
    employeeForm.reset();
    employeeIdField.value = '';
    clearFormBtn.style.display = 'none';
    formErrorEl.textContent = '';
}

clearFormBtn.addEventListener('click', resetForm);

// Initial check
document.addEventListener('DOMContentLoaded', checkLoginStatus);