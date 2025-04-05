// main.js - Client-side functionality for Kiryana Inventory System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
    
    // Highlight low stock items in inventory table
    const inventoryTable = document.querySelector('#inventory-table');
    if (inventoryTable) {
        const rows = inventoryTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const statusCell = row.querySelector('td:nth-child(6)');
            if (statusCell && statusCell.textContent.trim() === 'Out of Stock') {
                row.classList.add('table-danger');
            } else if (statusCell && statusCell.textContent.trim() === 'Low Stock') {
                row.classList.add('table-warning');
            }
        });
    }
    
    // Initialize product select2 if available to make dropdowns searchable
    // Note: This would require loading the select2 library, which we're not doing for simplicity
    
    // Set default date to today for date inputs that are empty
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            const today = new Date();
            const year = today.getFullYear();
            let month = today.getMonth() + 1;
            let day = today.getDate();
            
            month = month < 10 ? '0' + month : month;
            day = day < 10 ? '0' + day : day;
            
            input.value = `${year}-${month}-${day}`;
        }
    });
});

// Function to confirm deletion operations
function confirmDelete(name, type) {
    return confirm(`Are you sure you want to delete ${type} "${name}"? This action cannot be undone.`);
}

// Format currency values
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}
