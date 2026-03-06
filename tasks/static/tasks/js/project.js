let currentProjectTasks = [];



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
                            <span class="task-status-badge status-${task.status}" onclick="cycleTaskStatus(this, '${task.id}')">
                                ${task.status === 'todo' ? '🔵 To Do' : task.status === 'in_progress' ? '🟡 In Progress' : '🟢 Done'}
                            </span>
                        </td>
                        <td class="task-td task-title-td">${task.title}</td>
                        <td class="task-td task-muted">${task.assignee ? '👤 ' + task.assignee : '—'}</td>
                        <td class="task-td task-muted">${task.due_date || '—'}</td>
                        <td class="task-td">
                            <span class="task-priority-badge priority-${task.priority}">
                                🏳 ${task.priority || '—'}
                            </span>
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
    document.getElementById('createTaskPriority').value = 'normal';
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
    document.getElementById('createTaskPriority').value = 'normal';
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







window.refreshProjectPageIfOpen = refreshProjectPageIfOpen;