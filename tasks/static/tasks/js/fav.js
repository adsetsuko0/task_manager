document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nav-favourites').addEventListener('click', () => {
        renderFavouritesPage();
    });
});

function renderFavouritesPage() {
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

            <div class="group-info-card">
                <div class="group-info-top">
                    <div class="group-info-left">
                        <span class="group-info-arrow" id="fav-page-arrow">▼</span>
                        <span class="group-info-name">Favourites</span>
                    </div>
                    <div class="group-info-right">
                        <span id="fav-page-count"></span>
                    </div>
                </div>

                <div class="group-info-body" id="fav-page-body">
                    <div class="group-page-projects board-view" id="fav-page-projects">
                        <div class="fav-page-loading">Loading...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // collapse
    const arrow = content.querySelector('#fav-page-arrow');
    const body = content.querySelector('#fav-page-body');
    arrow.addEventListener('click', () => {
        body.classList.toggle('collapsed');
        arrow.textContent = body.classList.contains('collapsed') ? '▶' : '▼';
    });

    // view switch
    const viewBtns = content.querySelectorAll('.view-btn');
    const projectsGrid = content.querySelector('#fav-page-projects');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            projectsGrid.classList.remove('board-view', 'list-view');
            projectsGrid.classList.add(view + '-view');
        });
    });

    // загружаем избранные проекты
    loadFavouriteProjects();
}

function loadFavouriteProjects() {
    fetch('/projects/favourites/')
        .then(res => res.json())
        .then(projects => {
            const grid = document.getElementById('fav-page-projects');
            const countEl = document.getElementById('fav-page-count');
            if (!grid) return;

            countEl.textContent = `${projects.length} projects`;

            if (projects.length === 0) {
                grid.innerHTML = `<div class="fav-page-empty">No favourite projects yet</div>`;
                return;
            }

            grid.innerHTML = projects.map(project => `
                <div class="group-page-project-card" data-project-id="${project.id}">
                    <div class="group-page-project-top">
                        <img src="/static/tasks/icons/list_night.png" class="group-page-title-icon" alt="project-icon">
                        <span class="group-page-project-name">${project.name}</span>
                        <span class="project-group-dot">• ${project.group_name}</span>
                    </div>
                    <button class="group-page-project-menu-btn" onclick="openProjectMenu(event, '${project.id}', '${project.name}')">⋯</button>
                    <div class="group-page-project-img" id="fav-card-img-${project.id}">
                        <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                        <span class="card-subtitle">No tasks added</span>
                    </div>
                    <span class="group-page-project-fav" onclick="toggleFavourite(this, '${project.id}')">♥︎</span>
                </div>
            `).join('');

            // загружаем таски для каждой карточки
            projects.forEach(project => {
                fetch(`/projects/${project.id}/tasks/`)
                    .then(res => res.json())
                    .then(tasks => {
                        const img = document.getElementById(`fav-card-img-${project.id}`);
                        if (!img) return;
                        if (tasks.length === 0) {
                            img.innerHTML = `
                                <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                                <span class="card-subtitle">No tasks added</span>
                            `;
                        } else {
                            img.innerHTML = `
                                <div class="card-tasks-preview">
                                    ${tasks.slice(0, 3).map(task => `
                                        <div class="card-task-item status-${task.status}">
                                            <span class="card-task-name">${task.title}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }
                    });
            });

            // клик по карточке
            const cards = grid.querySelectorAll('.group-page-project-card');
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.group-page-project-menu-btn')) return;
                    if (e.target.closest('.group-page-project-fav')) return;

                    const projectId = card.dataset.projectId;
                    const projectEl = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
                    if (!projectEl) return;

                    const isActive = card.classList.contains('active');
                    if (!isActive) {
                        cards.forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        return;
                    }

                    renderProjectPage(projectEl);
                });
            });
        });
}

window.renderFavouritesPage = renderFavouritesPage;
window.loadFavouriteProjects = loadFavouriteProjects;