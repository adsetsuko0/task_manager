function renderProjectPage(projectEl) {
    const projectName= projectEl.querySelector('.project-name').textContent;
    const projectId= projectEl.dataset.projectId;
    const groupEl=projectEl.closest('.spaces-group');
    const groupName=groupEl ? groupEl.querySelector('.group-name').textContent : null;

    updatePageTitle(projectName);

    const contentEl=document.querySelector('.content');
    contentEl.innerHTML=`
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

            <div class="project-info-card">
                <div class="project-info-top">
                    <div class="project-info-left">
                        <span class="project-info-name">${projectName}</span>
                        <span class="project-info-group">• ${groupName}</span>
                    </div>
                    <div class="project-info-right">
                        <button class="project-add-task-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
                    </div>
                </div>

                <div class="project-info-body" id="project-info-body">
                    <div class="project-tasks-container" id="project-tasks-container">
                        <div class="project-tasks-loading">Loading tasks...</div>
                    </div>
                </div>
            </div>

        </div>
    `;

    loadProjectTasks(projectId);

    const viewBtns=contentEl.querySelectorAll('.view-btn');
    const tasksContainer=contentEl.querySelector('.project-tasks-container');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view=btn.dataset.view;
            tasksContainer.classList.remove('board-view', 'list-view');
            tasksContainer.classList.add(view + '-view');
        });
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
    const container = document.getElementById('project-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="project-tasks-empty">
                <img src="/static/tasks/icons/doc_light.png" class="card-icon" style="opacity:0.4">
                <span>No tasks yet</span>
                <button class="project-add-task-btn" onclick="openCreateTaskModal('${projectId}')">+ Add task</button>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="project-task-card" data-task-id="${task.id}">
            <div class="project-task-top">
                <span class="project-task-status status-${task.status}">${task.status}</span>
                <button class="project-task-menu-btn" onclick="openTaskMenu(event, '${task.id}')">⋯</button>
            </div>
            <div class="project-task-title">${task.title}</div>
            <div class="project-task-bottom">
                <span class="project-task-assignee">${task.assignee || 'Unassigned'}</span>
            </div>
        </div>
    `).join('');
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

window.refreshProjectPageIfOpen = refreshProjectPageIfOpen;