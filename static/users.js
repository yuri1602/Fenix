// Users Management Module (Admin only)

// Load all users
async function loadUsers() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Нямате достъп до тази функционалност', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else if (response.status === 403) {
            showToast('Нямате права за достъп', 'error');
        } else {
            showToast('Грешка при зареждане на потребители', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Няма потребители за показване</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.full_name || '-'}</td>
            <td>
                <span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                    ${u.role === 'admin' ? 'Администратор' : 'Потребител'}
                </span>
            </td>
            <td>${u.company || '-'}</td>
            <td><small class="text-muted">${new Date(u.created_at).toLocaleString('bg-BG')}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showEditUserModal(${u.id})"
                        ${u.username === 'admin' ? 'disabled title="Системен администратор"' : ''}>
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"
                        ${u.username === 'admin' || u.id === currentUser.id ? 'disabled' : ''}>
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Show Add User Modal
function showAddUserModal() {
    const modal = createUserModal('add');
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('userModal'));
    modalEl.show();
}

// Show Edit User Modal
async function showEditUserModal(id) {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            const user = users.find(u => u.id === id);
            if (user) {
                const modal = createUserModal('edit', user);
                document.getElementById('modals-container').innerHTML = modal;
                const modalEl = new bootstrap.Modal(document.getElementById('userModal'));
                modalEl.show();
            }
        } else {
            showToast('Грешка при зареждане на потребител', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Create user modal HTML
function createUserModal(mode, user = null) {
    const isEdit = mode === 'edit';
    const title = isEdit ? 'Редактиране на потребител' : 'Добавяне на потребител';
    
    return `
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="user-form">
                            <input type="hidden" id="user-id" value="${user?.id || ''}">
                            <div class="mb-3">
                                <label class="form-label">Потребителско име *</label>
                                <input type="text" class="form-control" id="user-username" 
                                       value="${user?.username || ''}" 
                                       ${isEdit ? 'disabled' : 'required'}
                                       placeholder="напр. ivan.petrov">
                                ${isEdit ? '<small class="form-text text-muted">Потребителското име не може да се променя</small>' : ''}
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Пълно име</label>
                                <input type="text" class="form-control" id="user-fullname" 
                                       value="${user?.full_name || ''}" 
                                       placeholder="напр. Иван Петров">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Парола ${isEdit ? '(оставете празно за запазване на старата)' : '*'}</label>
                                <input type="password" class="form-control" id="user-password" 
                                       ${!isEdit ? 'required' : ''} 
                                       placeholder="Минимум 6 символа">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Потвърждение на парола</label>
                                <input type="password" class="form-control" id="user-password-confirm" 
                                       placeholder="Повторете паролата">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Роля *</label>
                                <select class="form-select" id="user-role" required>
                                    <option value="user" ${user?.role === 'user' ? 'selected' : ''}>Потребител</option>
                                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Администратор</option>
                                </select>
                                <small class="form-text text-muted">
                                    Администраторите могат да управляват потребители
                                </small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Компания</label>
                                <input type="text" class="form-control" id="user-company" 
                                       value="${user?.company || ''}" 
                                       placeholder="напр. Училище Христо Ботев">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="saveUser('${mode}')">
                            ${isEdit ? 'Запази промени' : 'Създай потребител'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Save user (add or edit)
async function saveUser(mode) {
    const id = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value.trim();
    const fullName = document.getElementById('user-fullname').value.trim();
    const password = document.getElementById('user-password').value;
    const passwordConfirm = document.getElementById('user-password-confirm').value;
    const role = document.getElementById('user-role').value;
    const company = document.getElementById('user-company').value.trim();
    
    // Validation
    if (mode === 'add' && !username) {
        showToast('Моля въведете потребителско име', 'error');
        return;
    }
    
    if (mode === 'add' && !password) {
        showToast('Моля въведете парола', 'error');
        return;
    }
    
    if (password && password.length < 6) {
        showToast('Паролата трябва да е минимум 6 символа', 'error');
        return;
    }
    
    if (password && password !== passwordConfirm) {
        showToast('Паролите не съвпадат', 'error');
        return;
    }
    
    const data = { 
        username, 
        full_name: fullName, 
        role, 
        company 
    };
    
    if (password) {
        data.password = password;
    }
    
    const url = mode === 'edit' ? `/api/users/${id}` : '/api/users';
    const method = mode === 'edit' ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast(mode === 'edit' ? 'Потребителят е обновен' : 'Потребителят е създаден');
            bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            loadUsers();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else if (response.status === 403) {
            showToast('Нямате права за тази операция', 'error');
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при запазване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Delete user
async function deleteUser(id) {
    if (id === currentUser.id) {
        showToast('Не можете да изтриете собствения си акаунт', 'error');
        return;
    }
    
    if (!confirm('Сигурни ли сте, че искате да изтриете този потребител? Това действие е необратимо!')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showToast('Потребителят е изтрит');
            loadUsers();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else if (response.status === 403) {
            showToast('Нямате права за тази операция', 'error');
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при изтриване', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}
