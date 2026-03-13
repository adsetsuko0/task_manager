let currentProjectTasks = [];
let currentTaskId = null;

let selectedTaskIds = new Set();

function toggleSelectTask(el, taskId) {
    const isSelected = el.classList.contains('selected');
    if (isSelected) {
        el.classList.remove('selected');
        selectedTaskIds.delete(taskId);
    } else {
        el.classList.add('selected');
        selectedTaskIds.add(taskId);
    }
    updateSelectAll();
    updateBulkBar();
}

function toggleSelectAll(el) {
    const circles = document.querySelectorAll('.task-select-circle');
    const allSelected = el.classList.contains('selected');
    if (allSelected) {
        el.classList.remove('selected');
        circles.forEach(c => {
            c.classList.remove('selected');
            selectedTaskIds.delete(c.closest('.task-row').dataset.taskId);
        });
    } else {
        el.classList.add('selected');
        circles.forEach(c => {
            c.classList.add('selected');
            selectedTaskIds.add(c.closest('.task-row').dataset.taskId);
        });
    }
    updateBulkBar();
}

function toggleStatusDropdown(event) {
    event.stopPropagation();
    const opts = document.getElementById('statusSelectOptions');
    if (!opts) return;
    opts.style.display = opts.style.display === 'none' ? 'block' : 'none';
    
}


function updateBulkBar() {
    const bar = document.getElementById('task-bulk-bar');
    const count = selectedTaskIds.size;
    if (count > 0) {
        bar.style.display = 'flex';
        document.getElementById('bulk-bar-count').textContent = `${count} Task${count > 1 ? 's' : ''} selected`;
    } else {
        bar.style.display = 'none';
    }
}


function clearSelection() {
    selectedTaskIds.clear();
    document.querySelectorAll('.task-select-circle.selected').forEach(c => c.classList.remove('selected'));
    const selectAll = document.querySelector('.task-select-all');
    if (selectAll) selectAll.classList.remove('selected');
    updateBulkBar();
}


function bulkDelete() {
    const count = selectedTaskIds.size;
    document.getElementById('bulk-delete-modal-text').textContent = 
        `Are you sure you want to delete ${count} task${count > 1 ? 's' : ''}?`;
    document.getElementById('bulkDeleteModal').style.display = 'flex';
    document.getElementById('task-bulk-bar').style.display = 'none';
}

function pickStatus(value) {
    const svgMap = {
        todo: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#888" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`,
        in_progress: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#bea54a" stroke-width="1.5"/><path d="M7 4v3l2 2" stroke="#bea54a" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        done: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#2f9e44" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="#2f9e44" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    };
    const labelMap = { todo: 'TO DO', in_progress: 'IN PROGRESS', done: 'DONE' };
    document.getElementById('statusSelectSelected').innerHTML = `${svgMap[value]} <span>${labelMap[value]}</span>`;
    document.getElementById('createTaskStatus').value = value;
    document.getElementById('statusSelectOptions').style.display = 'none';
}

window.toggleStatusDropdown = toggleStatusDropdown;
window.pickStatus = pickStatus;



// закрывать при клике вне
document.addEventListener('click', () => {
    const opts = document.getElementById('customStatusOptions');
    if (opts) opts.style.display = 'none';
});

window.toggleStatusDropdown = toggleStatusDropdown;
window.pickStatus = pickStatus;



function confirmBulkDelete() {
    const ids = Array.from(selectedTaskIds);
    Promise.all(ids.map(id =>
        fetch('/tasks/delete/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ task_id: id })
        })
    )).then(() => {
        ids.forEach(id => {
            document.querySelector(`.task-row[data-task-id="${id}"]`)?.remove();
        });
        document.getElementById('bulkDeleteModal').style.display = 'none';
        clearSelection();
        showToast('Tasks deleted');
        const projectId = document.querySelector('.project-page')?.dataset.projectId;
        if (projectId) refreshProjectCardImg(projectId).then(() => {});    });
}

window.confirmBulkDelete = confirmBulkDelete;


