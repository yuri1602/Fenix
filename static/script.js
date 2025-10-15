// Global variables
let editModal;
let currentMaterials = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    
    // Load initial data
    loadMaterials();
    loadCategories();
    loadStats();
    
    // Set up event listeners
    document.getElementById('search-input').addEventListener('input', filterMaterials);
    document.getElementById('category-filter').addEventListener('change', filterMaterials);
    
    // Add material form submission
    document.getElementById('add-material-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addMaterial();
    });
    
    // Edit material form (handled by saveEdit function)
    
    // Import form submission
    document.getElementById('import-form').addEventListener('submit', function(e) {
        e.preventDefault();
        importExcel();
    });
    
    // Tab change event - reload data when switching tabs
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            if (e.target.id === 'low-stock-tab') {
                loadLowStock();
            } else if (e.target.id === 'all-materials-tab') {
                loadMaterials();
            }
            loadStats();
        });
    });
});

// Load all materials
async function loadMaterials() {
    try {
        const search = document.getElementById('search-input').value;
        const category = document.getElementById('category-filter').value;
        
        let url = '/api/materials?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        
        const response = await fetch(url);
        currentMaterials = await response.json();
        
        displayMaterials(currentMaterials, 'materials-tbody');
        loadStats();
    } catch (error) {
        console.error('Error loading materials:', error);
        showError('Грешка при зареждане на материалите');
    }
}

// Load low stock materials
async function loadLowStock() {
    try {
        const response = await fetch('/api/materials?low_stock=true');
        const materials = await response.json();
        
        displayMaterials(materials, 'low-stock-tbody');
    } catch (error) {
        console.error('Error loading low stock materials:', error);
        showError('Грешка при зареждане на ниските количества');
    }
}

// Display materials in table
function displayMaterials(materials, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    
    if (materials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                    <p class="mt-2">Няма намерени материали</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = materials.map(material => {
        const status = getStatusInfo(material.quantity, material.min_threshold);
        
        return `
            <tr>
                <td>
                    <span class="badge ${status.class}" style="font-size: 1.2rem;">
                        ${status.icon}
                    </span>
                </td>
                <td><strong>${escapeHtml(material.name)}</strong></td>
                <td>
                    <span class="badge bg-secondary">${escapeHtml(material.category)}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-danger" onclick="adjustQuantity(${material.id}, -1)">
                            <i class="bi bi-dash"></i>
                        </button>
                        <button class="btn btn-outline-secondary" disabled style="min-width: 50px;">
                            <strong>${material.quantity}</strong>
                        </button>
                        <button class="btn btn-outline-success" onclick="adjustQuantity(${material.id}, 1)">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                </td>
                <td>${material.min_threshold}</td>
                <td>
                    <small class="text-muted">${escapeHtml(material.notes || '-')}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-primary" onclick="openEditModal(${material.id})" 
                                title="Редактирай">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteMaterial(${material.id})" 
                                title="Изтрий">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status info based on quantity
function getStatusInfo(quantity, threshold) {
    if (quantity === 0) {
        return { icon: '🔴', class: 'bg-danger', text: 'Изчерпан' };
    } else if (quantity <= threshold) {
        return { icon: '🟠', class: 'bg-warning text-dark', text: 'Нисък' };
    } else {
        return { icon: '🟢', class: 'bg-success', text: 'Достатъчен' };
    }
}

// Load categories for filter
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const filter = document.getElementById('category-filter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('total-count').textContent = stats.total;
        document.getElementById('out-count').textContent = stats.out_of_stock;
        document.getElementById('low-count').textContent = stats.low_stock;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Filter materials (client-side for better UX)
function filterMaterials() {
    loadMaterials(); // Reload with new filters
}

// Add new material
async function addMaterial() {
    const data = {
        name: document.getElementById('new-name').value.trim(),
        category: document.getElementById('new-category').value,
        quantity: parseInt(document.getElementById('new-quantity').value) || 0,
        min_threshold: parseInt(document.getElementById('new-threshold').value) || 5,
        notes: document.getElementById('new-notes').value.trim()
    };
    
    if (!data.name || !data.category) {
        showError('Моля попълнете задължителните полета');
        return;
    }
    
    try {
        const response = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showSuccess('Материалът е добавен успешно');
            document.getElementById('add-material-form').reset();
            loadMaterials();
            loadCategories();
            
            // Switch to all materials tab
            document.getElementById('all-materials-tab').click();
        } else {
            throw new Error('Failed to add material');
        }
    } catch (error) {
        console.error('Error adding material:', error);
        showError('Грешка при добавяне на материала');
    }
}

// Open edit modal
async function openEditModal(id) {
    try {
        const response = await fetch(`/api/materials/${id}`);
        const material = await response.json();
        
        document.getElementById('edit-id').value = material.id;
        document.getElementById('edit-name').value = material.name;
        document.getElementById('edit-category').value = material.category;
        document.getElementById('edit-quantity').value = material.quantity;
        document.getElementById('edit-threshold').value = material.min_threshold;
        document.getElementById('edit-notes').value = material.notes || '';
        
        editModal.show();
    } catch (error) {
        console.error('Error loading material:', error);
        showError('Грешка при зареждане на материала');
    }
}

// Save edited material
async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('edit-name').value.trim(),
        category: document.getElementById('edit-category').value,
        quantity: parseInt(document.getElementById('edit-quantity').value) || 0,
        min_threshold: parseInt(document.getElementById('edit-threshold').value) || 5,
        notes: document.getElementById('edit-notes').value.trim()
    };
    
    try {
        const response = await fetch(`/api/materials/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showSuccess('Материалът е обновен успешно');
            editModal.hide();
            loadMaterials();
            loadLowStock();
        } else {
            throw new Error('Failed to update material');
        }
    } catch (error) {
        console.error('Error updating material:', error);
        showError('Грешка при обновяване на материала');
    }
}

// Adjust quantity (+/-)
async function adjustQuantity(id, change) {
    try {
        const response = await fetch(`/api/materials/${id}/quantity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change: change })
        });
        
        if (response.ok) {
            loadMaterials();
            loadLowStock();
            loadStats();
        } else {
            throw new Error('Failed to adjust quantity');
        }
    } catch (error) {
        console.error('Error adjusting quantity:', error);
        showError('Грешка при промяна на количеството');
    }
}

// Delete material
async function deleteMaterial(id) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този материал?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/materials/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Материалът е изтрит успешно');
            loadMaterials();
            loadLowStock();
        } else {
            throw new Error('Failed to delete material');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showError('Грешка при изтриване на материала');
    }
}

// Import Excel file
async function importExcel() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Моля изберете файл');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/import', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess(result.message);
            fileInput.value = '';
            loadMaterials();
            loadCategories();
        } else {
            throw new Error(result.error || 'Import failed');
        }
    } catch (error) {
        console.error('Error importing file:', error);
        showError(`Грешка при импорт: ${error.message}`);
    }
}

// Export all materials
function exportAll() {
    window.location.href = '/api/export';
    showSuccess('Изтегляне на файла...');
}

// Export low stock materials
function exportLowStock() {
    window.location.href = '/api/export?low_stock=true';
    showSuccess('Изтегляне на файла...');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';
    toast.innerHTML = `<i class="bi bi-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showError(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification error';
    toast.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
