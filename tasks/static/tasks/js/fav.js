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

            <div class="filter-wrapper" style="margin-bottom: 5px;">
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
        <div class="filter-option" data-filter="date-new"><span class="filter-icon">📅</span> Date (Newest)</div>
        <div class="filter-option" data-filter="date-old"><span class="filter-icon">📅</span> Date (Oldest)</div>
        <div class="filter-option" data-filter="tasks-more"><span class="filter-icon">↑</span> More tasks first</div>
        <div class="filter-option" data-filter="tasks-less"><span class="filter-icon">↓</span> Less tasks first</div>
    </div>
</div>
                </div>
            </div>

            <div id="fav-page-projects">
                <div class="project-tasks-loading">Loading...</div>
            </div>
        </div>
    `;

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

    // view switch
    const viewBtns = content.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFavProjectsInView(btn.dataset.view);
        });
    });

    loadFavouriteProjects().then(() => {
        renderFavProjectsInView('board');

        // filter logic — после загрузки проектов
        content.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', () => {
        content.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        filterBtn.classList.add('filter-active');
        filterDropdown.style.display = 'none';

        const wrapper = document.getElementById('fav-body-inner');
        if (!wrapper) return;
        const cards = Array.from(wrapper.querySelectorAll('.project-info-card'));

       cards.sort((a, b) => {
    const nameA = a.querySelector('.project-info-name')?.textContent || '';
    const nameB = b.querySelector('.project-info-name')?.textContent || '';
    const filter = option.dataset.filter;

    if (filter === 'name-asc') return nameA.localeCompare(nameB);
    if (filter === 'name-desc') return nameB.localeCompare(nameA);

    if (filter === 'date-new' || filter === 'date-old') {
        const dateA = a.querySelector('[data-due]')?.dataset.due || '';
        const dateB = b.querySelector('[data-due]')?.dataset.due || '';
        return filter === 'date-new'
            ? dateB.localeCompare(dateA)
            : dateA.localeCompare(dateB);
    }

    if (filter === 'tasks-more' || filter === 'tasks-less') {
        const countA = a.querySelectorAll('.task-row').length;
        const countB = b.querySelectorAll('.task-row').length;
        return filter === 'tasks-more' ? countB - countA : countA - countB;
    }

    return 0;
});
        cards.forEach(card => wrapper.appendChild(card));
        
        const activeView = document.querySelector('.view-btn.active')?.dataset.view || 'board';
        renderFavProjectsInView(activeView);
    });
});
    });
}

window._favProjects = [];

function renderFavProjectsInView(view) {
    const wrapper = document.getElementById('fav-body-inner');
    if (!wrapper) return;

    if (view === 'board') {
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = '1fr 1fr';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'start';
    } else {
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = '1fr';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'start';
    }

    // расставляем карточки по колонкам
    const cards = Array.from(wrapper.querySelectorAll('.project-info-card'));
    if (view === 'board') {
        cards.forEach((card, i) => {
            card.style.gridColumn = (i % 2 === 0) ? '1' : '2';
            card.style.alignSelf = 'start';
        });
    } else {
        cards.forEach(card => {
            card.style.gridColumn = '1';
            card.style.alignSelf = 'start';
        });
    }
}



function loadFavouriteProjects() {
    return fetch('/projects/favourites/')
        .then(res => res.json())
        .then(projects => {
            window._favProjects = projects;
            const container = document.getElementById('fav-page-projects');
            if (!container) return;

            if (projects.length === 0) {
                container.innerHTML = `<div class="fav-page-empty">No favourite projects yet</div>`;
                return;
            }

            container.innerHTML = `
                <div class="fav-section-header" style="margin-bottom: 0px;">
                    <span id="fav-section-arrow">▼</span>
                    <span class="fav-section-title">Favourites</span>
                    <span class="fav-section-count">${projects.length} projects</span>
                </div>
            `;

            const wrapper = document.createElement('div');
            wrapper.id = 'fav-body-inner';
            wrapper.style.overflow = 'visible';
            wrapper.style.transition = 'max-height 0.35s ease';
            container.appendChild(wrapper);

            wrapper.innerHTML = projects.map(project => `
                <div class="project-info-card" data-project-id="${project.id}">
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

            // применяем текущий вид СРАЗУ после рендера карточек
            const currentView = document.querySelector('.view-btn.active')?.dataset.view || 'board';
            renderFavProjectsInView(currentView);

            requestAnimationFrame(() => {
                wrapper.style.maxHeight = 'none';
            });

            // секция collapse
            const sectionArrow = document.getElementById('fav-section-arrow');
            document.querySelector('.fav-section-header').addEventListener('click', () => {
                const isCollapsed = wrapper.classList.contains('collapsed');
                if (isCollapsed) {
                    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                    wrapper.classList.remove('collapsed');
                    sectionArrow.textContent = '▼';
                    setTimeout(() => { wrapper.style.maxHeight = 'none'; }, 350);
                } else {
                    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                    sectionArrow.textContent = '▶';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        wrapper.style.maxHeight = '0';
                        wrapper.classList.add('collapsed');
                    }));
                }
            });

            // collapse + таски каждого проекта
            projects.forEach(project => {
                const arrow = document.getElementById(`fav-arrow-${project.id}`);
                const body = document.getElementById(`fav-body-${project.id}`);

                arrow.addEventListener('click', () => {
                    const isCollapsed = body.classList.contains('collapsed');
                    if (isCollapsed) {
                        body.style.maxHeight = body.scrollHeight + 'px';
                        body.classList.remove('collapsed');
                        arrow.textContent = '▼';
                        setTimeout(() => { body.style.maxHeight = 'none'; }, 350);
                    } else {
                        body.style.maxHeight = body.scrollHeight + 'px';
                        arrow.textContent = '▶';
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            body.style.maxHeight = '0';
                            body.classList.add('collapsed');
                        }));
                    }
                });

                fetch(`/projects/${project.id}/tasks/`)
                    .then(res => res.json())
                    .then(tasks => {
                        const taskContainer = document.getElementById(`fav-tasks-${project.id}`);
                        if (!taskContainer) return;

                        if (tasks.length === 0) {
                            taskContainer.innerHTML = `<button class="tasks-add-btn" onclick="openCreateTaskModal('${project.id}')">+ Add task</button>`;
                            return;
                        }

                        taskContainer.innerHTML = `
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

            // клики по карточкам — переход на страницу проекта
            projects.forEach(project => {
                const card = document.querySelector(`#fav-body-inner .project-info-card[data-project-id="${project.id}"]`);
                if (!card) return;

                card.addEventListener('click', (e) => {
                    if (e.target.closest('.project-info-menu-btn')) return;
                    if (e.target.closest('.project-info-fav')) return;
                    if (e.target.closest('.project-add-task-btn')) return;
                    if (e.target.closest('.task-row')) return;
                    if (e.target.closest('.tasks-add-btn')) return;
                    if (e.target.closest('.project-info-arrow')) return;
                    if (e.target.closest('.project-info-subtitle')) return;

                    const projectEl = document.querySelector(`.project-item[data-project-id="${project.id}"]`);
                    if (!projectEl) return;

                    document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
                    projectEl.classList.add('active');
                    renderProjectPage(projectEl);
                });
            });
        });
}



function refreshFavPageIfOpen() {
     if (!document.getElementById('favourites-page')) return;
    const activeBtn = document.querySelector('.view-btn.active');
    console.log('activeBtn:', activeBtn?.dataset.view, activeBtn);
    const currentView = activeBtn?.dataset.view || 'board';
    loadFavouriteProjects().then(() => renderFavProjectsInView(currentView));
}

window.refreshFavPageIfOpen = refreshFavPageIfOpen;

window.renderFavouritesPage = renderFavouritesPage;
window.loadFavouriteProjects = loadFavouriteProjects;