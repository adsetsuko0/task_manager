let currentProjectTasks = [];
let currentTaskId = null;



function renderProjectPage(projectEl) {

    console.log('projectEl:', projectEl);
    console.log('projectId:', projectEl.dataset.projectId);

    const projectName = projectEl.querySelector('.project-name').textContent;
    const projectId = projectEl.dataset.projectId;
    const groupEl = projectEl.closest('.spaces-group');
    const groupName = groupEl ? groupEl.querySelector('.group-name').textContent : '';

    saveAppState('project', projectId);

    updatePageTitle('Projects');

    const contentEl = document.querySelector('.content');
    contentEl.innerHTML = `
        <div class="project-page" data-project-id="${projectId}">

            <div class="view-switch project-view-switch">
                <button class="view-btn active" data-view="board">
                    <svg class="view-icon" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="7" height="7"/>
                        <rect x="13" y="4" width="7" height="7"/>
                        <rect x="4" y="13" width="7" height="7"/>
                        <rect x="13" y="13" width="7" height="7"/>
                    </svg>
                    <span>Board</span>
                </button>
                <button class="view-btn" data-view="list">
                    <svg class="view-icon" viewBox="0 0 24 24">
                        <rect x="4" y="5" width="16" height="2"/>
                        <rect x="4" y="11" width="16" height="2"/>
                        <rect x="4" y="17" width="16" height="2"/>
                    </svg>
                    <span>List</span>
                </button>
            </div>

            <div class="divider"></div>

            <div class="project-toolbar">
                <div class="filter-wrapper">
                    <button class="filter-btn" id="project-filter-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"/>
                            <line x1="8" y1="12" x2="16" y2="12"/>
                            <line x1="11" y1="18" x2="13" y2="18"/>
                            <circle cx="7" cy="6" r="2" fill="currentColor" stroke="none"/>
                            <circle cx="17" cy="12" r="2" fill="currentColor" stroke="none"/>
                            <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none"/>
                        </svg>
                        Filter
                    </button>
                    <div class="filter-dropdown" id="project-filter-dropdown" style="display:none">
                        <div class="filter-dropdown-header"><span>Filters</span></div>
                        <div class="filter-dropdown-body">
                            <div class="filter-option" data-filter="name-asc"><span class="filter-icon">↑</span> Name (A-Z)</div>
                            <div class="filter-option" data-filter="name-desc"><span class="filter-icon">↓</span> Name (Z-A)</div>
                            <div class="filter-option" data-filter="status-todo"><span class="filter-icon">○</span> To Do first</div>
                            <div class="filter-option" data-filter="status-done"><span class="filter-icon">✓</span> Done first</div>
                            <div class="filter-option" data-filter="date-new"><span class="filter-icon">📅</span> Newest first</div>
                            <div class="filter-option" data-filter="date-old"><span class="filter-icon">📅</span> Oldest first</div>
                        </div>
                        <div class="filter-dropdown-footer">
                            <button class="filter-add-btn">+ Add filter</button>
                        </div>
                    </div>
                </div>

                <button class="toolbar-btn" id="project-groupby-btn">⊞ Group by</button>
                    <div class="groupby-dropdown" id="project-groupby-dropdown" style="display:none">
                    <div class="groupby-dropdown-header">Group by</div>
                    <div class="groupby-selects">
        <select id="groupby-field-select" class="groupby-select">
            <option value="none">— None —</option>
            <option value="status">Status</option>
            <option value="created_at">Created at</option>
            <option value="updated_at">Updated at</option>
            <option value="priority">Priority</option>
        </select>
        <select id="groupby-value-select" class="groupby-select" style="display:none">
        </select>
    </div>
</div>

                <button class="toolbar-btn" id="project-showdone-btn">✓ Show done</button>
            </div>

            <div class="project-info-card">
                <div class="project-info-top">
                    <div class="project-info-left">
                        <span class="project-info-arrow" id="project-info-arrow">▼</span>
                        <span class="project-info-name">${projectName}</span>
                        <span class="project-info-group">• ${groupName}</span>
                        <button class="project-info-menu-btn" id="project-info-menu-btn">⋯</button>
                    </div>
                    <div class="project-info-right">
                        <span class="project-info-fav" id="project-info-fav" data-project-id="${projectId}">♡︎</span>
                        <button class="project-add-task-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
                    </div>
                </div>

                <div class="project-info-subtitle">
                    <span class="project-info-groupby-label">Group by: <span id="project-groupby-value">None</span></span>
                </div>

                <div class="project-info-body" id="project-info-body">
                    <div class="project-tasks-container board-view" id="project-tasks-container">
                        <div class="project-tasks-loading">Loading tasks...</div>
                    </div>
                </div>
            </div>

        </div>
    `;

    loadProjectTasks(projectId);

    // view switch
    const viewBtns = contentEl.querySelectorAll('.view-btn');
    const tasksContainer = contentEl.querySelector('.project-tasks-container');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            tasksContainer.classList.remove('board-view', 'list-view');
            tasksContainer.classList.add(view + '-view');
        });
    });

    // collapse
    const arrow = contentEl.querySelector('#project-info-arrow');
    const body = contentEl.querySelector('#project-info-body');
    arrow.addEventListener('click', () => {
        body.classList.toggle('collapsed');
        arrow.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
    });

    // filter toggle
    const filterBtn = contentEl.querySelector('#project-filter-btn');
    const filterDropdown = contentEl.querySelector('#project-filter-dropdown');
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.style.display = filterDropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        if (filterDropdown) filterDropdown.style.display = 'none';
    });

    // filter logic
    const filterOptions = contentEl.querySelectorAll('.filter-option[data-filter]');
    filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            filterOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            filterBtn.classList.add('filter-active');

            const filter = option.dataset.filter;
            const cards = Array.from(tasksContainer.querySelectorAll('.project-task-card'));

            cards.sort((a, b) => {
                const nameA = a.querySelector('.project-task-title')?.textContent.trim() || '';
                const nameB = b.querySelector('.project-task-title')?.textContent.trim() || '';
                const statusA = a.dataset.status || '';
                const statusB = b.dataset.status || '';

                if (filter === 'name-asc') return nameA.localeCompare(nameB);
                if (filter === 'name-desc') return nameB.localeCompare(nameA);
                if (filter === 'status-todo') return statusA === 'todo' ? -1 : 1;
                if (filter === 'status-done') return statusA === 'done' ? -1 : 1;
                return 0;
            });

            cards.forEach(card => tasksContainer.appendChild(card));
            filterDropdown.style.display = 'none';
        });
    });

    // group by
    const groupByBtn = contentEl.querySelector('#project-groupby-btn');
    const groupByDropdown = contentEl.querySelector('#project-groupby-dropdown');
    const groupByFieldSelect = contentEl.querySelector('#groupby-field-select');
    const groupByValueSelect = contentEl.querySelector('#groupby-value-select');

    groupByBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        groupByDropdown.style.display = groupByDropdown.style.display === 'none' ? 'block' : 'none';
    });

    groupByFieldSelect.addEventListener('change', () => {
    const field = groupByFieldSelect.value;

    if (field === 'none') {
        groupByValueSelect.style.display = 'none';
        groupByBtn.classList.remove('active');
        document.getElementById('project-groupby-value').textContent = 'None';
        return;
    }

    // собираем уникальные значения из задач
    let values = [];
    if (field === 'status') {
        values = [...new Set(currentProjectTasks.map(t => t.status))];
    } else if (field === 'created_at') {
        values = [...new Set(currentProjectTasks.map(t => t.created_at))];
    } else if (field === 'updated_at') {
        values = [...new Set(currentProjectTasks.map(t => t.updated_at))];
    } else if (field === 'priority') {
        values = [...new Set(currentProjectTasks.map(t => t.priority).filter(Boolean))];
    }

    // заполняем второй select
    groupByValueSelect.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join('');
    groupByValueSelect.style.display = values.length > 0 ? 'block' : 'none';

    groupByBtn.classList.add('active');
    document.getElementById('project-groupby-value').textContent = field;
});

    // show done
    let showDone = true;
    const showDoneBtn = contentEl.querySelector('#project-showdone-btn');
    showDoneBtn.addEventListener('click', () => {
        showDone = !showDone;
        showDoneBtn.classList.toggle('active', !showDone);
        const doneCards = tasksContainer.querySelectorAll('.project-task-card[data-status="done"]');
        doneCards.forEach(card => {
            card.style.display = showDone ? '' : 'none';
        });
    });

    // сердечко
    const favBtn = contentEl.querySelector('#project-info-fav');
    const isFav = projectEl.querySelector('.project-fav')?.textContent.includes('♥') || false;
    favBtn.textContent = isFav ? '♥︎' : '♡︎';

    favBtn.addEventListener('click', () => {
        toggleFavourite(favBtn, projectId);
        setTimeout(() => {
            const sidebarFav = projectEl.querySelector('.project-fav');
            favBtn.textContent = sidebarFav?.textContent.includes('♥') ? '♥︎' : '♡︎';
        }, 300);
    });

    // меню проекта
    const infoMenuBtn = contentEl.querySelector('#project-info-menu-btn');
    infoMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectMenu(e, projectId, projectName);
    });
}




