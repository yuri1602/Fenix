// Material Requests Management

let allRequests = []; // Store all requests for filtering

// Load all requests
async function loadRequests() {
    try {
        const response = await fetch('/api/requests');
        if (response.ok) {
            allRequests = await response.json();
            displayRequests(allRequests);
            
            // Show/hide elements based on role
            if (currentUser && currentUser.role === 'admin') {
                document.getElementById('requests-stats').style.display = 'flex';
                document.getElementById('requests-filters').style.display = 'block';
                document.querySelectorAll('.user-column').forEach(el => el.style.display = '');
                
                // Load filter options
                await loadFilterOptions();
            } else {
                document.getElementById('requests-stats').style.display = 'none';
                document.getElementById('requests-filters').style.display = 'none';
                document.querySelectorAll('.user-column').forEach(el => el.style.display = 'none');
            }
            
            updatePendingBadge();
        } else {
            showToast('Грешка при зареждане на заявки', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Load filter options (users and materials)
async function loadFilterOptions() {
    try {
        // Load users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const userSelect = document.getElementById('filter-user');
            userSelect.innerHTML = '<option value="">Всички потребители</option>';
            users.forEach(user => {
                userSelect.innerHTML += `<option value="${user.id}">${user.full_name} (${user.username})</option>`;
            });
        }
        
        // Load materials
        const materialsResponse = await fetch('/api/materials');
        if (materialsResponse.ok) {
            const materials = await materialsResponse.json();
            const materialSelect = document.getElementById('filter-material');
            materialSelect.innerHTML = '<option value="">Всички материали</option>';
            materials.forEach(material => {
                materialSelect.innerHTML += `<option value="${material.id}">${material.name} - ${material.category}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Apply filters
function applyRequestsFilters() {
    const userId = document.getElementById('filter-user').value;
    const materialId = document.getElementById('filter-material').value;
    const status = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    
    let filtered = allRequests;
    
    // Filter by user
    if (userId) {
        filtered = filtered.filter(r => r.user_id == userId);
    }
    
    // Filter by material
    if (materialId) {
        filtered = filtered.filter(r => r.material_id == materialId);
    }
    
    // Filter by status
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    
    // Filter by date range
    if (dateFrom) {
        filtered = filtered.filter(r => {
            const requestDate = new Date(r.created_at).toISOString().split('T')[0];
            return requestDate >= dateFrom;
        });
    }
    
    if (dateTo) {
        filtered = filtered.filter(r => {
            const requestDate = new Date(r.created_at).toISOString().split('T')[0];
            return requestDate <= dateTo;
        });
    }
    
    displayRequests(filtered);
    showToast(`Показани ${filtered.length} заявки`);
}

// Clear filters
function clearRequestsFilters() {
    document.getElementById('filter-user').value = '';
    document.getElementById('filter-material').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    
    displayRequests(allRequests);
    showToast('Филтрите са изчистени');
}

// Load statistics (admin only)
async function loadRequestsStats() {
    try {
        const response = await fetch('/api/requests/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-pending-requests').textContent = stats.pending;
            document.getElementById('stat-approved-requests').textContent = stats.approved;
            document.getElementById('stat-rejected-requests').textContent = stats.rejected;
            document.getElementById('stat-total-requests').textContent = stats.total;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update pending requests badge
async function updatePendingBadge() {
    if (currentUser && currentUser.role === 'admin') {
        try {
            const response = await fetch('/api/requests/stats');
            if (response.ok) {
                const stats = await response.json();
                const badge = document.getElementById('pending-requests-badge');
                if (stats.pending > 0) {
                    badge.textContent = stats.pending;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }
}

// Display requests in table
function displayRequests(requests) {
    const tbody = document.getElementById('requests-tbody');
    
    if (!tbody) return;
    
    if (requests.length === 0) {
        const colspan = currentUser.role === 'admin' ? 8 : 7;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted">Няма заявки</td></tr>`;
        return;
    }
    
    tbody.innerHTML = requests.map(req => {
        const statusBadge = getStatusBadge(req.status);
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isPending = req.status === 'pending';
        const isOwner = req.user_id === currentUser.id;
        
        // Determine stock status color
        let stockClass = 'text-success';
        if (req.current_quantity === 0) {
            stockClass = 'text-danger';
        } else if (req.current_quantity < req.requested_quantity) {
            stockClass = 'text-warning';
        }
        
        return `
            <tr class="${req.status === 'pending' ? 'table-warning' : ''}">
                <td>${statusBadge}</td>
                <td><strong>${req.material_name}</strong></td>
                <td><span class="badge bg-secondary">${req.material_category}</span></td>
                <td class="admin-only">
                    <span class="${stockClass}">
                        <strong>${req.current_quantity}</strong> бр
                    </span>
                </td>
                <td>
                    <span class="badge bg-primary">${req.requested_quantity} бр</span>
                </td>
                ${isAdmin ? `<td class="admin-only">${req.full_name}</td>` : ''}
                <td>
                    <small>${formatDate(req.created_at)}</small>
                    ${req.notes ? `<br><small class="text-muted"><i class="bi bi-chat-left-text"></i> ${req.notes}</small>` : ''}
                    ${req.admin_notes ? `<br><small class="text-info"><i class="bi bi-info-circle"></i> ${req.admin_notes}</small>` : ''}
                </td>
                <td class="admin-only">
                    ${isPending && isAdmin ? `
                        <button class="btn btn-sm btn-success mb-1" onclick="showProcessRequestModal(${req.id}, 'approved')" 
                                title="Одобри">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-danger mb-1" onclick="showProcessRequestModal(${req.id}, 'rejected')"
                                title="Откажи">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                    ${isPending && isOwner && !isAdmin ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteRequest(${req.id})"
                                title="Изтрий">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                    ${!isPending ? `
                        <span class="text-muted">
                            <small>
                                <i class="bi bi-clock"></i> ${formatDate(req.processed_at)}
                                <br>от ${req.processed_by_name}
                            </small>
                        </span>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Get status badge
function getStatusBadge(status) {
    switch(status) {
        case 'pending':
            return '<span class="badge bg-warning"><i class="bi bi-hourglass-split"></i> Чакаща</span>';
        case 'approved':
            return '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Одобрена</span>';
        case 'rejected':
            return '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Отказана</span>';
        default:
            return '<span class="badge bg-secondary">Непознат</span>';
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('bg-BG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show new request modal
async function showNewRequestModal() {
    try {
        // Load all materials
        const response = await fetch('/api/materials');
        if (!response.ok) {
            showToast('Грешка при зареждане на материали', 'error');
            return;
        }
        
        const materials = await response.json();
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        const modal = `
            <div class="modal fade" id="requestModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-plus-circle"></i> Нова заявка за материали
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="materials-list">
                                <div class="material-item mb-3 p-3 border rounded" data-index="0">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="mb-0"><i class="bi bi-box"></i> Материал 1</h6>
                                        <button type="button" class="btn btn-sm btn-danger" onclick="removeMaterialItem(0)" style="display: none;">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">Материал *</label>
                                        <select class="form-select material-select" data-index="0" onchange="updateMaterialInfo(0)">
                                            <option value="">Изберете материал</option>
                                            ${materials.map(m => `
                                                <option value="${m.id}" data-quantity="${m.quantity}" data-category="${m.category}">
                                                    ${m.name} - ${m.category}${isAdmin ? ` (${m.quantity} бр)` : ''}
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    
                                    ${isAdmin ? `
                                    <div class="material-info" data-index="0" style="display: none;">
                                        <div class="alert alert-info alert-sm">
                                            <strong><i class="bi bi-box"></i> Налично:</strong>
                                            <span class="available-quantity">0 бр</span>
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="mb-2">
                                        <label class="form-label">Необходимо количество *</label>
                                        <input type="number" class="form-control material-quantity" data-index="0"
                                               min="1" value="1" placeholder="Брой">
                                    </div>
                                </div>
                            </div>
                            
                            <button type="button" class="btn btn-outline-success btn-sm mb-3" onclick="addMaterialItem()">
                                <i class="bi bi-plus-circle"></i> Добави още материал
                            </button>
                            
                            <div class="mb-3">
                                <label class="form-label">Бележки / Заявка за нов материал</label>
                                <textarea class="form-control" id="request-notes" rows="4" 
                                          placeholder="Допълнителна информация или заявка за закупуване на нов материал който го няма в списъка (незадължително)"></textarea>
                                <small class="text-muted">
                                    <i class="bi bi-info-circle"></i> Ако материалът който ви трябва не е в списъка, опишете го тук
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                            <button type="button" class="btn btn-success" onclick="saveMultipleRequests()">
                                <i class="bi bi-send"></i> Изпрати заявка
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML = modal;
        const modalEl = new bootstrap.Modal(document.getElementById('requestModal'));
        modalEl.show();
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при отваряне на формата', 'error');
    }
}

// Update material info when selected
function updateMaterialInfo(index) {
    const select = document.querySelector(`.material-select[data-index="${index}"]`);
    const selectedOption = select.options[select.selectedIndex];
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (selectedOption.value && isAdmin) {
        const quantity = selectedOption.getAttribute('data-quantity');
        const infoDiv = document.querySelector(`.material-info[data-index="${index}"]`);
        
        if (infoDiv) {
            infoDiv.style.display = 'block';
            infoDiv.querySelector('.available-quantity').textContent = quantity + ' бр';
        }
    } else if (isAdmin) {
        const infoDiv = document.querySelector(`.material-info[data-index="${index}"]`);
        if (infoDiv) {
            infoDiv.style.display = 'none';
        }
    }
}

let materialItemIndex = 0;

// Add new material item
async function addMaterialItem() {
    materialItemIndex++;
    const index = materialItemIndex;
    
    // Load materials for the new dropdown
    const response = await fetch('/api/materials');
    const materials = await response.json();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    const newItem = `
        <div class="material-item mb-3 p-3 border rounded" data-index="${index}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0"><i class="bi bi-box"></i> Материал ${index + 1}</h6>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeMaterialItem(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="mb-2">
                <label class="form-label">Материал *</label>
                <select class="form-select material-select" data-index="${index}" onchange="updateMaterialInfo(${index})">
                    <option value="">Изберете материал</option>
                    ${materials.map(m => `
                        <option value="${m.id}" data-quantity="${m.quantity}" data-category="${m.category}">
                            ${m.name} - ${m.category}${isAdmin ? ` (${m.quantity} бр)` : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            ${isAdmin ? `
            <div class="material-info" data-index="${index}" style="display: none;">
                <div class="alert alert-info alert-sm">
                    <strong><i class="bi bi-box"></i> Налично:</strong>
                    <span class="available-quantity">0 бр</span>
                </div>
            </div>
            ` : ''}
            
            <div class="mb-2">
                <label class="form-label">Необходимо количество *</label>
                <input type="number" class="form-control material-quantity" data-index="${index}"
                       min="1" value="1" placeholder="Брой">
            </div>
        </div>
    `;
    
    document.getElementById('materials-list').insertAdjacentHTML('beforeend', newItem);
    
    // Show delete button on first item if there are now multiple items
    const firstItem = document.querySelector('.material-item[data-index="0"] .btn-danger');
    if (firstItem) {
        firstItem.style.display = 'inline-block';
    }
}

// Remove material item
function removeMaterialItem(index) {
    const item = document.querySelector(`.material-item[data-index="${index}"]`);
    if (item) {
        item.remove();
    }
    
    // Hide delete button on first item if it's the only one left
    const items = document.querySelectorAll('.material-item');
    if (items.length === 1) {
        const firstItemBtn = items[0].querySelector('.btn-danger');
        if (firstItemBtn) {
            firstItemBtn.style.display = 'none';
        }
    }
    
    // Renumber items
    document.querySelectorAll('.material-item').forEach((item, idx) => {
        item.querySelector('h6').innerHTML = `<i class="bi bi-box"></i> Материал ${idx + 1}`;
    });
}

// Save multiple requests
async function saveMultipleRequests() {
    const items = document.querySelectorAll('.material-item');
    const notes = document.getElementById('request-notes').value.trim();
    const requests = [];
    
    // Collect all material requests
    items.forEach(item => {
        const index = item.getAttribute('data-index');
        const select = item.querySelector(`.material-select[data-index="${index}"]`);
        const quantityInput = item.querySelector(`.material-quantity[data-index="${index}"]`);
        
        const materialId = select.value;
        const quantity = parseInt(quantityInput.value);
        
        if (materialId && quantity > 0) {
            requests.push({
                material_id: parseInt(materialId),
                requested_quantity: quantity,
                notes: notes
            });
        }
    });
    
    // Validation
    if (requests.length === 0 && !notes) {
        showToast('Моля изберете поне един материал или напишете бележка', 'error');
        return;
    }
    
    if (requests.some(r => r.requested_quantity < 1)) {
        showToast('Количеството трябва да е поне 1', 'error');
        return;
    }
    
    try {
        // Send all requests
        let successCount = 0;
        for (const request of requests) {
            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(request)
            });
            
            if (response.ok) {
                successCount++;
            }
        }
        
        if (successCount > 0) {
            showToast(`${successCount} заявка(и) изпратена(и) успешно`);
            bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
            loadRequests();
            updatePendingBadge();
        } else {
            showToast('Грешка при изпращане на заявките', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Save new request (keep for compatibility)
async function saveRequest() {
    const material_id = document.getElementById('request-material').value;
    const requested_quantity = parseInt(document.getElementById('request-quantity').value);
    const notes = document.getElementById('request-notes').value.trim();
    
    if (!material_id) {
        showToast('Моля изберете материал', 'error');
        return;
    }
    
    if (!requested_quantity || requested_quantity <= 0) {
        showToast('Моля въведете валидно количество', 'error');
        return;
    }
    
    const data = {
        material_id: parseInt(material_id),
        requested_quantity,
        notes
    };
    
    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Заявката е изпратена успешно');
            bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
            loadRequests();
            updatePendingBadge();
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изпращане на заявката', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Show process request modal (admin only)
function showProcessRequestModal(requestId, action) {
    const isApprove = action === 'approved';
    const title = isApprove ? 'Одобряване на заявка' : 'Отказване на заявка';
    const color = isApprove ? 'success' : 'danger';
    const icon = isApprove ? 'check-circle' : 'x-circle';
    const buttonText = isApprove ? 'Одобри и издай' : 'Откажи';
    
    const modal = `
        <div class="modal fade" id="processModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-${color} text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-${icon}"></i> ${title}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="process-request-id" value="${requestId}">
                        <input type="hidden" id="process-action" value="${action}">
                        
                        <div class="mb-3">
                            <label class="form-label">Администраторска бележка</label>
                            <textarea class="form-control" id="admin-notes" rows="3" 
                                      placeholder="${isApprove ? 'Одобрена. Материалите са издадени.' : 'Причина за отказ...'}"></textarea>
                            <small class="text-muted">
                                ${isApprove ? 
                                    '<i class="bi bi-info-circle"></i> Материалите автоматично ще бъдат приспаднати от наличността' : 
                                    'Опционално: обяснете защо заявката е отказана'}
                            </small>
                        </div>
                        
                        ${isApprove ? `
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i> 
                                <strong>Внимание:</strong> След одобрение количеството автоматично ще бъде приспаднато от наличността!
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-${color}" onclick="processRequest()">
                            <i class="bi bi-${icon}"></i> ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('processModal'));
    modalEl.show();
}

// Process request (approve/reject)
async function processRequest() {
    const requestId = document.getElementById('process-request-id').value;
    const action = document.getElementById('process-action').value;
    const admin_notes = document.getElementById('admin-notes').value.trim();
    
    const data = {
        status: action,
        admin_notes
    };
    
    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const message = action === 'approved' ? 
                'Заявката е одобрена и материалите са издадени' : 
                'Заявката е отказана';
            showToast(message);
            bootstrap.Modal.getInstance(document.getElementById('processModal')).hide();
            loadRequests();
            loadRequestsStats();
            updatePendingBadge();
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при обработка на заявката', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Delete request
async function deleteRequest(requestId) {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази заявка?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Заявката е изтрита');
            loadRequests();
            updatePendingBadge();
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Initialize periodic badge update
setInterval(() => {
    if (currentUser && currentUser.role === 'admin' && currentSection !== 'requests') {
        updatePendingBadge();
    }
}, 30000); // Update every 30 seconds
