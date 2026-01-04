// API Configuration
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    showPage('home');
});

// Auth Functions
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (authToken && user) {
        currentUser = JSON.parse(user);
        updateNavbar();
    }
}

function updateNavbar() {
    if (currentUser) {
        document.getElementById('authNav').classList.add('d-none');
        document.getElementById('userNav').classList.remove('d-none');
        document.getElementById('userName').textContent = currentUser.firstName;
        
        // Update main nav based on role
        const mainNav = document.getElementById('mainNav');
        
        // Reset to base menu items first
        mainNav.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="showPage('home')">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="showPage('catalog')">Catalog</a>
            </li>
        `;
        
        // Add role-specific menu items
        if (currentUser.role === 'Librarian' || currentUser.role === 'Administrator') {
            mainNav.innerHTML += `
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showPage('checkout')">Checkout</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showPage('checkin')">Checkin</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showPage('manage-books')">Manage Books</a>
                </li>
            `;
        }
        if (currentUser.role === 'Administrator') {
            mainNav.innerHTML += `
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showPage('admin')">Admin</a>
                </li>
            `;
        }
    } else {
        document.getElementById('authNav').classList.remove('d-none');
        document.getElementById('userNav').classList.add('d-none');
    }
}

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usernameOrEmail: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.accessToken;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showAlert('Login successful!', 'success');
            updateNavbar();
            showPage('dashboard');
        } else {
            showAlert(data.error?.message || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'danger');
    }
}

async function register(event) {
    event.preventDefault();
    
    const data = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        membershipType: document.getElementById('regMembershipType').value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            showPage('login');
        } else {
            showAlert(result.error?.message || 'Registration failed', 'danger');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'danger');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    location.reload();
}

// Page Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    
    // Show selected page
    const pageMap = {
        'home': 'homePage',
        'catalog': 'catalogPage',
        'book-detail': 'bookDetailPage',
        'login': 'loginPage',
        'register': 'registerPage',
        'dashboard': 'dashboardPage',
        'checkout': 'checkoutPage',
        'checkin': 'checkinPage',
        'manage-books': 'manage-booksPage',
        'admin': 'adminPage'
    };
    
    const pageId = pageMap[pageName] || pageName + 'Page';
    const pageElement = document.getElementById(pageId);
    
    if (pageElement) {
        pageElement.classList.remove('d-none');
        
        // Load page content
        if (pageName === 'catalog') {
            searchBooks();
        } else if (pageName === 'dashboard') {
            loadDashboard();
        } else if (pageName === 'checkout') {
            loadCheckoutPage();
        } else if (pageName === 'checkin') {
            loadCheckinPage();
        } else if (pageName === 'manage-books') {
            loadManageBooksPage();
        } else if (pageName === 'admin') {
            loadAdminPage();
        }
    }
}

// Catalog Functions
async function searchBooks(query = '') {
    try {
        const searchQuery = query || document.getElementById('catalogSearch')?.value || '';
        const response = await fetch(`${API_URL}/books?q=${encodeURIComponent(searchQuery)}`);
        const books = await response.json();
        
        displayBooks(books);
    } catch (error) {
        showAlert('Error loading books: ' + error.message, 'danger');
    }
}

function searchFromHome() {
    const query = document.getElementById('homeSearch').value;
    showPage('catalog');
    setTimeout(() => {
        document.getElementById('catalogSearch').value = query;
        searchBooks(query);
    }, 100);
}

function displayBooks(books) {
    const container = document.getElementById('bookResults');
    
    if (books.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center">No books found</p></div>';
        return;
    }
    
    container.innerHTML = books.map(book => `
        <div class="col-md-4 col-lg-3">
            <div class="card book-card h-100" onclick="viewBook('${book.isbn}')">
                <div class="card-body">
                    <h6 class="card-title">${book.title}</h6>
                    <p class="card-text text-muted small">${book.author}</p>
                    <p class="card-text small">
                        <span class="badge bg-secondary">${book.category?.categoryName || 'Uncategorized'}</span>
                    </p>
                    <p class="card-text small">ISBN: ${book.isbn}</p>
                </div>
            </div>
        </div>
    `).join('');
}

async function viewBook(isbn) {
    try {
        const response = await fetch(`${API_URL}/books/${isbn}`);
        const book = await response.json();
        
        const detailHtml = `
            <div class="card">
                <div class="card-body">
                    <h3>${book.title}</h3>
                    <p class="text-muted">${book.author}</p>
                    <hr>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>ISBN:</strong> ${book.isbn}</p>
                            <p><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
                            <p><strong>Year:</strong> ${book.publicationYear || 'N/A'}</p>
                            <p><strong>Language:</strong> ${book.language}</p>
                            <p><strong>Category:</strong> ${book.category?.categoryName || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            ${book.description ? `<p>${book.description}</p>` : ''}
                        </div>
                    </div>
                    <hr>
                    <h5>Available Copies</h5>
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Barcode</th>
                                <th>Status</th>
                                <th>Condition</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${book.copies.map(copy => `
                                <tr>
                                    <td>${copy.barcode}</td>
                                    <td><span class="badge badge-${copy.status.toLowerCase()}">${copy.status}</span></td>
                                    <td>${copy.condition}</td>
                                    <td>${copy.locationCode || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${currentUser && currentUser.role === 'Member' ? `
                        <button class="btn btn-primary" onclick="reserveBook('${book.isbn}')">
                            <i class="bi bi-bookmark"></i> Reserve This Book
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('bookDetail').innerHTML = detailHtml;
        showPage('book-detail');
    } catch (error) {
        showAlert('Error loading book details: ' + error.message, 'danger');
    }
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    document.getElementById('alertContainer').innerHTML = alertHtml;
    
    setTimeout(() => {
        document.getElementById('alertContainer').innerHTML = '';
    }, 5000);
}

async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
    }
    
    return data;
}

// Dashboard Functions
async function loadDashboard() {
    if (!currentUser) {
        showPage('login');
        return;
    }
    
    if (currentUser.role === 'Member') {
        await loadMemberDashboard();
    } else if (currentUser.role === 'Librarian') {
        await loadLibrarianDashboard();
    } else if (currentUser.role === 'Administrator') {
        await loadAdminDashboard();
    }
}

async function loadMemberDashboard() {
    try {
        const [loans, reservations, fines] = await Promise.all([
            apiCall('/me/loans'),
            apiCall('/me/reservations'),
            apiCall('/me/fines')
        ]);
        
        const totalFines = fines.reduce((sum, fine) => sum + parseFloat(fine.amount), 0);
        const unpaidFines = fines.filter(f => f.status === 'Unpaid').reduce((sum, fine) => sum + parseFloat(fine.amount), 0);
        
        const html = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-primary">${loans.length}</h3>
                            <p class="text-muted">Active Loans</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-warning">${reservations.length}</h3>
                            <p class="text-muted">Reservations</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-danger">${unpaidFines.toLocaleString()} VND</h3>
                            <p class="text-muted">Unpaid Fines</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>My Loans</h5>
                </div>
                <div class="card-body">
                    ${loans.length === 0 ? '<p class="text-muted">No active loans</p>' : `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Book</th>
                                    <th>Barcode</th>
                                    <th>Due Date</th>
                                    <th>Renewals</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${loans.map(loan => {
                                    const dueDate = new Date(loan.dueDate);
                                    const isOverdue = dueDate < new Date();
                                    return `
                                        <tr>
                                            <td>${loan.bookCopy.book.title}</td>
                                            <td>${loan.bookCopy.barcode}</td>
                                            <td class="${isOverdue ? 'text-danger' : ''}">${dueDate.toLocaleDateString()}</td>
                                            <td>${loan.renewalCount}/2</td>
                                            <td>
                                                <button class="btn btn-sm btn-primary" onclick="renewLoan('${loan.loanId}')" ${loan.renewalCount >= 2 ? 'disabled' : ''}>
                                                    Renew
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>My Reservations</h5>
                </div>
                <div class="card-body">
                    ${reservations.length === 0 ? '<p class="text-muted">No reservations</p>' : `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Book</th>
                                    <th>Status</th>
                                    <th>Reserved Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reservations.map(res => `
                                    <tr>
                                        <td>${res.book.title}</td>
                                        <td><span class="badge bg-${res.status === 'Pending' ? 'warning' : res.status === 'Fulfilled' ? 'success' : 'secondary'}">${res.status}</span></td>
                                        <td>${new Date(res.reserveDate).toLocaleDateString()}</td>
                                        <td>
                                            ${res.status === 'Pending' ? `
                                                <button class="btn btn-sm btn-danger" onclick="cancelReservation('${res.reservationId}')">Cancel</button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h5>My Fines</h5>
                </div>
                <div class="card-body">
                    ${fines.length === 0 ? '<p class="text-muted">No fines</p>' : `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Loan</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${fines.map(fine => `
                                    <tr>
                                        <td>${fine.loan.bookCopy.book.title}</td>
                                        <td>${parseFloat(fine.amount).toLocaleString()} VND</td>
                                        <td><span class="badge bg-${fine.status === 'Paid' ? 'success' : 'danger'}">${fine.status}</span></td>
                                        <td>
                                            ${fine.status === 'Unpaid' ? `
                                                <button class="btn btn-sm btn-success" onclick="payFine('${fine.fineId}')">Pay</button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
        
        document.getElementById('dashboardContent').innerHTML = html;
    } catch (error) {
        showAlert('Error loading dashboard: ' + error.message, 'danger');
    }
}

async function loadLibrarianDashboard() {
    const html = `
        <div class="row g-4">
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-box-arrow-right display-1 text-primary"></i>
                        <h5 class="card-title mt-3">Checkout</h5>
                        <p class="card-text">Lend books to members</p>
                        <button class="btn btn-primary" onclick="showPage('checkout')">Go to Checkout</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-box-arrow-in-left display-1 text-success"></i>
                        <h5 class="card-title mt-3">Checkin</h5>
                        <p class="card-text">Return books</p>
                        <button class="btn btn-success" onclick="showPage('checkin')">Go to Checkin</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-book display-1 text-info"></i>
                        <h5 class="card-title mt-3">Manage Books</h5>
                        <p class="card-text">Add/Edit books and copies</p>
                        <button class="btn btn-info" onclick="showPage('manage-books')">Manage Books</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('dashboardContent').innerHTML = html;
}

async function loadAdminDashboard() {
    const html = `
        <div class="row g-4">
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-people display-1 text-primary"></i>
                        <h5 class="card-title mt-3">User Management</h5>
                        <p class="card-text">Manage users and roles</p>
                        <button class="btn btn-primary" onclick="showPage('admin')">Go to Admin</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-gear display-1 text-success"></i>
                        <h5 class="card-title mt-3">System Config</h5>
                        <p class="card-text">Configure system settings</p>
                        <button class="btn btn-success" onclick="showPage('admin')">Go to Config</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <i class="bi bi-file-text display-1 text-info"></i>
                        <h5 class="card-title mt-3">Audit Logs</h5>
                        <p class="card-text">View system audit logs</p>
                        <button class="btn btn-info" onclick="showPage('admin')">View Logs</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('dashboardContent').innerHTML = html;
}

// Member Functions
async function renewLoan(loanId) {
    try {
        await apiCall(`/loans/${loanId}/renew`, { method: 'PUT' });
        showAlert('Loan renewed successfully!', 'success');
        loadMemberDashboard();
    } catch (error) {
        showAlert('Error renewing loan: ' + error.message, 'danger');
    }
}

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        await apiCall(`/reservations/${reservationId}`, { method: 'DELETE' });
        showAlert('Reservation cancelled successfully!', 'success');
        loadMemberDashboard();
    } catch (error) {
        showAlert('Error cancelling reservation: ' + error.message, 'danger');
    }
}

async function payFine(fineId) {
    try {
        await apiCall(`/fines/${fineId}/pay`, { 
            method: 'POST',
            body: JSON.stringify({ paymentMethod: 'Online' })
        });
        showAlert('Fine paid successfully!', 'success');
        loadMemberDashboard();
    } catch (error) {
        showAlert('Error paying fine: ' + error.message, 'danger');
    }
}

async function reserveBook(isbn) {
    try {
        await apiCall('/reservations', {
            method: 'POST',
            body: JSON.stringify({ isbn })
        });
        showAlert('Book reserved successfully!', 'success');
    } catch (error) {
        showAlert('Error reserving book: ' + error.message, 'danger');
    }
}

// Librarian Functions
async function loadCheckoutPage() {
    const html = `
        <div class="card">
            <div class="card-header">
                <h5>Checkout Book</h5>
            </div>
            <div class="card-body">
                <form onsubmit="checkoutBook(event)">
                    <div class="mb-3">
                        <label class="form-label">Member Code</label>
                        <input type="text" class="form-control" id="checkoutMemberCode" placeholder="MEM2024001" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Book Barcode</label>
                        <input type="text" class="form-control" id="checkoutBarcode" placeholder="BC0001" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Checkout</button>
                </form>
            </div>
        </div>
        <div id="checkoutResult" class="mt-3"></div>
    `;
    document.getElementById('checkoutContent').innerHTML = html;
}

async function checkoutBook(event) {
    event.preventDefault();
    
    const memberCode = document.getElementById('checkoutMemberCode').value;
    const barcode = document.getElementById('checkoutBarcode').value;
    
    try {
        const result = await apiCall('/loans', {
            method: 'POST',
            body: JSON.stringify({ memberCode, barcode })
        });
        
        const dueDate = new Date(result.dueDate);
        const html = `
            <div class="alert alert-success">
                <h5>Checkout Successful!</h5>
                <p><strong>Book:</strong> ${result.bookCopy.book.title}</p>
                <p><strong>Member:</strong> ${result.member.user.firstName} ${result.member.user.lastName}</p>
                <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
            </div>
        `;
        document.getElementById('checkoutResult').innerHTML = html;
        document.getElementById('checkoutMemberCode').value = '';
        document.getElementById('checkoutBarcode').value = '';
    } catch (error) {
        showAlert('Checkout failed: ' + error.message, 'danger');
    }
}

async function loadCheckinPage() {
    const html = `
        <div class="card">
            <div class="card-header">
                <h5>Checkin Book</h5>
            </div>
            <div class="card-body">
                <form onsubmit="checkinBook(event)">
                    <div class="mb-3">
                        <label class="form-label">Book Barcode</label>
                        <input type="text" class="form-control" id="checkinBarcode" placeholder="BC0001" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Condition</label>
                        <select class="form-select" id="checkinCondition" required>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                            <option value="Damaged">Damaged</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-success">Checkin</button>
                </form>
            </div>
        </div>
        <div id="checkinResult" class="mt-3"></div>
    `;
    document.getElementById('checkinContent').innerHTML = html;
}

async function checkinBook(event) {
    event.preventDefault();
    
    const barcode = document.getElementById('checkinBarcode').value;
    const condition = document.getElementById('checkinCondition').value;
    
    try {
        // Find active loan by barcode
        const response = await fetch(`${API_URL}/loans?barcode=${barcode}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const loans = await response.json();
        const activeLoan = loans.find(l => l.status === 'Active');
        
        if (!activeLoan) {
            throw new Error('No active loan found for this barcode');
        }
        
        const result = await apiCall(`/loans/${activeLoan.loanId}/return`, {
            method: 'PUT',
            body: JSON.stringify({ condition })
        });
        
        let html = `
            <div class="alert alert-success">
                <h5>Checkin Successful!</h5>
                <p><strong>Book:</strong> ${result.bookCopy.book.title}</p>
                <p><strong>Return Date:</strong> ${new Date(result.returnDate).toLocaleDateString()}</p>
        `;
        
        if (result.fine) {
            html += `
                <hr>
                <p class="text-danger"><strong>Fine Generated:</strong> ${parseFloat(result.fine.amount).toLocaleString()} VND</p>
                <p><small>Reason: ${result.fine.reason}</small></p>
            `;
        }
        
        html += '</div>';
        document.getElementById('checkinResult').innerHTML = html;
        document.getElementById('checkinBarcode').value = '';
    } catch (error) {
        showAlert('Checkin failed: ' + error.message, 'danger');
    }
}

async function loadManageBooksPage() {
    console.log('Loading Manage Books page...');
    const html = `
        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item">
                <a class="nav-link active" data-bs-toggle="tab" href="#addBook">Add Book</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" data-bs-toggle="tab" href="#addCopy">Add Copy</a>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="addBook">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Add New Book</h5>
                        <form onsubmit="addBook(event)">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">ISBN</label>
                                    <input type="text" class="form-control" id="bookIsbn" placeholder="978-0-123-45678-9" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Title</label>
                                    <input type="text" class="form-control" id="bookTitle" placeholder="Book Title" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Author</label>
                                    <input type="text" class="form-control" id="bookAuthor" placeholder="Author Name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Publisher</label>
                                    <input type="text" class="form-control" id="bookPublisher" placeholder="Publisher Name">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Publication Year</label>
                                    <input type="number" class="form-control" id="bookYear" placeholder="2024">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Language</label>
                                    <input type="text" class="form-control" id="bookLanguage" value="Vietnamese">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Category ID</label>
                                    <input type="number" class="form-control" id="bookCategoryId" value="13" placeholder="13-18">
                                    <small class="text-muted">13=Fiction, 14=Non-Fiction, 15=Science, 16=History, 17=Technology, 18=Literature</small>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> Add Book
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <div class="tab-pane fade" id="addCopy">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Add Book Copy</h5>
                        <form onsubmit="addCopy(event)">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">ISBN</label>
                                    <input type="text" class="form-control" id="copyIsbn" placeholder="978-0-123-45678-9" required>
                                    <small class="text-muted">Enter ISBN of existing book</small>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Barcode</label>
                                    <input type="text" class="form-control" id="copyBarcode" placeholder="BC0061" required>
                                    <small class="text-muted">Must be unique</small>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Condition</label>
                                    <select class="form-select" id="copyCondition">
                                        <option value="New">New</option>
                                        <option value="Good" selected>Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Location Code</label>
                                    <input type="text" class="form-control" id="copyLocation" placeholder="A1-01">
                                    <small class="text-muted">Shelf location (optional)</small>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> Add Copy
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('manageBooksContent');
    if (container) {
        container.innerHTML = html;
        console.log('Manage Books content loaded successfully');
    } else {
        console.error('manageBooksContent container not found!');
    }
}

async function addBook(event) {
    event.preventDefault();
    
    const data = {
        isbn: document.getElementById('bookIsbn').value,
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        publisher: document.getElementById('bookPublisher').value,
        publicationYear: parseInt(document.getElementById('bookYear').value) || null,
        language: document.getElementById('bookLanguage').value,
        categoryId: parseInt(document.getElementById('bookCategoryId').value)
    };
    
    try {
        await apiCall('/books', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showAlert('Book added successfully!', 'success');
        event.target.reset();
    } catch (error) {
        showAlert('Error adding book: ' + error.message, 'danger');
    }
}

async function addCopy(event) {
    event.preventDefault();
    
    const isbn = document.getElementById('copyIsbn').value;
    const data = {
        barcode: document.getElementById('copyBarcode').value,
        condition: document.getElementById('copyCondition').value,
        locationCode: document.getElementById('copyLocation').value
    };
    
    try {
        await apiCall(`/books/${isbn}/copies`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showAlert('Copy added successfully!', 'success');
        event.target.reset();
    } catch (error) {
        showAlert('Error adding copy: ' + error.message, 'danger');
    }
}

// Admin Functions
async function loadAdminPage() {
    const html = `
        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item">
                <a class="nav-link active" data-bs-toggle="tab" href="#usersTab" onclick="loadUsers()">Users</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" data-bs-toggle="tab" href="#configTab" onclick="loadConfig()">System Config</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" data-bs-toggle="tab" href="#auditTab" onclick="loadAuditLogs()">Audit Logs</a>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="usersTab">
                <div id="usersContent">Loading...</div>
            </div>
            <div class="tab-pane fade" id="configTab">
                <div id="configContent">Loading...</div>
            </div>
            <div class="tab-pane fade" id="auditTab">
                <div id="auditContent">Loading...</div>
            </div>
        </div>
    `;
    document.getElementById('adminContent').innerHTML = html;
    loadUsers();
}

async function loadUsers() {
    try {
        const users = await apiCall('/admin/users');
        
        const html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.firstName} ${user.lastName}</td>
                            <td><span class="badge bg-primary">${user.role}</span></td>
                            <td><span class="badge bg-${user.status === 'Active' ? 'success' : 'danger'}">${user.status}</span></td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('usersContent').innerHTML = html;
    } catch (error) {
        document.getElementById('usersContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

async function loadConfig() {
    try {
        const config = await apiCall('/admin/config');
        
        const html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${config.map(c => `
                        <tr>
                            <td><code>${c.configKey}</code></td>
                            <td><strong>${c.configValue}</strong></td>
                            <td>${c.description || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('configContent').innerHTML = html;
    } catch (error) {
        document.getElementById('configContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

async function loadAuditLogs() {
    try {
        const logs = await apiCall('/admin/audit-logs?limit=50');
        
        const html = `
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td>${new Date(log.timestamp).toLocaleString()}</td>
                            <td>${log.user?.username || 'System'}</td>
                            <td><span class="badge bg-secondary">${log.action}</span></td>
                            <td>${log.entityType}</td>
                            <td><small>${log.details || ''}</small></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('auditContent').innerHTML = html;
    } catch (error) {
        document.getElementById('auditContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}