function loadProjectTasks(projectId) {

    fetch(`/projects/${projectId}/tasks/`)
        .then(res => res.json())
        .then(tasks => {
            renderProjectTasks(tasks, projectId);
        })
        .catch(err => console.error('Error loading tasks', err));
}


function renderProjectTasks(tasks, projectId) {
    currentProjectTasks = tasks;
    const container = document.getElementById('project-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="project-tasks-empty">
                <img src="/static/tasks/icons/doc_light.png" class="card-icon" style="opacity:0.4">
                <span>No tasks yet</span>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="tasks-table">
            <thead>
                <tr>
                    <th class="tasks-th">Status</th>
                    <th class="tasks-th">Name</th>
                    <th class="tasks-th">Assignee</th>
                    <th class="tasks-th">Due date</th>
                    <th class="tasks-th">Priority</th>
                    <th class="tasks-th"></th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => `
                    <tr class="task-row" data-task-id="${task.id}" data-status="${task.status}">
                        <td class="task-td">
                            <span class="task-status-badge status-${task.status}" onclick="openStatusPicker(event, '${task.id}', this)">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="task-status-icon">
                        ${task.status === 'todo' ? `
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
            ` : task.status === 'in_progress' ? `
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            ` : `
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            `}
        </svg>
        ${task.status === 'todo' ? 'TO DO' : task.status === 'in_progress' ? 'IN PROGRESS' : 'DONE'}
    </span>
</td>
                        <td class="task-td task-title-td">${task.title}</td>
                                <td class="task-td task-muted" style="cursor:pointer" onclick="openAssigneePicker(event, '${task.id}', this)">
                                    ${task.assignee ? '👤 ' + task.assignee : `
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="assignee-add-icon">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                    <line x1="19" y1="8" x2="19" y2="14"/>
                                    <line x1="16" y1="11" x2="22" y2="11"/>
                                </svg>
                            `}
                        </td>
                        <td class="task-td task-muted" style="cursor:pointer" onclick="openDatePicker(event, '${task.id}', this)" data-due="${task.due_date || ''}">
                            ${task.due_date ? task.due_date : `
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="date-add-icon">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                                <line x1="12" y1="14" x2="12" y2="20"/>
                                <line x1="9" y1="17" x2="15" y2="17"/>
                            </svg>
                            `}
                        </td>
                        <td class="task-td" onclick="openPriorityPicker(event, '${task.id}', this)" style="cursor:pointer">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="task-priority-inline">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
</td>
                        <td class="task-td">
                            <button class="project-task-menu-btn" onclick="openTaskMenu(event, '${task.id}')">⋯</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


// двойной клик в сайдбаре
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('spaces-body').addEventListener('click', function(e) {
        console.log('project.js click', e.target);
        const projectItem = e.target.closest('.project-item');
                console.log('projectItem found:', projectItem);

        if (!projectItem) return;

        if (e.target.closest('.project-menu-btn') || e.target.closest('.project-fav')) return;

        const isActive = projectItem.classList.contains('active');

        if (!isActive) {
            // первый клик — просто выбираем
            document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
            projectItem.classList.add('active');
            return;
        }

        // второй клик — открываем страницу
        renderProjectPage(projectItem);
    });
});


function refreshProjectPageIfOpen() {
    const projectPage = document.querySelector('.project-page');
    if (!projectPage) return;

    const projectId = projectPage.dataset.projectId;
    const projectEl = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
    if (!projectEl) return;

    renderProjectPage(projectEl);
}



function openCreateTaskModal(projectId) {
    // заполняем список проектов
    const select = document.getElementById('createTaskProjectId');
    select.innerHTML = '';
    document.querySelectorAll('.project-item').forEach(el => {
        const opt = document.createElement('option');
        opt.value = el.dataset.projectId;
        opt.textContent = el.querySelector('.project-name').textContent;
        if (el.dataset.projectId == projectId) opt.selected = true;
        select.appendChild(opt);
    });

    // заполняем assignee
    fetch('/users/list/')
        .then(res => res.json())
        .then(users => {
            const assigneeSelect = document.getElementById('createTaskAssignee');
            assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
            users.forEach(u => {
            assigneeSelect.innerHTML += `<option value="${u.id}">👤 ${u.username}</option>`;
            });
        });

    document.getElementById('createTaskTitle').value = '';
    document.getElementById('createTaskDescription').value = '';
    document.getElementById('createTaskStatus').value = 'todo';
    document.getElementById('createTaskPriority').value = 'low';
    document.getElementById('createTaskDueDate').value = '';

    document.getElementById('createTaskModal').style.display = 'flex';
}

function closeCreateTaskModal() {
    document.getElementById('createTaskModal').style.display = 'none';
}

window.closeCreateTaskModal = closeCreateTaskModal;

function openCreateTaskModal(projectId) {
    // заполняем список проектов
    const select = document.getElementById('createTaskProjectId');
    select.innerHTML = '';
    document.querySelectorAll('.project-item').forEach(el => {
        const opt = document.createElement('option');
        opt.value = el.dataset.projectId;
        opt.textContent = el.querySelector('.project-name').textContent;
        if (el.dataset.projectId == projectId) opt.selected = true;
        select.appendChild(opt);
    });

    // заполняем assignee
    fetch('/users/list/')
        .then(res => res.json())
        .then(users => {
            const assigneeSelect = document.getElementById('createTaskAssignee');
            assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
            users.forEach(u => {
                assigneeSelect.innerHTML += `<option value="${u.id}">${u.username}</option>`;
            });
        });

    document.getElementById('createTaskTitle').value = '';
    document.getElementById('createTaskDescription').value = '';
    document.getElementById('createTaskStatus').value = 'todo';
    document.getElementById('createTaskPriority').value = 'low';
    document.getElementById('createTaskDueDate').value = '';

    document.getElementById('createTaskModal').style.display = 'flex';
}

function closeCreateTaskModal() {
    document.getElementById('createTaskModal').style.display = 'none';
}

function submitCreateTask() {
    const projectId = document.getElementById('createTaskProjectId').value;
    const title = document.getElementById('createTaskTitle').value.trim();
    const description = document.getElementById('createTaskDescription').value.trim();
    const status = document.getElementById('createTaskStatus').value;
    const priority = document.getElementById('createTaskPriority').value;
    const assignee = document.getElementById('createTaskAssignee').value;
    const dueDate = document.getElementById('createTaskDueDate').value;

    if (!title) {
        showToast('Task name cannot be empty');
        return;
    }

    fetch('/tasks/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ project_id: projectId, title, description, status, priority, assignee_id: assignee, due_date: dueDate })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeCreateTaskModal();
            showToast('Task created!');
            refreshProjectPageIfOpen();
        } else {
            showToast(data.error || 'Error creating task');
        }
    });
}

function openTaskMenu(event, taskId) {
    event.stopPropagation();
    currentTaskId = taskId;

    const dropdown = document.getElementById('task-dropdown');
    const rect = event.target.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdown.style.left = rect.left + 'px';
}

document.addEventListener('click', () => {
    const dd = document.getElementById('task-dropdown');
    if (dd) dd.style.display = 'none';
});

function renameTask() {
    const row = document.querySelector(`.task-row[data-task-id="${currentTaskId}"]`);
    if (!row) return;
    const titleTd = row.querySelector('.task-title-td');
    const oldName = titleTd.textContent;

    titleTd.innerHTML = `<input class="task-inline-input" value="${oldName}" onblur="submitRenameTask(this, '${currentTaskId}')" onkeydown="if(event.key==='Enter') this.blur()">`;
    titleTd.querySelector('input').focus();
}

function submitRenameTask(input, taskId) {
    const newName = input.value.trim();
    if (!newName) return;

    fetch('/tasks/rename/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: taskId, new_name: newName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
            if (row) row.querySelector('.task-title-td').textContent = newName;
            showToast('Task renamed');
        }
    });
}

function deleteTask() {
    if (!currentTaskId) return;
    if (!confirm('Delete this task?')) return;

    fetch('/tasks/delete/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: currentTaskId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${currentTaskId}"]`);
            if (row) row.remove();
            showToast('Task deleted');
        }
    });
}

