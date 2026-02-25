let lastClearedGroup = null;
let clickCount = 0;



function updatePageTitle(newTitle) {
    const titleEl = document.querySelector(".page-title");
    if (titleEl) {
        titleEl.textContent = newTitle;
        console.log("Page title updated to:", newTitle);
    }
}

function renderGroupPage(groupEl) {
    const groupName = groupEl.querySelector('.group-name').textContent;
    const priority = Array.from(groupEl.querySelector('.group-title').classList)
        .find(c => c.startsWith('priority-'))?.replace('priority-', '') || 'normal';
    const limit = groupEl.querySelector('.limit-badge')?.textContent || '';
    const projectItems = groupEl.querySelectorAll('.project-item');

    updatePageTitle('Groups');

    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="group-page">

            <div class="view-switch">
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
                <button class="filter-btn" id="filter-btn">Filter</button>
                <div class="filter-dropdown" id="filter-dropdown" style="display:none">
                    <div class="filter-option" data-filter="name-asc">Name (A-Z)</div>
                    <div class="filter-option" data-filter="name-desc">Name (Z-A)</div>
                    <div class="filter-option" data-filter="date-new">Date (Newest)</div>
                    <div class="filter-option" data-filter="date-old">Date (Oldest)</div>
                    <div class="filter-option" data-filter="fav-first">Favourites first</div>
                    <div class="filter-option" data-filter="unfav-first">Non-favourites first</div>
                    <div class="filter-option" data-filter="tasks-more">More tasks first</div>
                    <div class="filter-option" data-filter="tasks-less">Less tasks first</div>
                    <div class="filter-option" data-filter="group">${groupName} first</div>
                </div>
            </div>

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
                                <span class="group-page-project-name">${name}</span>
                                <span class="group-page-project-fav">${isFav ? '♥︎' : '♡︎'}</span>
                            </div>
                            <div class="group-page-project-bottom">
                                <span class="group-page-project-group">${groupName}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

        </div>
    `;

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
            const cards = Array.from(projectsGrid.querySelectorAll('.group-page-project-card'));

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