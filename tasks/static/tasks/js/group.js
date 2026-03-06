let lastClearedGroup = null;
let clickCount = 0;



function updatePageTitle(newTitle) {
    const titleEl = document.querySelector(".sidebar-title");
    if (titleEl) {
        titleEl.textContent = newTitle;
        console.log("Page title updated to:", newTitle);
    }
}

function renderGroupPage(groupEl) {
    saveAppState('group', groupEl.dataset.groupId); 
       
    const groupName = groupEl.querySelector('.group-name').textContent;
    const priority = Array.from(groupEl.querySelector('.group-title').classList)
        .find(c => c.startsWith('priority-'))?.replace('priority-', '') || 'normal';
    const limit = groupEl.querySelector('.limit-badge')?.textContent || '';
    const projectItems = groupEl.querySelectorAll('.project-item');

    updatePageTitle('Groups');

    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="group-page">

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

            <div class="filter-wrapper">
                <button class="filter-btn" id="filter-btn">
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
                <div class="filter-dropdown" id="filter-dropdown" style="display:none">
    <div class="filter-dropdown-header">
        <span>Filters</span>
    </div>
    <div class="filter-dropdown-body">
        <div class="filter-option" data-filter="name-asc">
            <span class="filter-icon">↑</span> Name (A-Z)
        </div>
        <div class="filter-option" data-filter="name-desc">
            <span class="filter-icon">↓</span> Name (Z-A)
        </div>
        <div class="filter-option" data-filter="date-new">
            <span class="filter-icon">📅</span> Date (Newest)
        </div>
        <div class="filter-option" data-filter="date-old">
            <span class="filter-icon">📅</span> Date (Oldest)
        </div>
        <div class="filter-option" data-filter="fav-first">
            <span class="filter-icon">♥︎</span> Favourites first
        </div>
        <div class="filter-option" data-filter="unfav-first">
            <span class="filter-icon">♡︎</span> Non-favourites first
        </div>
        <div class="filter-option" data-filter="tasks-more">
            <span class="filter-icon">↑</span> More tasks first
        </div>
        <div class="filter-option" data-filter="tasks-less">
            <span class="filter-icon">↓</span> Less tasks first
        </div>
        <div class="filter-option" data-filter="group">
            <span class="filter-icon">⬡</span> ${groupName} first
        </div>
    </div>
    <div class="filter-dropdown-footer">
        <button class="filter-add-btn">+ Add filter</button>
    </div>
</div>
            </div>


             <div class="group-info-card">
            <div class="group-info-top">
                <div class="group-info-left">
                    <span class="group-info-arrow" id="group-info-arrow">▼</span>
                    <span class="group-info-name">${groupName}</span>
                    <button class="group-info-menu-btn" onclick="openGroupMenu(event, '${groupEl.dataset.groupId}')">⋯</button>
                    <span class="group-info-priority priority-badge-${priority}">${priority}</span>
                </div>
                <div class="group-info-right">
                    <span class="group-info-limit">Project limit: ${limit}</span>
                </div>
            </div>

            <div class="group-info-subtitle">
                    <span class="group-info-projects-count">${projectItems.length} projects</span>
            </div>

            <div class="group-info-body" id="group-info-body">
                <div class="group-page-projects board-view">
                    ${projectItems.length === 0 ? `
                        <div class="group-page-empty">No projects yet</div>
                    ` : Array.from(projectItems).map(item => {
                        const name = item.querySelector('.project-name')?.textContent || '';
                        const projectId = item.dataset.projectId;
                        const isFav = item.querySelector('.project-fav')?.textContent.includes('♥') || false;
                        return `
                                <div class="group-page-project-card" data-project-id="${projectId}">
                                <div class="group-page-project-top">
            <img src="/static/tasks/icons/list_night.png" class="group-page-title-icon" alt="project-icon">
            <span class="group-page-project-name">${name}</span>
            <span class="project-group-dot">• ${groupName}</span>
        </div>
        <button class="group-page-project-menu-btn" onclick="openProjectMenu(event, '${projectId}', '${name}')">⋯</button>
        <div class="group-page-project-img">
            <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
            <span class="card-subtitle">No tasks added</span>
        </div>
        <span class="group-page-project-fav" onclick="toggleFavourite(this, '${projectId}')">${isFav ? '♥︎' : '♡︎'}</span>
    </div>
`;
                    }).join('')}
                    <div class="group-page-add-card" onclick="openAddProjectFromGroup('${groupEl.dataset.groupId}')">
                            <span class="group-page-add-plus">+</span>
                            <span class="group-page-add-text">Add project</span>
</div>
                </div>
            </div>
        </div>

    </div>
`;


const arrow = content.querySelector('#group-info-arrow');
const body = content.querySelector('#group-info-body');

arrow.addEventListener('click', () => {
    const isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed');
    arrow.textContent = isCollapsed ? '▼' : '▶';
});

    // View switch
    const viewBtns = content.querySelectorAll('.view-btn');
    const projectsGrid = content.querySelector('.group-page-projects');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            projectsGrid.classList.remove('board-view', 'list-view');
            projectsGrid.classList.add(view + '-view');
        });
    });

    // Filter toggle
    const filterBtn = content.querySelector('#filter-btn');
    const filterDropdown = content.querySelector('#filter-dropdown');

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.style.display =
            filterDropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        if (filterDropdown) filterDropdown.style.display = 'none';
    });

    // Filter logic
    const filterOptions = content.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
        option.addEventListener('click', () => {
            filterOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            filterBtn.classList.add('filter-active');

            const filter = option.dataset.filter;
const projectCards = content.querySelectorAll('.group-page-project-card');
projectCards.forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.closest('.group-page-project-menu-btn')) return;
        if (e.target.closest('.group-page-project-fav')) return;

        const projectId = card.dataset.projectId;
        const projectEl = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
        if (!projectEl) return;

        const isActive = card.classList.contains('active');
        if (!isActive) {
            projectCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            return;
        }

        renderProjectPage(projectEl);
    });
});
            cards.sort((a, b) => {
                const nameA = a.querySelector('.group-page-project-name').textContent.trim();
                const nameB = b.querySelector('.group-page-project-name').textContent.trim();
                const favA = a.querySelector('.group-page-project-fav').textContent.includes('♥');
                const favB = b.querySelector('.group-page-project-fav').textContent.includes('♥');

                if (filter === 'name-asc') return nameA.localeCompare(nameB);
                if (filter === 'name-desc') return nameB.localeCompare(nameA);
                if (filter === 'fav-first') return favB - favA;
                if (filter === 'unfav-first') return favA - favB;
                return 0;
            });

            cards.forEach(card => projectsGrid.appendChild(card));
            filterDropdown.style.display = 'none';
        });
    });
}




document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('spaces-body').addEventListener('click', function(e) {
        console.log('group.js loaded');

        if (e.target.closest('.project-item')) return;


        const groupTitle = e.target.closest('.group-title');
        if (!groupTitle) return;

        if (e.target.closest('.group-menu-btn')) return;

        const groupEl = groupTitle.closest('.spaces-group');
        const projects = groupEl.querySelector('.projects');
        const isOpen = projects.classList.contains('open');

        if (!isOpen) {
            projects.style.display = 'block';
            projects.classList.add('open');
            return;
        }

        renderGroupPage(groupEl);
    });
});


function openAddProjectFromGroup(groupId) {
    document.getElementById('createProjectGroupId').value = groupId;
    document.getElementById('createProjectName').value = '';
    document.getElementById('createProjectLimit').value = 50;
    document.getElementById('createProjectModal').style.display = 'flex';
}
window.openAddProjectFromGroup = openAddProjectFromGroup;


function refreshGroupPageIfOpen() {
    const groupPage = document.querySelector('.group-page');
    if (!groupPage) return; // страница групп не открыта

    // находим активную группу в сайдбаре
    const activeGroup = document.querySelector('.spaces-group .group-title.active');
    if (!activeGroup) return;

    const groupEl = activeGroup.closest('.spaces-group');
    renderGroupPage(groupEl);
}

window.refreshGroupPageIfOpen = refreshGroupPageIfOpen;