function duplicateTask() {
    fetch('/tasks/duplicate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: currentTaskId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            refreshProjectPageIfOpen();
            showToast('Task duplicated');
        }
    });
}

function changeTaskDescription() {
    const row = document.querySelector(`.task-row[data-task-id="${currentTaskId}"]`);
    if (!row) return;

    const existing = document.querySelector('.task-description-inline');
    if (existing) existing.remove();

    const tr = document.createElement('tr');
    tr.className = 'task-description-inline';
    tr.innerHTML = `
        <td colspan="6" class="task-desc-td">
            <textarea class="task-desc-textarea" placeholder="Description..."
                onblur="submitTaskDescription(this, '${currentTaskId}')">${row.dataset.description || ''}</textarea>
        </td>
    `;
    row.after(tr);
    tr.querySelector('textarea').focus();
}

function submitTaskDescription(textarea, taskId) {
    const description = textarea.value.trim();
    fetch('/tasks/update_description/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: taskId, description })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
            if (row) row.dataset.description = description;
            textarea.closest('.task-description-inline')?.remove();
            showToast('Description updated');
        }
    });
}

function moveTaskTo() {
    const existing = document.getElementById('move-task-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'move-task-popup';
    popup.className = 'move-task-popup';
    popup.innerHTML = `
        <div class="move-task-popup-title">Move to project</div>
        ${Array.from(document.querySelectorAll('.project-item')).map(el => `
            <div class="move-task-popup-item" onclick="submitMoveTask('${el.dataset.projectId}')">
                ${el.querySelector('.project-name').textContent}
            </div>
        `).join('')}
    `;

    const btn = document.querySelector(`.task-row[data-task-id="${currentTaskId}"] .project-task-menu-btn`);
    const rect = btn?.getBoundingClientRect();
    if (rect) {
        popup.style.top = (rect.bottom + window.scrollY) + 'px';
        popup.style.left = rect.left + 'px';
    }
    document.body.appendChild(popup);
}

function submitMoveTask(projectId) {
    fetch('/tasks/move/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: currentTaskId, project_id: projectId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${currentTaskId}"]`);
            if (row) row.remove();
            document.getElementById('move-task-popup')?.remove();
            showToast('Task moved');
        }
    });
}


