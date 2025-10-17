// Categories and Publishers Management

// ==================== CATEGORIES ====================

// Load all categories with count
async function loadCategories() {
    try {
        const response = await fetch('/api/admin/categories');
        if (response.ok) {
            const categories = await response.json();
            displayCategories(categories);
        } else {
            showToast('Грешка при зареждане на категории', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Display categories in table
function displayCategories(categories) {
    const tbody = document.getElementById('categories-tbody');
    
    if (!tbody) return;
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Няма категории</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>
                <span class="badge bg-secondary me-2">${cat.name}</span>
            </td>
            <td>
                <span class="badge bg-info">${cat.count} материала</span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showEditCategoryModal('${cat.name}', ${cat.count})">
                    <i class="bi bi-pencil"></i> Редактирай
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.name}', ${cat.count})"
                        ${cat.count > 0 ? 'disabled title="Не може да се изтрие категория с материали"' : ''}>
                    <i class="bi bi-trash"></i> Изтрий
                </button>
            </td>
        </tr>
    `).join('');
}

// Show add category modal
function showAddCategoryModal() {
    const modal = `
        <div class="modal fade" id="categoryModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-plus-circle"></i> Добавяне на категория
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Име на категория</label>
                            <input type="text" class="form-control" id="category-name" 
                                   placeholder="Напр: Канцеларски материали">
                            <small class="text-muted">Въведете уникално име за категорията</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-success" onclick="saveCategory('add')">
                            <i class="bi bi-check-circle"></i> Добави
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('categoryModal'));
    modalEl.show();
}

// Show edit category modal
function showEditCategoryModal(oldName, count) {
    const modal = `
        <div class="modal fade" id="categoryModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil"></i> Редактиране на категория
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="category-old-name" value="${oldName}">
                        <div class="mb-3">
                            <label class="form-label">Име на категория</label>
                            <input type="text" class="form-control" id="category-name" value="${oldName}">
                            <small class="text-muted">
                                <i class="bi bi-info-circle"></i> 
                                Промяната ще засегне ${count} материала
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="saveCategory('edit')">
                            <i class="bi bi-check-circle"></i> Запази
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('categoryModal'));
    modalEl.show();
}

// Save category (add or edit)
async function saveCategory(mode) {
    const name = document.getElementById('category-name').value.trim();
    
    if (!name) {
        showToast('Моля въведете име на категория', 'error');
        return;
    }
    
    const data = { name };
    let url = '/api/admin/categories';
    let method = 'POST';
    
    if (mode === 'edit') {
        const oldName = document.getElementById('category-old-name').value;
        data.old_name = oldName;
        method = 'PUT';
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(mode === 'edit' ? 'Категорията е обновена' : 'Категорията е добавена');
            bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
            loadCategories();
            
            // Reload materials categories dropdown if on materials page
            if (currentSection.startsWith('materials')) {
                loadMaterialsCategories();
            }
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при запазване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Delete category
async function deleteCategory(name, count) {
    if (count > 0) {
        showToast('Не може да се изтрие категория с материали', 'error');
        return;
    }
    
    if (!confirm(`Сигурни ли сте, че искате да изтриете категорията "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            showToast('Категорията е изтрита');
            loadCategories();
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// ==================== PUBLISHERS ====================

// Load all publishers with count
async function loadPublishers() {
    try {
        const response = await fetch('/api/admin/publishers');
        if (response.ok) {
            const publishers = await response.json();
            displayPublishers(publishers);
        } else {
            showToast('Грешка при зареждане на издателства', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Display publishers in table
function displayPublishers(publishers) {
    const tbody = document.getElementById('publishers-tbody');
    
    if (!tbody) return;
    
    if (publishers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Няма издателства</td></tr>';
        return;
    }
    
    tbody.innerHTML = publishers.map(pub => `
        <tr>
            <td>
                <span class="badge bg-info me-2">${pub.name}</span>
            </td>
            <td>
                <span class="badge bg-primary">${pub.count} учебника</span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showEditPublisherModal('${pub.name}', ${pub.count})">
                    <i class="bi bi-pencil"></i> Редактирай
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePublisher('${pub.name}', ${pub.count})"
                        ${pub.count > 0 ? 'disabled title="Не може да се изтрие издателство с учебници"' : ''}>
                    <i class="bi bi-trash"></i> Изтрий
                </button>
            </td>
        </tr>
    `).join('');
}

// Show add publisher modal
function showAddPublisherModal() {
    const modal = `
        <div class="modal fade" id="publisherModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-plus-circle"></i> Добавяне на издателство
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Име на издателство</label>
                            <input type="text" class="form-control" id="publisher-name" 
                                   placeholder="Напр: Просвета">
                            <small class="text-muted">Въведете уникално име на издателството</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-success" onclick="savePublisher('add')">
                            <i class="bi bi-check-circle"></i> Добави
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('publisherModal'));
    modalEl.show();
}

// Show edit publisher modal
function showEditPublisherModal(oldName, count) {
    const modal = `
        <div class="modal fade" id="publisherModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil"></i> Редактиране на издателство
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="publisher-old-name" value="${oldName}">
                        <div class="mb-3">
                            <label class="form-label">Име на издателство</label>
                            <input type="text" class="form-control" id="publisher-name" value="${oldName}">
                            <small class="text-muted">
                                <i class="bi bi-info-circle"></i> 
                                Промяната ще засегне ${count} учебника
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="savePublisher('edit')">
                            <i class="bi bi-check-circle"></i> Запази
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('publisherModal'));
    modalEl.show();
}

// Save publisher (add or edit)
async function savePublisher(mode) {
    const name = document.getElementById('publisher-name').value.trim();
    
    if (!name) {
        showToast('Моля въведете име на издателство', 'error');
        return;
    }
    
    const data = { name };
    let url = '/api/admin/publishers';
    let method = 'POST';
    
    if (mode === 'edit') {
        const oldName = document.getElementById('publisher-old-name').value;
        data.old_name = oldName;
        method = 'PUT';
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(mode === 'edit' ? 'Издателството е обновено' : 'Издателството е добавено');
            bootstrap.Modal.getInstance(document.getElementById('publisherModal')).hide();
            loadPublishers();
            
            // Reload books publishers dropdown if on books page
            if (currentSection.startsWith('books')) {
                loadBooksPublishers();
            }
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при запазване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Delete publisher
async function deletePublisher(name, count) {
    if (count > 0) {
        showToast('Не може да се изтрие издателство с учебници', 'error');
        return;
    }
    
    if (!confirm(`Сигурни ли сте, че искате да изтриете издателството "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/publishers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            showToast('Издателството е изтрито');
            loadPublishers();
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Toast notification helper (if not already defined)
function showToast(message, type = 'success') {
    // Create toast element
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0" 
             role="alert" style="position: fixed; top: 80px; right: 20px; z-index: 9999;">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Add to body
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    // Show toast
    const toastEl = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    
    // Remove after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
}