function selectTaskStatus(el) {
    document.querySelectorAll('.custom-status-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('createTaskStatus').value = el.dataset.value;
}
window.selectTaskStatus = selectTaskStatus;


function bulkChangeStatus(event) {
    event.stopPropagation();
    console.log('bulkChangeStatus called', event);

    const existing = document.getElementById('bulk-status-picker');
    if (existing) { existing.remove(); return; }

    const btn = document.querySelector('.bulk-bar-btn');
    const picker = document.createElement('div');
    picker.id = 'bulk-status-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `
        <div class="inline-picker-item" onclick="bulkSetStatus('todo')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:8px;vertical-align:middle;color:#888">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
            </svg>TO DO
        </div>
        <div class="inline-picker-item" onclick="bulkSetStatus('in_progress')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:8px;vertical-align:middle;color:#bea54a">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>IN PROGRESS
        </div>
        <div class="inline-picker-item" onclick="bulkSetStatus('done')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:8px;vertical-align:middle;color:#2f9e44">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>DONE
        </div>
    `;
    console.log('picker created', picker);
    positionBulkPicker(picker, event);
    console.log('picker in DOM?', document.getElementById('bulk-status-picker'));
}

function bulkChangeAssignee(event) {
    event.stopPropagation();
    const existing = document.getElementById('bulk-assignee-picker');
    if (existing) { existing.remove(); return; }

    fetch('/users/list/')
        .then(res => res.json())
        .then(users => {
            const picker = document.createElement('div');
            picker.id = 'bulk-assignee-picker';
            picker.className = 'inline-picker';
            picker.innerHTML = `
                <div class="inline-picker-item" onclick="bulkSetAssignee('', '—')">— Unassigned</div>
                ${users.map(u => `
                    <div class="inline-picker-item" onclick="bulkSetAssignee('${u.id}', '${u.username}')">👤 ${u.username}</div>
                `).join('')}
            `;
            positionBulkPicker(picker, event);
        });
}

function bulkChangeDates(event) {
    event.stopPropagation();
    const existing = document.getElementById('bulk-date-picker');
    if (existing) { existing.remove(); return; }

    const picker = document.createElement('div');
    picker.id = 'bulk-date-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `<input type="date" class="inline-date-input">`;
    positionBulkPicker(picker, event);

    const input = picker.querySelector('input');
    setTimeout(() => { input.focus(); try { input.showPicker(); } catch(e) {} }, 50);

    input.addEventListener('change', () => {
        const ids = Array.from(selectedTaskIds);
        Promise.all(ids.map(id =>
            fetch('/tasks/update_due_date/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
                body: JSON.stringify({ task_id: id, due_date: input.value })
            })
        )).then(() => {
            const [y, m, d] = input.value.split('-');
            ids.forEach(id => {
                const row = document.querySelector(`.task-row[data-task-id="${id}"]`);
                if (row) {
                    const td = row.querySelectorAll('.task-td.task-muted')[1];
                    if (td) td.textContent = `${d}.${m}.${y}`;
                }
            });
            picker.remove();
            showToast('Dates updated');
        });
    });
}

function bulkMoveTo(event) {
    event.stopPropagation();
    console.log('bulkMoveTo called', event);
    const existing = document.getElementById('bulk-move-picker');
    if (existing) { existing.remove(); return; }

    const picker = document.createElement('div');
    picker.id = 'bulk-move-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `
        <div class="move-task-popup-title">Move to project</div>
        ${Array.from(document.querySelectorAll('.project-item')).map(el => `
            <div class="inline-picker-item" onclick="bulkMoveToProject('${el.dataset.projectId}')">
                ${el.querySelector('.project-name').textContent}
            </div>
        `).join('')}
    `;
    positionBulkPicker(picker, event);
}

function positionBulkPicker(picker, e) {
    console.log('positionBulkPicker called', event);
    picker.style.position = 'fixed';
    picker.style.visibility = 'hidden';

    document.body.appendChild(picker);

    const pickerHeight = picker.offsetHeight || 150;
    const pickerWidth = picker.offsetWidth || 160;

    const bar = document.getElementById('task-bulk-bar');
    const barRect = bar.getBoundingClientRect();

    let top = barRect.top - pickerHeight - 8;
    let left = e?.clientX ? e.clientX - pickerWidth / 2 : barRect.left + barRect.width / 2 - pickerWidth / 2;

    if (left < 8) left = 8;
    if (left + pickerWidth > window.innerWidth - 8) left = window.innerWidth - pickerWidth - 8;
    if (top < 8) top = barRect.bottom + 8;

    picker.style.top = top + 'px';
    picker.style.left = left + 'px';
    picker.style.visibility = 'visible';
}




function bulkSetStatus(status) {
    const ids = Array.from(selectedTaskIds);
    Promise.all(ids.map(id =>
        fetch('/tasks/update_status/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ task_id: id, status })
        })
    )).then(() => {
        ids.forEach(id => {
            const row = document.querySelector(`.task-row[data-task-id="${id}"]`);
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
                badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">${svgMap[status]}</svg> ${labelMap[status]}`;
            }
        });
        document.getElementById('bulk-status-picker')?.remove();
        showToast('Status updated');
    });
}