function openStatusPicker(event, taskId, el) {
    event.stopPropagation();
    const existing = document.getElementById('status-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'status-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `
        <div class="inline-picker-item" onclick="setTaskStatus('${taskId}', 'todo', this.closest('#status-picker'))">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:8px;vertical-align:middle;color:#888">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
            </svg>
            TO DO
        </div>
        <div class="inline-picker-item" onclick="setTaskStatus('${taskId}', 'in_progress', this.closest('#status-picker'))">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:8px;vertical-align:middle;color:#f1d56e">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            IN PROGRESS
        </div>
        <div class="inline-picker-item" onclick="setTaskStatus('${taskId}', 'done', this.closest('#status-picker'))">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:8px;vertical-align:middle;color:#2f9e44">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            DONE
        </div>
    `;

    const rect = el.getBoundingClientRect();
    picker.style.position = 'absolute';
    picker.style.top = (rect.bottom + window.scrollY) + 'px';
    picker.style.left = rect.left + 'px';
    document.body.appendChild(picker);
}


function setTaskStatus(taskId, status, picker) {
    fetch('/tasks/update_status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: taskId, status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
            if (row) {
                row.dataset.status = status;
                const badge = row.querySelector('.task-status-badge');
                const svgMap = {
                    todo: `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>`,
                    in_progress: `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
                    done: `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
                };
                const labelMap = { todo: 'TO DO', in_progress: 'IN PROGRESS', done: 'DONE' };
                badge.className = `task-status-badge status-${status}`;
                badge.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="task-status-icon">
                        ${svgMap[status]}
                    </svg>
                    ${labelMap[status]}
                `;
            }
            picker?.remove();
            showToast('Status updated');
        }
    });
}

function openDatePicker(event, taskId, el) {
    event.stopPropagation();
    const existing = document.getElementById('date-picker-inline');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'date-picker-inline';
    picker.className = 'inline-picker';
    picker.innerHTML = `<input type="date" class="inline-date-input" value="${el.dataset?.due || ''}">`;

    const rect = el.getBoundingClientRect();
    picker.style.top = (rect.bottom + window.scrollY) + 'px';
    picker.style.left = rect.left + 'px';
    document.body.appendChild(picker);

    const input = picker.querySelector('input');
    setTimeout(() => {
        input.focus();
        try { input.showPicker(); } catch(e) {}
    }, 50);

    input.addEventListener('change', () => {
        fetch('/tasks/update_due_date/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ task_id: taskId, due_date: input.value })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const [y, m, d] = input.value.split('-');
                el.textContent = `${d}.${m}.${y}`;
                el.dataset.due = input.value;
                picker.remove();
                showToast('Due date updated');
            }
        });
    });
}

function openAssigneePicker(event, taskId, el) {
    event.stopPropagation();
    const existing = document.getElementById('assignee-picker');
    if (existing) existing.remove();

    fetch('/users/list/')
        .then(res => res.json())
        .then(users => {
            const picker = document.createElement('div');
            picker.id = 'assignee-picker';
            picker.className = 'inline-picker';
            picker.innerHTML = `
                <div class="inline-picker-item" onclick="setTaskAssignee('${taskId}', '', '—', this.closest('#assignee-picker'))">— Unassigned</div>
                ${users.map(u => `
                    <div class="inline-picker-item" onclick="setTaskAssignee('${taskId}', '${u.id}', '${u.username}', this.closest('#assignee-picker'))">👤 ${u.username}</div>
                `).join('')}
            `;
            const rect = el.getBoundingClientRect();
            picker.style.top = (rect.bottom + window.scrollY) + 'px';
            picker.style.left = rect.left + 'px';
            document.body.appendChild(picker);
        });
}

function setTaskAssignee(taskId, userId, username, picker) {
    fetch('/tasks/update_assignee/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: taskId, assignee_id: userId || null })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
            if (row) {
                const td = row.querySelectorAll('.task-td.task-muted')[0];
                if (td) td.textContent = userId ? '👤 ' + username : '—';
            }
            picker?.remove();
            showToast('Assignee updated');
        }
    });
}

document.addEventListener('click', () => {
    document.getElementById('status-picker')?.remove();
    document.getElementById('date-picker-inline')?.remove();
    document.getElementById('assignee-picker')?.remove();
    document.getElementById('move-task-popup')?.remove();
    document.getElementById('priority-picker')?.remove();
});

function openPriorityPicker(event, taskId, el) {
    event.stopPropagation();
    const existing = document.getElementById('priority-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'priority-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `
        <div class="inline-picker-item" onclick="setTaskPriority('${taskId}', 'low', this.closest('#priority-picker'))">⚐ Low</div>
        <div class="inline-picker-item" onclick="setTaskPriority('${taskId}', 'high', this.closest('#priority-picker'))">⚑ High</div>
    `;

    const rect = el.getBoundingClientRect();
    picker.style.position = 'absolute';
    picker.style.top = (rect.bottom + window.scrollY) + 'px';
    picker.style.left = rect.left + 'px';
    document.body.appendChild(picker);
}

function setTaskPriority(taskId, priority, picker) {
    fetch('/tasks/update_priority/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ task_id: taskId, priority })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
            if (row) {
                const span = row.querySelector('.task-priority-inline');
                span.className = `task-priority-inline priority-${priority}`;
                span.textContent = `${priority === 'high' ? '⚑' : '⚐'}`;
            }
            picker?.remove();
            showToast('Priority updated');
        }
    });
}



window.openTaskMenu = openTaskMenu;
window.refreshProjectPageIfOpen = refreshProjectPageIfOpen;