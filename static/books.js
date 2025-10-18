// Books Management Module

// Get status badge for book quantity (colored circle) - UPDATED VERSION
function getBookStatusBadge(quantity, minThreshold) {
    console.log('getBookStatusBadge called with:', quantity, minThreshold); // DEBUG
    if (quantity === 0) {
        return '<i class="bi bi-circle-fill text-danger" title="Изчерпан"></i>';
    } else if (quantity <= minThreshold) {
        return '<i class="bi bi-circle-fill text-warning" title="Нисък"></i>';
    } else {
        return '<i class="bi bi-circle-fill text-success" title="Наличен"></i>';
    }
}

// Load books (textbooks or workbooks)
async function loadBooks(type) {
    const isWorkbook = type === 'Учебна тетрадка';
    const searchId = isWorkbook ? 'workbooks-search' : 'books-search';
    const gradeId = isWorkbook ? 'workbooks-grade' : 'books-grade';
    const publisherId = isWorkbook ? 'workbooks-publisher' : 'books-publisher';
    const lowStockId = isWorkbook ? 'workbooks-low-stock' : 'books-low-stock';
    const tbodyId = isWorkbook ? 'workbooks-tbody' : 'books-tbody';
    
    const search = document.getElementById(searchId)?.value || '';
    const grade = document.getElementById(gradeId)?.value || '';
    const publisher = document.getElementById(publisherId)?.value || '';
    const lowStock = document.getElementById(lowStockId)?.checked || false;
    
    const params = new URLSearchParams();
    params.append('type', type);
    if (search) params.append('search', search);
    if (grade) params.append('grade', grade);
    if (publisher) params.append('publisher', publisher);
    if (lowStock) params.append('low_stock', 'true');
    
    try {
        const response = await fetch(`/api/books?${params}`);
        if (response.ok) {
            const books = await response.json();
            displayBooks(books, tbodyId);
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            showToast('Грешка при зареждане на учебници', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Display books in table
function displayBooks(books, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    
    if (books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Няма учебници за показване</td></tr>';
        return;
    }
    
    tbody.innerHTML = books.map(b => `
        <tr>
            <td>${getBookStatusBadge(b.quantity, 5)}</td>
            <td><strong>${b.subject}</strong></td>
            <td><span class="badge bg-info">${b.grade} клас</span></td>
            <td><small>${b.publisher}</small></td>
            <td><small>${b.author || '-'}</small></td>
            <td>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-danger me-2" 
                            onclick="adjustBookQuantity(${b.id}, -1)"
                            ${b.quantity <= 0 ? 'disabled' : ''}>
                        <i class="bi bi-dash"></i>
                    </button>
                    <strong class="mx-2">${b.quantity}</strong>
                    <button class="btn btn-sm btn-outline-success ms-2" 
                            onclick="adjustBookQuantity(${b.id}, 1)">
                        <i class="bi bi-plus"></i>
                    </button>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showEditBookModal(${b.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteBook(${b.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load publishers for filter dropdowns
async function loadBooksPublishers() {
    try {
        const response = await fetch('/api/books/publishers');
        if (response.ok) {
            const publishers = await response.json();
            
            // Update both dropdowns
            ['books-publisher', 'workbooks-publisher'].forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.innerHTML = '<option value="">Всички издателства</option>' +
                        publishers.map(p => `<option value="${p}">${p}</option>`).join('');
                }
            });
        }
    } catch (error) {
        console.error('Error loading publishers:', error);
    }
}

// Adjust book quantity
async function adjustBookQuantity(id, change) {
    try {
        const response = await fetch(`/api/books/${id}/quantity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change })
        });
        
        if (response.ok) {
            showToast('Количеството е обновено');
            // Reload current section
            if (currentSection === 'books-textbooks') {
                loadBooks('Учебник');
            } else if (currentSection === 'books-workbooks') {
                loadBooks('Учебна тетрадка');
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

// Show Add Book Modal
function showAddBookModal(type) {
    const modal = createBookModal('add', type);
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('bookModal'));
    modalEl.show();
    loadPublishersForModal();
}

// Show Edit Book Modal
async function showEditBookModal(id) {
    try {
        const response = await fetch(`/api/books/${id}`);
        if (response.ok) {
            const book = await response.json();
            const modal = createBookModal('edit', book.type, book);
            document.getElementById('modals-container').innerHTML = modal;
            const modalEl = new bootstrap.Modal(document.getElementById('bookModal'));
            modalEl.show();
            loadPublishersForModal();
        } else {
            showToast('Грешка при зареждане на учебник', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Create book modal HTML
function createBookModal(mode, type, book = null) {
    const isEdit = mode === 'edit';
    const isWorkbook = type === 'Учебна тетрадка';
    const title = isEdit 
        ? `Редактиране на ${isWorkbook ? 'тетрадка' : 'учебник'}` 
        : `Добавяне на ${isWorkbook ? 'тетрадка' : 'учебник'}`;
    
    return `
        <div class="modal fade" id="bookModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="book-form">
                            <input type="hidden" id="book-id" value="${book?.id || ''}">
                            <input type="hidden" id="book-type" value="${type}">
                            <div class="mb-3">
                                <label class="form-label">Предмет *</label>
                                <input type="text" class="form-control" id="book-subject" 
                                       value="${book?.subject || ''}" required 
                                       placeholder="напр. Български език">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Клас *</label>
                                <select class="form-select" id="book-grade" required>
                                    <option value="">Изберете клас</option>
                                    ${[1,2,3,4,5,6,7].map(g => 
                                        `<option value="${g}" ${book?.grade == g ? 'selected' : ''}>${g} клас</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Издателство *</label>
                                <select class="form-select" id="book-publisher" required>
                                    <option value="">Изберете издателство</option>
                                </select>
                                <small class="form-text text-muted">Или въведете ново:</small>
                                <input type="text" class="form-control mt-1" id="book-publisher-custom" 
                                       placeholder="Ново издателство">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Автор</label>
                                <input type="text" class="form-control" id="book-author" 
                                       value="${book?.author || ''}" 
                                       placeholder="напр. Иван Петров">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Начално количество *</label>
                                <input type="number" class="form-control" id="book-quantity" 
                                       value="${book?.quantity || 0}" min="0" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="saveBook('${mode}')">
                            ${isEdit ? 'Запази промени' : 'Добави'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load publishers for modal dropdown
async function loadPublishersForModal() {
    try {
        const response = await fetch('/api/books/publishers');
        if (response.ok) {
            const publishers = await response.json();
            const select = document.getElementById('book-publisher');
            const currentValue = select.dataset.value || '';
            
            select.innerHTML = '<option value="">Изберете издателство</option>' +
                publishers.map(p => `<option value="${p}" ${p === currentValue ? 'selected' : ''}>${p}</option>`).join('');
            
            // If editing, set the selected publisher
            if (currentValue) {
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('Error loading publishers:', error);
    }
}

// Save book (add or edit)
async function saveBook(mode) {
    const id = document.getElementById('book-id').value;
    const type = document.getElementById('book-type').value;
    const subject = document.getElementById('book-subject').value.trim();
    const grade = document.getElementById('book-grade').value;
    const publisherSelect = document.getElementById('book-publisher').value;
    const publisherCustom = document.getElementById('book-publisher-custom').value.trim();
    const publisher = publisherCustom || publisherSelect;
    const author = document.getElementById('book-author').value.trim();
    const quantity = parseInt(document.getElementById('book-quantity').value);
    
    if (!subject || !grade || !publisher) {
        showToast('Моля попълнете всички задължителни полета', 'error');
        return;
    }
    
    const data = { subject, grade: parseInt(grade), publisher, author, quantity, type };
    const url = mode === 'edit' ? `/api/books/${id}` : '/api/books';
    const method = mode === 'edit' ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(mode === 'edit' ? 'Учебникът е обновен' : 'Учебникът е добавен');
            bootstrap.Modal.getInstance(document.getElementById('bookModal')).hide();
            
            // Reload current section
            if (currentSection === 'books-textbooks') {
                loadBooks('Учебник');
            } else if (currentSection === 'books-workbooks') {
                loadBooks('Учебна тетрадка');
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

// Delete book
async function deleteBook(id) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този учебник?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showToast('Учебникът е изтрит');
            
            // Reload current section
            if (currentSection === 'books-textbooks') {
                loadBooks('Учебник');
            } else if (currentSection === 'books-workbooks') {
                loadBooks('Учебна тетрадка');
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

// Export books to Excel
async function exportBooks(type, lowStockOnly = false) {
    try {
        const params = new URLSearchParams();
        params.append('type', type);
        if (lowStockOnly) {
            params.append('low_stock', 'true');
        }
        
        const response = await fetch(`/api/books/export?${params}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = type === 'Учебник' ? 'textbooks' : 'workbooks';
            a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

// Add event listeners for books filters
document.addEventListener('DOMContentLoaded', function() {
    // Textbooks filters
    const booksSearch = document.getElementById('books-search');
    const booksGrade = document.getElementById('books-grade');
    const booksPublisher = document.getElementById('books-publisher');
    const booksLowStock = document.getElementById('books-low-stock');
    
    if (booksSearch) {
        booksSearch.addEventListener('input', debounce(() => loadBooks('Учебник'), 500));
    }
    if (booksGrade) {
        booksGrade.addEventListener('change', () => loadBooks('Учебник'));
    }
    if (booksPublisher) {
        booksPublisher.addEventListener('change', () => loadBooks('Учебник'));
    }
    if (booksLowStock) {
        booksLowStock.addEventListener('change', () => loadBooks('Учебник'));
    }
    
    // Workbooks filters
    const workbooksSearch = document.getElementById('workbooks-search');
    const workbooksGrade = document.getElementById('workbooks-grade');
    const workbooksPublisher = document.getElementById('workbooks-publisher');
    const workbooksLowStock = document.getElementById('workbooks-low-stock');
    
    if (workbooksSearch) {
        workbooksSearch.addEventListener('input', debounce(() => loadBooks('Учебна тетрадка'), 500));
    }
    if (workbooksGrade) {
        workbooksGrade.addEventListener('change', () => loadBooks('Учебна тетрадка'));
    }
    if (workbooksPublisher) {
        workbooksPublisher.addEventListener('change', () => loadBooks('Учебна тетрадка'));
    }
    if (workbooksLowStock) {
        workbooksLowStock.addEventListener('change', () => loadBooks('Учебна тетрадка'));
    }
});
