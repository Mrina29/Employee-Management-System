// server.js
const express = require('express');
const path = require('path'); // To serve static files

const app = express();
const PORT = 3000;

// --- Hardcoded Admin Credentials (DO NOT DO THIS IN PRODUCTION) ---
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "password123"; // Store hashed passwords in a real app!

// --- In-memory "session" flag (Very basic) ---
let isAdminLoggedIn = false;

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded form data (for login)

// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Authentication Middleware ---
function authenticateAdmin(req, res, next) {
    if (isAdminLoggedIn) {
        next(); // Admin is logged in, proceed to the next handler
    } else {
        res.status(401).json({ message: "Unauthorized: Admin not logged in." });
    }
}

// --- Authentication Routes ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        console.log("Admin logged in successfully.");
        res.json({ success: true, message: "Login successful" });
    } else {
        isAdminLoggedIn = false;
        console.log("Admin login failed.");
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.post('/api/auth/logout', (req, res) => {
    isAdminLoggedIn = false;
    console.log("Admin logged out.");
    res.json({ success: true, message: "Logout successful" });
});

app.get('/api/auth/status', (req, res) => {
    // Allows frontend to check login status (e.g., on page load)
    res.json({ isLoggedIn: isAdminLoggedIn });
});


// --- Employee Data (In-memory "database") ---
let employees = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john.doe@example.com", position: "Developer" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane.smith@example.com", position: "Designer" }
];
let nextId = 3;

// --- Employee CRUD API Endpoints (Now Protected) ---

// CREATE: Add a new employee
app.post('/api/employees', authenticateAdmin, (req, res) => {
    const { firstName, lastName, email, position } = req.body;

    // Server-side validation
    if (!firstName || !lastName || !email || !position) {
        return res.status(400).json({ message: "All fields (firstName, lastName, email, position) are required." });
    }
    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof email !== 'string' || typeof position !== 'string') {
        return res.status(400).json({ message: "All fields must be strings." });
    }
    // Basic email format check (can be more robust)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
    }
    // Check if email already exists (simple example)
    if (employees.some(emp => emp.email === email)) {
        return res.status(409).json({ message: "Employee with this email already exists." });
    }


    const newEmployee = {
        id: nextId++,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        position: position.trim()
    };
    employees.push(newEmployee);
    console.log("Created Employee:", newEmployee);
    res.status(201).json(newEmployee);
});

// READ: Get all employees
app.get('/api/employees', authenticateAdmin, (req, res) => {
    console.log("Fetched all employees");
    res.json(employees);
});

// READ: Get a single employee by ID
app.get('/api/employees/:id', authenticateAdmin, (req, res) => {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID format."});
    }
    const employee = employees.find(emp => emp.id === employeeId);

    if (employee) {
        console.log("Fetched employee by ID:", employeeId, employee);
        res.json(employee);
    } else {
        res.status(404).json({ message: "Employee not found." });
    }
});

// UPDATE: Update an existing employee
app.put('/api/employees/:id', authenticateAdmin, (req, res) => {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID format."});
    }

    const { firstName, lastName, email, position } = req.body;

    // Server-side validation
    if (!firstName || !lastName || !email || !position) {
        return res.status(400).json({ message: "All fields (firstName, lastName, email, position) are required for update." });
    }
    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof email !== 'string' || typeof position !== 'string') {
        return res.status(400).json({ message: "All fields must be strings for update." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email format for update." });
    }

    const employeeIndex = employees.findIndex(emp => emp.id === employeeId);

    if (employeeIndex !== -1) {
        // Check if updated email conflicts with another existing employee (excluding self)
        if (employees.some(emp => emp.email === email && emp.id !== employeeId)) {
            return res.status(409).json({ message: "Another employee with this email already exists." });
        }
        employees[employeeIndex] = {
            ...employees[employeeIndex],
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            position: position.trim()
        };
        console.log("Updated Employee:", employees[employeeIndex]);
        res.json(employees[employeeIndex]);
    } else {
        res.status(404).json({ message: "Employee not found for update." });
    }
});

// DELETE: Delete an employee
app.delete('/api/employees/:id', authenticateAdmin, (req, res) => {
    const employeeId = parseInt(req.params.id);
     if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID format."});
    }
    const initialLength = employees.length;
    employees = employees.filter(emp => emp.id !== employeeId);

    if (employees.length < initialLength) {
        console.log("Deleted Employee with ID:", employeeId);
        res.status(200).json({ message: "Employee deleted successfully." });
    } else {
        res.status(404).json({ message: "Employee not found for deletion." });
    }
});

// Catch-all for serving index.html for any non-API GET requests (for single-page app behavior if needed)
// Or just rely on express.static for index.html at the root.
// This is optional for this simple setup.
// app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Username: ${ADMIN_USERNAME}`);
    console.log(`Admin Password: ${ADMIN_PASSWORD} (This is for demo ONLY)`);
});