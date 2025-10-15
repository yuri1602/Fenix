// Materials Management Module

// Load all materials with filters
async function loadMaterials(filterType = 'all') {
    const search = document.getElementById('materials-search')?.value || '';
    const category = document.getElementById('materials-category')?.value || '';
    const lowStock = document.getElementById('materials-low-stock')?.checked || false;
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    
    // Apply filter based on section
    if (filterType === 'low') {
        params.append('low_stock', 'true');
    } else if (filterType === 'out') {
        // Will filter for quantity = 0 in display
    } else if (lowStock) {
        params.append('low_stock', 'true');
    }
    
    try {
        const response = await fetch(`/api/materials?${params}`);
        if (response.ok) {
            const materials = await response.json();
            
            // Filter for out of stock if needed
            let filteredMaterials = materials;
            if (filterType === 'out') {
                filteredMaterials = materials.filter(m => m.quantity === 0);
            }
            
            displayMaterials(filteredMaterials, filterType);
            updateStatistics(materials);
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            showToast('Грешка при зареждане на материали', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Update statistics cards
function updateStatistics(materials) {
    const available = materials.filter(m => m.quantity > m.min_threshold).length;
    const low = materials.filter(m => m.quantity > 0 && m.quantity <= m.min_threshold).length;
    const out = materials.filter(m => m.quantity === 0).length;
    const total = materials.length;
    
    // Update main page stats
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-low').textContent = low;
    document.getElementById('stat-out').textContent = out;
    document.getElementById('stat-total').textContent = total;
    
    // Update individual page stats
    const statLowPage = document.getElementById('stat-low-page');
    if (statLowPage) statLowPage.textContent = low;
    
    const statOutPage = document.getElementById('stat-out-page');
    if (statOutPage) statOutPage.textContent = out;
}

// Display materials in table
function displayMaterials(materials, filterType = 'all') {
    let tbody;
    let colspan = 6;
    
    // Determine which table to update
    if (filterType === 'low') {
        tbody = document.getElementById('materials-low-tbody');
    } else if (filterType === 'out') {
        tbody = document.getElementById('materials-out-tbody');
        colspan = 5;
    } else {
        tbody = document.getElementById('materials-tbody');
    }
    
    if (!tbody) return;
    
    if (materials.length === 0) {
        const message = filterType === 'out' ? 
            '🎉 Чудесно! Няма изчерпани материали.' : 
            filterType === 'low' ? 
            '✅ Всички материали са с достатъчна наличност.' :
            'Няма материали за показване';
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted">${message}</td></tr>`;
        return;
    }
    
    // Different display for out of stock section
    if (filterType === 'out') {
        tbody.innerHTML = materials.map(m => `
            <tr class="table-danger">
                <td>${getStatusBadge(m.quantity, m.min_threshold)}</td>
                <td><strong>${m.name}</strong></td>
                <td><span class="badge bg-secondary">${m.category}</span></td>
                <td>
                    <span class="badge bg-info">Минимум: ${m.min_threshold} бр</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="adjustMaterialQuantity(${m.id}, 10)">
                        <i class="bi bi-plus-circle"></i> Добави 10
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="showEditMaterialModal(${m.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        return;
    }
    
    // Different display for low stock section
    if (filterType === 'low') {
        tbody.innerHTML = materials.map(m => `
            <tr class="table-warning">
                <td>${getStatusBadge(m.quantity, m.min_threshold)}</td>
                <td><strong>${m.name}</strong></td>
                <td><span class="badge bg-secondary">${m.category}</span></td>
                <td>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-danger me-2" 
                                onclick="adjustMaterialQuantity(${m.id}, -1)"
                                ${m.quantity <= 0 ? 'disabled' : ''}>
                            <i class="bi bi-dash"></i>
                        </button>
                        <strong class="mx-2">${m.quantity}</strong>
                        <button class="btn btn-sm btn-outline-success ms-2" 
                                onclick="adjustMaterialQuantity(${m.id}, 1)">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                    <small class="text-muted d-block mt-1">Минимум: ${m.min_threshold}</small>
                </td>
                <td>
                    <small class="text-danger">
                        <i class="bi bi-exclamation-triangle"></i> 
                        ${m.quantity === 0 ? 'Изчерпано!' : `Под минимума с ${m.min_threshold - m.quantity} бр`}
                    </small>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showEditMaterialModal(${m.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        return;
    }
    
    // Normal display for all materials
    tbody.innerHTML = materials.map(m => `
        <tr${m.quantity > 0 && m.quantity <= m.min_threshold ? ' class="table-warning"' : ''}>
            <td>${getStatusBadge(m.quantity, m.min_threshold)}</td>
            <td><strong>${m.name}</strong></td>
            <td><span class="badge bg-secondary">${m.category}</span></td>
            <td>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-danger me-2" 
                            onclick="adjustMaterialQuantity(${m.id}, -1)"
                            ${m.quantity <= 0 ? 'disabled' : ''}>
                        <i class="bi bi-dash"></i>
                    </button>
                    <strong class="mx-2">${m.quantity}</strong>
                    <button class="btn btn-sm btn-outline-success ms-2" 
                            onclick="adjustMaterialQuantity(${m.id}, 1)">
                        <i class="bi bi-plus"></i>
                    </button>
                </div>
            </td>
            <td>
                <small class="text-muted">
                    ${m.quantity === 0 ? 'Изчерпано!' : m.quantity <= m.min_threshold ? `Минимум: ${m.min_threshold}` : ''}
                </small>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showEditMaterialModal(${m.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteMaterial(${m.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load categories for filter dropdown
async function loadMaterialsCategories() {
    try {
        const response = await fetch('/api/categories');
        if (response.ok) {
            const categories = await response.json();
            const select = document.getElementById('materials-category');
            select.innerHTML = '<option value="">Всички категории</option>' +
                categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Adjust material quantity
async function adjustMaterialQuantity(id, change) {
    try {
        const response = await fetch(`/api/materials/${id}/quantity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change })
        });
        
        if (response.ok) {
            showToast('Количеството е обновено');
            
            // Reload current section
            if (currentSection === 'materials-all') {
                loadMaterials('all');
            } else if (currentSection === 'materials-low') {
                loadMaterials('low');
            } else if (currentSection === 'materials-out') {
                loadMaterials('out');
            } else {
                loadMaterials('all');
            }
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при обновяване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Show Add Material Modal
function showAddMaterialModal() {
    const modal = createMaterialModal('add');
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('materialModal'));
    modalEl.show();
    loadCategoriesForModal();
}

// Show Edit Material Modal
async function showEditMaterialModal(id) {
    try {
        const response = await fetch(`/api/materials/${id}`);
        if (response.ok) {
            const material = await response.json();
            const modal = createMaterialModal('edit', material);
            document.getElementById('modals-container').innerHTML = modal;
            const modalEl = new bootstrap.Modal(document.getElementById('materialModal'));
            modalEl.show();
            loadCategoriesForModal();
        } else {
            showToast('Грешка при зареждане на материал', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Create material modal HTML
function createMaterialModal(mode, material = null) {
    const isEdit = mode === 'edit';
    const title = isEdit ? 'Редактиране на материал' : 'Добавяне на материал';
    
    return `
        <div class="modal fade" id="materialModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="material-form">
                            <input type="hidden" id="material-id" value="${material?.id || ''}">
                            <div class="mb-3">
                                <label class="form-label">Име на материала</label>
                                <input type="text" class="form-control" id="material-name" 
                                       value="${material?.name || ''}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Категория</label>
                                <select class="form-select" id="material-category">
                                    <option value="">Изберете категория</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Текущо количество</label>
                                <input type="number" class="form-control" id="material-quantity" 
                                       value="${material?.quantity || 0}" min="0">
                                <small class="form-text text-muted">Може да се остави празно (по подразбиране 0)</small>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Минимум (праг) 🟠</label>
                                        <input type="number" class="form-control" id="material-min-threshold" 
                                               value="${material?.min_threshold || 5}" min="0">
                                        <small class="form-text text-muted">Предупреждение при ниска наличност</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Максимум (достатъчно) 🟢</label>
                                        <input type="number" class="form-control" id="material-max-threshold" 
                                               value="${material?.max_threshold || 50}" min="1">
                                        <small class="form-text text-muted">Оптимална наличност</small>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Забележки</label>
                                <textarea class="form-control" id="material-notes" rows="2">${material?.notes || ''}</textarea>
                                <small class="form-text text-muted">Допълнителна информация (по избор)</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="saveMaterial('${mode}')">
                            ${isEdit ? 'Запази промени' : 'Добави материал'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load categories for modal dropdown
async function loadCategoriesForModal() {
    try {
        const response = await fetch('/api/categories');
        if (response.ok) {
            const categories = await response.json();
            const select = document.getElementById('material-category');
            const currentValue = select.dataset.value || '';
            
            select.innerHTML = '<option value="">Изберете категория</option>' +
                categories.map(c => `<option value="${c}" ${c === currentValue ? 'selected' : ''}>${c}</option>`).join('');
            
            // If editing, set the selected category
            if (currentValue) {
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Save material (add or edit)
async function saveMaterial(mode) {
    const id = document.getElementById('material-id').value;
    const name = document.getElementById('material-name').value.trim();
    const category = document.getElementById('material-category').value;
    const quantity = parseInt(document.getElementById('material-quantity').value) || 0;
    const minThreshold = parseInt(document.getElementById('material-min-threshold').value) || 5;
    const maxThreshold = parseInt(document.getElementById('material-max-threshold').value) || 50;
    const notes = document.getElementById('material-notes')?.value || '';
    
    if (!name) {
        showToast('Моля въведете име на материала', 'error');
        return;
    }
    
    const data = { 
        name, 
        category, 
        quantity, 
        min_threshold: minThreshold, 
        max_threshold: maxThreshold,
        notes 
    };
    const url = mode === 'edit' ? `/api/materials/${id}` : '/api/materials';
    const method = mode === 'edit' ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(mode === 'edit' ? 'Материалът е обновен' : 'Материалът е добавен');
            bootstrap.Modal.getInstance(document.getElementById('materialModal')).hide();
            
            // Reload current section
            if (currentSection === 'materials-all') {
                loadMaterials('all');
            } else if (currentSection === 'materials-low') {
                loadMaterials('low');
            } else if (currentSection === 'materials-out') {
                loadMaterials('out');
            } else {
                loadMaterials('all');
            }
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при запазване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Delete material
async function deleteMaterial(id) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този материал?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showToast('Материалът е изтрит');
            
            // Reload current section
            if (currentSection === 'materials-all') {
                loadMaterials('all');
            } else if (currentSection === 'materials-low') {
                loadMaterials('low');
            } else if (currentSection === 'materials-out') {
                loadMaterials('out');
            } else {
                loadMaterials('all');
            }
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Export materials to Excel
async function exportMaterials(lowStockOnly = false) {
    try {
        const params = new URLSearchParams();
        if (lowStockOnly) {
            params.append('low_stock', 'true');
        }
        
        const response = await fetch(`/api/export?${params}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `materials_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Файлът е изтеглен');
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            showToast('Грешка при експортиране', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Add event listeners for search and filters
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('materials-search');
    const categorySelect = document.getElementById('materials-category');
    const lowStockCheck = document.getElementById('materials-low-stock');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            if (currentSection === 'materials-low') {
                loadMaterials('low');
            } else if (currentSection === 'materials-out') {
                loadMaterials('out');
            } else {
                loadMaterials('all');
            }
        }, 500));
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            if (currentSection === 'materials-low') {
                loadMaterials('low');
            } else if (currentSection === 'materials-out') {
                loadMaterials('out');
            } else {
                loadMaterials('all');
            }
        });
    }
    if (lowStockCheck) {
        lowStockCheck.addEventListener('change', () => {
            if (currentSection === 'materials-all') {
                loadMaterials('all');
            }
        });
    }
});

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
