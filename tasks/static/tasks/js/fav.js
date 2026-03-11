document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nav-favourites').addEventListener('click', () => {
        renderFavouritesPage();
    });
});

function renderFavouritesPage() {
    saveAppState('favourites', null);    
    updatePageTitle('Favourites');

    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="group-page" id="favourites-page">
            <div class="view-switch group-view-switch">
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

            <div class="filter-wrapper" style="margin-bottom: 12px;">
                <button class="filter-btn" id="fav-filter-btn">
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
                <div class="filter-dropdown" id="fav-filter-dropdown" style="display:none">
                    <div class="filter-dropdown-header"><span>Filters</span></div>
                    <div class="filter-dropdown-body">
                        <div class="filter-option" data-filter="name-asc"><span class="filter-icon">↑</span> Name (A-Z)</div>
                        <div class="filter-option" data-filter="name-desc"><span class="filter-icon">↓</span> Name (Z-A)</div>
                    </div>
                </div>
            </div>

            <div id="fav-page-projects" class="fav-projects-list">
                <div class="project-tasks-loading">Loading...</div>
            </div>
        </div>
    `;

    // view switch
    const viewBtns = content.querySelectorAll('.view-btn');
    const projectsList = content.querySelector('#fav-page-projects');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            projectsList.dataset.view = view;
            renderFavProjectsInView(view);
        });
    });

    // filter
    const filterBtn = content.querySelector('#fav-filter-btn');
    const filterDropdown = content.querySelector('#fav-filter-dropdown');
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.style.display = filterDropdown.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
        if (filterDropdown) filterDropdown.style.display = 'none';
    });

    content.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', () => {
            content.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            filterBtn.classList.add('filter-active');
            filterDropdown.style.display = 'none';

            const cards = content.querySelectorAll('.project-info-card[data-project-id]');
            const arr = Array.from(cards);
            arr.sort((a, b) => {
                const nameA = a.querySelector('.project-info-name')?.textContent || '';
                const nameB = b.querySelector('.project-info-name')?.textContent || '';
                return option.dataset.filter === 'name-asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            });
            arr.forEach(card => projectsList.appendChild(card));
        });
    });

    loadFavouriteProjects().then(() => {
    renderFavProjectsInView('board');
});
}

window._favProjects = [];

function renderFavProjectsInView(view) {
    const projects = window._favProjects;
    const grid = document.getElementById('fav-page-projects');
    if (!grid || !projects.length) return;

    if (view === 'board') {
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grid.style.gap = '16px';
        grid.style.alignItems = 'start';
    } else {
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.gap = '16px';
        grid.style.gridTemplateColumns = '';
    }
}




function loadFavouriteProjects() {
    return fetch('/projects/favourites/')
        .then(res => res.json())
        .then(projects => {
            window._favProjects = projects;
            const grid = document.getElementById('fav-page-projects');
            if (!grid) return;

            if (projects.length === 0) {
                grid.innerHTML = `<div class="fav-page-empty">No favourite projects yet</div>`;
                return;
            }

            grid.innerHTML = projects.map(project => `
                <div class="project-info-card" data-project-id="${project.id}" style="min-width:0;overflow:hidden">
                    <div class="project-info-top">
                        <div class="project-info-left">
                            <span class="project-info-arrow" id="fav-arrow-${project.id}">▼</span>
                            <span class="project-info-name">${project.name}</span>
                            <span class="project-info-group">• ${project.group_name}</span>
                            <button class="project-info-menu-btn" onclick="openProjectMenu(event, '${project.id}', '${project.name}')">⋯</button>
                        </div>
                        <div class="project-info-right">
                            <span class="project-info-fav" data-project-id="${project.id}" onclick="toggleFavourite(this, '${project.id}')">♥︎</span>
                            <button class="project-add-task-btn" onclick="openCreateTaskModal('${project.id}')">+ Add task</button>
                        </div>
                    </div>
                    <div class="project-info-subtitle">
                        <span class="project-info-groupby-label">Group by: <span>None</span></span>
                    </div>
                    <div class="project-info-body" id="fav-body-${project.id}">
                        <div class="project-tasks-container" id="fav-tasks-${project.id}">
                            <div class="project-tasks-loading">Loading tasks...</div>
                        </div>
                    </div>
                </div>
            `).join('');

            // collapse для каждого
            projects.forEach(project => {
                const arrow = document.getElementById(`fav-arrow-${project.id}`);
                const body = document.getElementById(`fav-body-${project.id}`);
                arrow.addEventListener('click', () => {
                    body.classList.toggle('collapsed');
                    arrow.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
                });

                // загружаем таски
                fetch(`/projects/${project.id}/tasks/`)
                    .then(res => res.json())
                    .then(tasks => {
                        const container = document.getElementById(`fav-tasks-${project.id}`);
                        if (!container) return;

                        if (tasks.length === 0) {
                            container.innerHTML = `<button class="tasks-add-btn" onclick="openCreateTaskModal('${project.id}')">+ Add task</button>`;
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
                                    ${tasks.map(task => taskRowHTML(task, project.id)).join('')}
                                </tbody>
                            </table>
                            <button class="tasks-add-btn" onclick="openCreateTaskModal('${project.id}')">+ Add task</button>
                        `;
                    });
            });
        });
}



window.renderFavouritesPage = renderFavouritesPage;
window.loadFavouriteProjects = loadFavouriteProjects;