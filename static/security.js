// Security Management Module

// Show Change Password Modal
function showChangePasswordModal(targetUserId = null) {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isSelf = !targetUserId || targetUserId === currentUser.id;
    
    const modal = `
        <div class="modal fade" id="changePasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-key"></i> Смяна на парола
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="change-password-form">
                            <input type="hidden" id="target-user-id" value="${targetUserId || ''}">
                            
                            ${isSelf ? `
                            <div class="mb-3">
                                <label class="form-label">Текуща парола *</label>
                                <input type="password" class="form-control" id="current-password" 
                                       required placeholder="Въведете текущата парола">
                            </div>
                            ` : ''}
                            
                            <div class="mb-3">
                                <label class="form-label">Нова парола *</label>
                                <input type="password" class="form-control" id="new-password" 
                                       required placeholder="Минимум 6 символа"
                                       minlength="6">
                                <div class="form-text">
                                    Паролата трябва да е поне 6 символа
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Потвърждение на нова парола *</label>
                                <input type="password" class="form-control" id="confirm-password" 
                                       required placeholder="Повторете новата парола">
                            </div>
                            
                            ${!isSelf && isAdmin ? `
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i>
                                <strong>Внимание:</strong> Променяте паролата на друг потребител като администратор.
                            </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
                        <button type="button" class="btn btn-primary" onclick="changePassword()">
                            <i class="bi bi-check-lg"></i> Смени парола
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = modal;
    const modalEl = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modalEl.show();
}

// Change password
async function changePassword() {
    const targetUserId = document.getElementById('target-user-id').value;
    const currentPassword = document.getElementById('current-password')?.value || '';
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (newPassword.length < 6) {
        showToast('Новата парола трябва да е поне 6 символа', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Паролите не съвпадат', 'error');
        return;
    }
    
    const data = {
        new_password: newPassword
    };
    
    if (currentPassword) {
        data.current_password = currentPassword;
    }
    
    if (targetUserId) {
        data.user_id = parseInt(targetUserId);
    }
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Паролата е променена успешно', 'success');
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        } else if (response.status === 401) {
            const error = await response.json();
            showToast(error.error || 'Грешна текуща парола', 'error');
        } else if (response.status === 403) {
            showToast('Нямате права за тази операция', 'error');
        } else {
            const error = await response.json();
            showToast(error.error || 'Грешка при смяна на паролата', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Load security logs
async function loadSecurityLogs() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Нямате достъп до логовете', 'error');
        return;
    }
    
    const limit = document.getElementById('logs-limit')?.value || 100;
    const eventType = document.getElementById('logs-event-type')?.value || '';
    const username = document.getElementById('logs-username')?.value || '';
    
    try {
        let url = `/api/security-logs?limit=${limit}`;
        if (eventType) url += `&event_type=${eventType}`;
        if (username) url += `&username=${username}`;
        
        const response = await fetch(url, {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            displaySecurityLogs(data.logs, data.total);
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else if (response.status === 403) {
            showToast('Нямате права за достъп', 'error');
        } else {
            showToast('Грешка при зареждане на логове', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при свързване със сървъра', 'error');
    }
}

// Display security logs
function displaySecurityLogs(logs, total) {
    const tbody = document.getElementById('security-logs-tbody');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Няма логове за показване</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const eventBadge = getEventBadge(log.event_type, log.success);
        const successIcon = log.success ? 
            '<i class="bi bi-check-circle-fill text-success"></i>' : 
            '<i class="bi bi-x-circle-fill text-danger"></i>';
        
        return `
            <tr class="${log.success ? '' : 'table-warning'}">
                <td><small class="text-muted">${new Date(log.created_at).toLocaleString('bg-BG')}</small></td>
                <td>${eventBadge}</td>
                <td><strong>${log.username}</strong></td>
                <td><code class="small">${log.ip_address}</code></td>
                <td>${successIcon}</td>
                <td><small>${log.details || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="showLogDetails(${log.id})" 
                            title="Детайли">
                        <i class="bi bi-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update stats
    document.getElementById('total-logs').textContent = total;
}

// Get event type badge
function getEventBadge(eventType, success) {
    const badges = {
        'LOGIN_SUCCESS': '<span class="badge bg-success">Успешен вход</span>',
        'LOGIN_FAILED': '<span class="badge bg-danger">Неуспешен вход</span>',
        'LOGIN_BLOCKED': '<span class="badge bg-dark">Блокиран опит</span>',
        'LOGIN_ATTEMPT': '<span class="badge bg-warning">Опит за вход</span>',
        'PASSWORD_CHANGED': '<span class="badge bg-info">Смяна на парола</span>',
        'PASSWORD_CHANGED_BY_ADMIN': '<span class="badge bg-primary">Смяна от админ</span>',
        'PASSWORD_CHANGE_FAILED': '<span class="badge bg-danger">Неуспешна смяна</span>',
    };
    
    return badges[eventType] || `<span class="badge bg-secondary">${eventType}</span>`;
}

// Show log details
async function showLogDetails(logId) {
    try {
        const response = await fetch(`/api/security-logs?limit=1000`, {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            const log = data.logs.find(l => l.id === logId);
            
            if (log) {
                const modal = `
                    <div class="modal fade" id="logDetailsModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">
                                        <i class="bi bi-file-text"></i> Детайли на лог #${log.id}
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <table class="table table-striped">
                                        <tr>
                                            <th style="width: 200px">ID:</th>
                                            <td>${log.id}</td>
                                        </tr>
                                        <tr>
                                            <th>Време:</th>
                                            <td>${new Date(log.created_at).toLocaleString('bg-BG', {
                                                year: 'numeric', month: 'long', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}</td>
                                        </tr>
                                        <tr>
                                            <th>Тип събитие:</th>
                                            <td>${getEventBadge(log.event_type, log.success)}</td>
                                        </tr>
                                        <tr>
                                            <th>Потребител:</th>
                                            <td><strong>${log.username}</strong></td>
                                        </tr>
                                        <tr>
                                            <th>IP адрес:</th>
                                            <td><code>${log.ip_address}</code></td>
                                        </tr>
                                        <tr>
                                            <th>Успешно:</th>
                                            <td>${log.success ? 
                                                '<span class="badge bg-success">Да</span>' : 
                                                '<span class="badge bg-danger">Не</span>'}</td>
                                        </tr>
                                        <tr>
                                            <th>Детайли:</th>
                                            <td>${log.details || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th>User Agent:</th>
                                            <td><small class="font-monospace">${log.user_agent || '-'}</small></td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Затвори</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('modals-container').innerHTML = modal;
                const modalEl = new bootstrap.Modal(document.getElementById('logDetailsModal'));
                modalEl.show();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при зареждане на детайли', 'error');
    }
}

// Export security logs to CSV
async function exportSecurityLogs() {
    try {
        const response = await fetch('/api/security-logs?limit=10000', {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            const logs = data.logs;
            
            // Create CSV content
            const headers = ['ID', 'Дата и час', 'Тип', 'Потребител', 'IP адрес', 'Успешно', 'Детайли', 'User Agent'];
            const rows = logs.map(log => [
                log.id,
                new Date(log.created_at).toLocaleString('bg-BG'),
                log.event_type,
                log.username,
                log.ip_address,
                log.success ? 'Да' : 'Не',
                log.details || '',
                log.user_agent || ''
            ]);
            
            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            // Download CSV
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `security_logs_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            showToast('Логовете са експортирани успешно', 'success');
        } else {
            showToast('Грешка при експорт', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Грешка при експорт', 'error');
    }
}