function bulkSetAssignee(userId, username) {
    const ids = Array.from(selectedTaskIds);
    Promise.all(ids.map(id =>
        fetch('/tasks/update_assignee/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ task_id: id, assignee_id: userId || null })
        })
    )).then(() => {
        ids.forEach(id => {
            const row = document.querySelector(`.task-row[data-task-id="${id}"]`);
            if (row) {
                const td = row.querySelectorAll('.task-td.task-muted')[0];
                if (td) td.textContent = userId ? '👤 ' + username : '—';
            }
        });
        document.getElementById('bulk-assignee-picker')?.remove();
        showToast('Assignee updated');
    });
}


function bulkMoveToProject(projectId) {
    const ids = Array.from(selectedTaskIds);
    Promise.all(ids.map(id =>
        fetch('/tasks/move/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ task_id: id, project_id: projectId })
        })
    )).then(() => {
        ids.forEach(id => {
            document.querySelector(`.task-row[data-task-id="${id}"]`)?.remove();
        });
        document.getElementById('bulk-move-picker')?.remove();
        clearSelection();
        showToast('Tasks moved');
    });
}



window.clearSelection = clearSelection;
window.bulkDelete = bulkDelete;
window.bulkChangeStatus = bulkChangeStatus;
window.bulkSetStatus = bulkSetStatus;
window.bulkChangeAssignee = bulkChangeAssignee;
window.bulkSetAssignee = bulkSetAssignee;
window.bulkMoveTo = bulkMoveTo;
window.bulkMoveToProject = bulkMoveToProject;
window.bulkChangeDates = bulkChangeDates;


function updateSelectAll() {
    const circles = document.querySelectorAll('.task-select-circle');
    const allSelected = Array.from(circles).every(c => c.classList.contains('selected'));
    const selectAll = document.querySelector('.task-select-all');
    if (!selectAll) return;
    selectAll.classList.toggle('selected', allSelected);
    selectAll.textContent = allSelected ? '●' : '○';
}

window.toggleSelectTask = toggleSelectTask;
window.toggleSelectAll = toggleSelectAll;

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
                <div class="view-switcher">


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
            <option value="priority">Priority</option>
            <option value="assignee">Assignee</option>
        </select>
        <div id="groupby-value-select" class="groupby-select groupby-value-custom" style="display:none"></div>
    </div>
    <div class="groupby-dropdown-footer">
        <button class="groupby-apply-btn" onclick="applyGroupBy()">Group</button>
        <button class="groupby-reset-btn" onclick="resetGroupBy()">Reset</button>
    </div>
</div>

<button class="toolbar-btn" id="project-showdone-btn">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:2px">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Show done
</button>           </div>

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
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            const container = document.getElementById('project-tasks-container');
            if (container) {
                container.classList.remove('board-view', 'list-view');
                container.classList.add(view + '-view');
            }
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
            const tbody = document.getElementById('project-tasks-container').querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('.task-row'));

            rows.sort((a, b) => {
                const nameA = a.querySelector('.task-title-td')?.textContent.trim() || '';
                const nameB = b.querySelector('.task-title-td')?.textContent.trim() || '';
                const statusA = a.dataset.status || '';

                if (filter === 'name-asc') return nameA.localeCompare(nameB);
                if (filter === 'name-desc') return nameB.localeCompare(nameA);
                if (filter === 'status-todo') return statusA === 'todo' ? -1 : 1;
                if (filter === 'status-done') return statusA === 'done' ? -1 : 1;
                return 0;
            });

            rows.forEach(row => tbody.appendChild(row));
            filterDropdown.style.display = 'none';

            const pid = document.querySelector('.project-page')?.dataset.projectId;
            if (pid) initDragAndDrop(pid);
        });
    });

    // group by
    const groupByBtn = contentEl.querySelector('#project-groupby-btn');
    const groupByDropdown = contentEl.querySelector('#project-groupby-dropdown');
    const groupByFieldSelect = contentEl.querySelector('#groupby-field-select');

    groupByBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        groupByDropdown.style.display = groupByDropdown.style.display === 'none' ? 'block' : 'none';
    });

    groupByFieldSelect.addEventListener('change', () => {
        const field = groupByFieldSelect.value;
        const valueSelect = document.getElementById('groupby-value-select');

        if (field === 'none') {
            valueSelect.style.display = 'none';
            return;
        }

        if (field === 'status') {
            const opts = [
                { value: 'todo', svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#888" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`, label: 'TO DO' },
                { value: 'in_progress', svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#bea54a" stroke-width="1.5"/><path d="M7 4v3l2 2" stroke="#bea54a" stroke-width="1.5" stroke-linecap="round"/></svg>`, label: 'IN PROGRESS' },
                { value: 'done', svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#2f9e44" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="#2f9e44" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, label: 'DONE' },
            ];
            valueSelect.innerHTML = `
                <div class="groupby-custom-selected" onclick="toggleGroupByValueDropdown(event)">
                    <span id="groupby-custom-label">— All —</span>
                    <span style="color:#888;font-size:11px">▾</span>
                </div>
                <div class="groupby-custom-options" id="groupby-custom-options" style="display:none">
                    <div class="groupby-custom-opt" data-value="__all__" onclick="selectGroupByValue('__all__', '— All —', null)">— All —</div>
                    ${opts.map(o => `
                        <div class="groupby-custom-opt" data-value="${o.value}" onclick="selectGroupByValue('${o.value}', '${o.label}', this)">
                            ${o.svg} ${o.label}
                        </div>
                    `).join('')}
                </div>
            `;
            valueSelect.dataset.value = '__all__';
        } else if (field === 'priority') {
            valueSelect.innerHTML = `
                <div class="groupby-custom-selected" onclick="toggleGroupByValueDropdown(event)">
                    <span id="groupby-custom-label">— All —</span>
                    <span style="color:#888;font-size:11px">▾</span>
                </div>
                <div class="groupby-custom-options" id="groupby-custom-options" style="display:none">
                    <div class="groupby-custom-opt" data-value="__all__" onclick="selectGroupByValue('__all__', '— All —', null)">— All —</div>
                    <div class="groupby-custom-opt" data-value="low" onclick="selectGroupByValue('low', 'Low', this)">⚐ Low</div>
                    <div class="groupby-custom-opt" data-value="high" onclick="selectGroupByValue('high', 'High', this)">⚑ High</div>
                </div>
            `;
            valueSelect.dataset.value = '__all__';
        } else if (field === 'assignee') {
            const values = [...new Set(currentProjectTasks.map(t => t.assignee).filter(Boolean))];
            valueSelect.innerHTML = `
                <div class="groupby-custom-selected" onclick="toggleGroupByValueDropdown(event)">
                    <span id="groupby-custom-label">— All —</span>
                    <span style="color:#888;font-size:11px">▾</span>
                </div>
                <div class="groupby-custom-options" id="groupby-custom-options" style="display:none">
                    <div class="groupby-custom-opt" data-value="__all__" onclick="selectGroupByValue('__all__', '— All —', null)">— All —</div>
                    ${values.map(v => `
                        <div class="groupby-custom-opt" data-value="${v}" onclick="selectGroupByValue('${v}', '${v}', this)">👤 ${v}</div>
                    `).join('')}
                </div>
            `;
            valueSelect.dataset.value = '__all__';
        }

        valueSelect.style.display = 'block';
        groupByBtn.classList.add('active');
        document.getElementById('project-groupby-value').textContent = field;
    });

    // show done
    let showDone = false;
    const showDoneBtn = contentEl.querySelector('#project-showdone-btn');
    showDoneBtn.addEventListener('click', () => {
        showDone = !showDone;
        showDoneBtn.classList.toggle('active', showDone);
        const allRows = document.getElementById('project-tasks-container').querySelectorAll('.task-row');
        allRows.forEach(row => {
            if (showDone) {
                row.style.display = row.dataset.status === 'done' ? '' : 'none';
            } else {
                row.style.display = '';
            }
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



function toggleGroupByValueDropdown(event) {
    event.stopPropagation();
    const opts = document.getElementById('groupby-custom-options');
    if (opts) opts.style.display = opts.style.display === 'none' ? 'block' : 'none';
}

function selectGroupByValue(value, label, el) {
    document.getElementById('groupby-custom-label').textContent = label;
    document.getElementById('groupby-value-select').dataset.value = value;
    document.getElementById('groupby-custom-options').style.display = 'none';
}

window.toggleGroupByValueDropdown = toggleGroupByValueDropdown;
window.selectGroupByValue = selectGroupByValue;



function loadProjectTasks(projectId) {

    fetch(`/projects/${projectId}/tasks/`)
        .then(res => res.json())
        .then(tasks => {
            renderProjectTasks(tasks, projectId);
        })
        .catch(err => console.error('Error loading tasks', err));
}


function renderProjectTasks(tasks, projectId) {
    console.log('tasks from server:', tasks);
    currentProjectTasks = tasks;
    const container = document.getElementById('project-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
    container.innerHTML = `
        <button class="tasks-add-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
    `;
    return;
}

    container.innerHTML = `
        <table class="tasks-table">
            <thead>
                <tr>
                    <th class="tasks-th" style="width:32px">
                        <span class="task-select-all" onclick="toggleSelectAll(this)"></span>
                    </th>
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
                       <td class="task-td" style="width:32px">
                        <span class="task-select-circle" onclick="toggleSelectTask(this, '${task.id}')"></span>
                    </td>
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
                        <td class="task-td task-title-td" ondblclick="inlineRenameTask(event, '${task.id}', this)">${task.title}</td>
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
                        <td class="task-td task-priority-td" data-priority="${task.priority}" style="cursor:pointer" onclick="openPriorityPicker(event, this.closest('.task-row').dataset.taskId, this.closest('.task-priority-td'))">
                            ${task.priority === 'high' ? `
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="task-priority-inline">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                    <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            ` : `
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="task-priority-inline">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            `}
                        </td>
                        <td class="task-td">
                            <button class="project-task-menu-btn" onclick="openTaskMenu(event, '${task.id}')">⋯</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <button class="tasks-add-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
    `;
    initDragAndDrop(projectId);
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

    if (!title) { showToast('Task name cannot be empty'); return; }
    if (!status) { showToast('Status is required'); return; }
    if (!priority) { showToast('Priority is required'); return; }
    if (!assignee) { showToast('Assignee is required'); return; }
    if (!dueDate) { showToast('Due date is required'); return; }

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
    refreshProjectCardImg(projectId).then(() => refreshProjectPageIfOpen());
    
    // обновляем только нужный контейнер в favourites
    const favContainer = document.getElementById(`fav-tasks-${projectId}`);
    if (favContainer) {
        fetch(`/projects/${projectId}/tasks/`)
            .then(res => res.json())
            .then(tasks => {
                favContainer.innerHTML = `
                    <table class="tasks-table">
                        <thead>
                            <tr>
                                <th class="tasks-th" style="width:32px"><span class="task-select-all" onclick="toggleSelectAll(this)"></span></th>
                                <th class="tasks-th">Status</th>
                                <th class="tasks-th">Name</th>
                                <th class="tasks-th">Assignee</th>
                                <th class="tasks-th">Due date</th>
                                <th class="tasks-th">Priority</th>
                                <th class="tasks-th"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasks.map(task => taskRowHTML(task, projectId)).join('')}
                        </tbody>
                    </table>
                    <button class="tasks-add-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
                `;
            });
    } else {
        refreshFavPageIfOpen();
    }
}
    });
}

function openTaskMenu(event, taskId) {
    event.stopPropagation();
    const row = event.target.closest('.task-row');
    currentTaskId = row ? row.dataset.taskId : taskId;

    const dropdown = document.getElementById('task-dropdown');
    const rect = event.target.getBoundingClientRect();
    
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    
    const dropdownWidth = 180;
    const dropdownHeight = 180;
    
    let top = rect.bottom + 4;
    let left = rect.left;
    
    if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 8;
    if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - 4;
    
    dropdown.style.top = top + 'px';
    dropdown.style.left = left + 'px';
}

document.addEventListener('click', () => {
    const dd = document.getElementById('task-dropdown');
    if (dd) dd.style.display = 'none';
});

function renameTask() {
    const row = document.querySelector(`.task-row[data-task-id="${currentTaskId}"]`);
    if (!row) return;
    const titleTd = row.querySelector('.task-title-td');
    const oldName = titleTd.textContent.trim();
    const realTaskId = row.dataset.taskId;

    titleTd.innerHTML = `<input class="task-inline-input" value="${oldName}" 
        onblur="submitRenameTask(this, '${realTaskId}')" 
        onkeydown="if(event.key==='Enter') this.blur()">`;
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
    document.getElementById('deleteTaskModal').style.display = 'flex';
    document.getElementById('task-dropdown').style.display = 'none';
}

function confirmDeleteTask() {
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
            document.getElementById('deleteTaskModal').style.display = 'none';
            showToast('Task deleted');
            const projectId = document.querySelector('.project-page')?.dataset.projectId;
            refreshProjectCardImg(projectId).then(() => {});
        }
    });
}

window.confirmDeleteTask = confirmDeleteTask;
window.deleteTask = deleteTask;



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
    document.getElementById('task-dropdown').style.display = 'none';

    const select = document.getElementById('moveTaskProjectSelect');
    select.innerHTML = '';
    document.querySelectorAll('.project-item').forEach(el => {
        const opt = document.createElement('option');
        opt.value = el.dataset.projectId;
        opt.textContent = el.querySelector('.project-name').textContent;
        select.appendChild(opt);
    });

    document.getElementById('moveTaskModal').style.display = 'flex';
}

function confirmMoveTask() {
    const projectId = document.getElementById('moveTaskProjectSelect').value;

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
            document.getElementById('moveTaskModal').style.display = 'none';
            showToast('Task moved');
        }
    });
}

window.confirmMoveTask = confirmMoveTask;
window.moveTaskTo = moveTaskTo;


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
    const row = el.closest('.task-row');
    const realTaskId = row ? row.dataset.taskId : taskId;

    const existing = document.getElementById('priority-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'priority-picker';
    picker.className = 'inline-picker';
    picker.innerHTML = `
        <div class="inline-picker-item" onclick="setTaskPriority('${realTaskId}', 'low', this.closest('#priority-picker'))">⚐ Low</div>
        <div class="inline-picker-item" onclick="setTaskPriority('${realTaskId}', 'high', this.closest('#priority-picker'))">⚑ High</div>
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
                const td = row.querySelector('.task-priority-td');
                if (td) {
                    td.dataset.priority = priority;
                    td.innerHTML = priority === 'high' ? `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="task-priority-inline">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                            <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    ` : `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="task-priority-inline">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    `;
                }
            }
            picker?.remove();
            showToast('Priority updated');
        }
    });
}

function applyGroupBy() {
    const field = document.getElementById('groupby-field-select').value;
    const valueEl = document.getElementById('groupby-value-select');
    const filterValue = valueEl?.dataset?.value || '__all__';
    const tbody = document.querySelector('#project-tasks-container tbody');

    if (!tbody || field === 'none') {
        resetGroupBy();
        return;
    }

    // всегда берём из currentProjectTasks — не из DOM
    const filteredTasks = currentProjectTasks.filter(task => {
        if (filterValue === '__all__') return true;
        const taskVal = task[field] || '—';
        return taskVal === filterValue;
    });

    // группируем
    const groups = {};
    filteredTasks.forEach(task => {
        const val = task[field] || '—';
        if (!groups[val]) groups[val] = [];
        groups[val].push(task);
    });

    // перерисовываем tbody
    const projectId = document.querySelector('.project-page')?.dataset.projectId;
    tbody.innerHTML = '';
Object.entries(groups).forEach(([val, groupTasks]) => {
    groupTasks.forEach(task => {
        const tempDiv = document.createElement('tbody');
        tempDiv.innerHTML = taskRowHTML(task, projectId);
        tbody.appendChild(tempDiv.firstElementChild);
    });
});

    const labelEl = document.getElementById('project-groupby-value');
labelEl.textContent = filterValue === '__all__' ? field : `${field}: ${filterValue}`;
labelEl.style.fontWeight = '700';
labelEl.style.textTransform = 'uppercase';
labelEl.style.letterSpacing = '0.05em';
labelEl.style.color = '#888';
labelEl.style.fontSize = '12px';
document.getElementById('project-groupby-btn').classList.add('active');
document.getElementById('project-groupby-dropdown').style.display = 'none';
    document.getElementById('project-groupby-btn').classList.add('active');
    document.getElementById('project-groupby-dropdown').style.display = 'none';
    initDragAndDrop(projectId);
}




function resetGroupBy() {
    const projectId = document.querySelector('.project-page')?.dataset.projectId;
    if (!projectId) return;

    const labelEl = document.getElementById('project-groupby-value');
    labelEl.textContent = 'None';
    labelEl.style = '';

    document.getElementById('groupby-field-select').value = 'none';
    document.getElementById('groupby-value-select').style.display = 'none';
    document.getElementById('project-groupby-value').textContent = filterValue === '__all__' ? field : `${field}: ${filterValue}`;    document.getElementById('project-groupby-btn').classList.remove('active');
    document.getElementById('project-groupby-dropdown').style.display = 'none';

    renderProjectTasks(currentProjectTasks, projectId);
}

function taskRowHTML(task, projectId) {
    return `
        <tr class="task-row" data-task-id="${task.id}" data-status="${task.status}" draggable="true">
            <td class="task-td" style="width:32px; position:relative">
                <span class="drag-handle">⠿</span>
                <span class="task-select-circle" onclick="toggleSelectTask(this, '${task.id}')"></span>
            </td>
            <td class="task-td">
                <span class="task-status-badge status-${task.status}" onclick="openStatusPicker(event, '${task.id}', this)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="task-status-icon">
                        ${task.status === 'todo' ? `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>` 
                        : task.status === 'in_progress' ? `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` 
                        : `<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`}
                    </svg>
                    ${task.status === 'todo' ? 'TO DO' : task.status === 'in_progress' ? 'IN PROGRESS' : 'DONE'}
                </span>
            </td>
           <td class="task-td task-title-td" ondblclick="inlineRenameTask(event, '${task.id}', this)">${task.title}</td>
            <td class="task-td task-muted" style="cursor:pointer" onclick="openAssigneePicker(event, '${task.id}', this)">
                ${task.assignee ? '👤 ' + task.assignee : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="assignee-add-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>`}
            </td>
            <td class="task-td task-muted" style="cursor:pointer" onclick="openDatePicker(event, '${task.id}', this)" data-due="${task.due_date || ''}">
                ${task.due_date ? task.due_date : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="date-add-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`}
            </td>
            <td class="task-td task-priority-td" data-priority="${task.priority}" style="cursor:pointer" onclick="openPriorityPicker(event, this.closest('.task-row').dataset.taskId, this.closest('.task-priority-td'))">
                ${task.priority === 'high' ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="task-priority-inline"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` 
                : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="task-priority-inline"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`}
            </td>
            <td class="task-td">
                <button class="project-task-menu-btn" onclick="openTaskMenu(event, '${task.id}')">⋯</button>
            </td>
        </tr>
    `;
}




document.addEventListener('click', (e) => {
    if (!e.target.closest('#project-groupby-dropdown') && !e.target.closest('#project-groupby-btn')) {
    const dd = document.getElementById('project-groupby-dropdown');
    if (dd) dd.style.display = 'none';
}
    if (!e.target.closest('#bulk-status-picker')) document.getElementById('bulk-status-picker')?.remove();
    if (!e.target.closest('#bulk-assignee-picker')) document.getElementById('bulk-assignee-picker')?.remove();
    if (!e.target.closest('#bulk-move-picker')) document.getElementById('bulk-move-picker')?.remove();
    if (!e.target.closest('#bulk-date-picker')) document.getElementById('bulk-date-picker')?.remove();
    if (!e.target.closest('#status-picker')) document.getElementById('status-picker')?.remove();
    if (!e.target.closest('#date-picker-inline')) document.getElementById('date-picker-inline')?.remove();
    if (!e.target.closest('#assignee-picker')) document.getElementById('assignee-picker')?.remove();
    if (!e.target.closest('#priority-picker')) document.getElementById('priority-picker')?.remove();
    if (!e.target.closest('#move-task-popup')) document.getElementById('move-task-popup')?.remove();
    if (!e.target.closest('#groupby-value-select')) {
    document.getElementById('groupby-custom-options')?.style && (document.getElementById('groupby-custom-options').style.display = 'none');}
    if (!e.target.closest('#statusSelectWrapper')) {document.getElementById('statusSelectOptions')?.style && (document.getElementById('statusSelectOptions').style.display = 'none');
}
});


document.addEventListener('click', function(e) {
    const card = e.target.closest('#recent .card, #fav .card');
    if (!card) return;

    const projectId = card.dataset.projectId;
    if (!projectId) return;

    const projectEl = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
    if (!projectEl) return;

    // активируем проект в сайдбаре
    document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
    projectEl.classList.add('active');

    // открываем страницу проекта
    renderProjectPage(projectEl);
});


function refreshProjectCardImg(projectId) {
    return fetch(`/projects/${projectId}/tasks/`)
        .then(res => res.json())
        .then(tasks => {
            const homeImg = document.getElementById(`home-card-img-${projectId}`);
            if (homeImg) {
                homeImg.innerHTML = tasks.length === 0 ? `
                    <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                    <span class="card-subtitle">No tasks added</span>
                ` : `
                    <div class="card-tasks-preview">
                        ${tasks.slice(0, 3).map(task => `
                            <div class="card-task-item status-${task.status}">
                                <span class="card-task-name">${task.title}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const groupImg = document.getElementById(`group-card-img-${projectId}`);
            if (groupImg) {
                groupImg.innerHTML = tasks.length === 0 ? `
                    <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                    <span class="card-subtitle">No tasks added</span>
                ` : `
                    <div class="card-tasks-preview">
                        ${tasks.slice(0, 3).map(task => `
                            <div class="card-task-item status-${task.status}">
                                <span class="card-task-name">${task.title}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // обновляем homeContent
            const parser = new DOMParser();
            const doc = parser.parseFromString(homeContent, 'text/html');
            const savedImg = doc.getElementById(`home-card-img-${projectId}`);
            if (savedImg) {
                savedImg.innerHTML = tasks.length === 0 ? `
                    <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                    <span class="card-subtitle">No tasks added</span>
                ` : `
                    <div class="card-tasks-preview">
                        ${tasks.slice(0, 3).map(task => `
                            <div class="card-task-item status-${task.status}">
                                <span class="card-task-name">${task.title}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                homeContent = doc.documentElement.innerHTML;
            }
        });
}



function initDragAndDrop(projectId) {
    const tbody = document.querySelector('.tasks-table tbody');
    if (!tbody) return;

    let draggedRow = null;

    tbody.querySelectorAll('.task-row').forEach(row => {
        row.setAttribute('draggable', false);
        const handle = row.querySelector('.drag-handle');
        if (!handle) return;

        handle.addEventListener('mousedown', () => {
            row.setAttribute('draggable', true);
        });

        handle.addEventListener('mouseup', () => {
            row.setAttribute('draggable', false);
        });
    });

    tbody.addEventListener('dragstart', (e) => {
        draggedRow = e.target.closest('.task-row');
        if (!draggedRow) return;
        draggedRow.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    tbody.addEventListener('dragend', () => {
        if (!draggedRow) return;
        draggedRow.classList.remove('dragging');
        draggedRow.setAttribute('draggable', false);
        document.querySelectorAll('.task-row.drag-over').forEach(r => r.classList.remove('drag-over'));

        const taskIds = Array.from(tbody.querySelectorAll('.task-row'))
            .map(r => r.dataset.taskId);

        fetch('/tasks/reorder/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ task_ids: taskIds })
        });

        draggedRow = null;
    });

    tbody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target.closest('.task-row');
        if (!target || target === draggedRow) return;

        const rect = target.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
            tbody.insertBefore(draggedRow, target);
        } else {
            tbody.insertBefore(draggedRow, target.nextSibling);
        }
    });
}


function inlineRenameTask(event, taskId, td) {
    if (td.querySelector('input')) return; // уже редактируется
    const oldName = td.textContent.trim();
    td.innerHTML = `<input class="task-inline-input" value="${oldName}" 
        onblur="submitRenameTask(this, '${taskId}')"
        onkeydown="if(event.key==='Enter') this.blur(); if(event.key==='Escape') { this.value='${oldName}'; this.blur(); }">`;
    const input = td.querySelector('input');
    input.focus();
    input.select();
}
window.inlineRenameTask = inlineRenameTask;



window.refreshProjectCardImg = refreshProjectCardImg;

window.applyGroupBy = applyGroupBy;
window.resetGroupBy = resetGroupBy;



window.openTaskMenu = openTaskMenu;
window.refreshProjectPageIfOpen = refreshProjectPageIfOpen;