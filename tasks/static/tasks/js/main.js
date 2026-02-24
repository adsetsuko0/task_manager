

let currentProjectId = null;
let currentGroupId = null;
let currentProjectName = null;

const dropdown = document.getElementById('group-dropdown');
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});



let viewButtons = document.querySelectorAll('.view-switch .view-btn');
const cardsContainer = document.querySelector('.content'); // или контейнер с карточками

viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Убираем active со всех кнопок
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Получаем выбранный вид
        const view = btn.dataset.view;

        // Находим все контейнеры с карточками
        const cardsSections = document.querySelectorAll('.cards');

        cardsSections.forEach(section => {
            section.classList.remove('board-view', 'list-view', 'calendar-view', 'table-view');

            if (view === 'board') section.classList.add('board-view');
            else if (view === 'list') section.classList.add('list-view');
            else if (view === 'calendar') section.classList.add('calendar-view');
           if (view === 'table') {
                section.classList.add('table-view');
                    renderTableView(section);
            } else {
                    restoreCards(section);
                section.classList.add(view + '-view');
            }

        });
        localStorage.setItem('selectedView', view);
    });
});



function limitCards(sectionId, maxCards = 3) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const cardsContainer = section.querySelector('.cards');
    const cards = Array.from(cardsContainer.children);

    // Скрываем все карточки
    cards.forEach(card => card.style.display = 'none');

    // Показываем только последние maxCards карточек (LIFO)
    const lastCards = cards.slice(-maxCards).reverse(); // переворачиваем для LIFO
    lastCards.forEach(card => card.style.display = 'block');
}

limitCards('recent', 3);
limitCards('fav', 3);


function updateCards(sectionId, maxCards = 3) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const cardsContainer = section.querySelector('.cards');
    const cards = Array.from(cardsContainer.children);

    // Удаляем карточки, которых больше нет в базе (или помечены удалёнными)
    cards.forEach(card => {
        const projectId = card.dataset.projectId;
        if (!document.querySelector(`.project-item[data-project-id="${projectId}"]`)) {
            card.remove();
        }
    });

    // Показываем только последние maxCards карточек LIFO
    const updatedCards = Array.from(cardsContainer.children);
    updatedCards.forEach((card, index) => {
        if (index >= updatedCards.length - maxCards) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}


function toggleSection(Id) {
    const section = document.getElementById(Id);
    if (section) {
        section.classList.toggle('collapsed');
    }
}




function toggleSpaces(event) {
    event.stopPropagation();

    const header = event.currentTarget; // .spaces-header
    const body = document.getElementById('spaces-body');
    const arrow = document.getElementById('spaces-arrow');

    // ❌ если ещё НЕ активен — НИЧЕГО не открываем
    if (!spacesActive) {
        header.classList.add('active');
        spacesActive = true;

        // гарантированно держим закрытым
        body.classList.add('hidden');
        arrow.textContent = '▶';
        return;
    }

    // ✅ только если уже активен — разрешаем раскрытие
    spacesExpanded = !spacesExpanded;

    if (spacesExpanded) {
        body.classList.remove('hidden');
        arrow.textContent = '▼';
    } else {
        body.classList.add('hidden');
        arrow.textContent = '▶';
    }
}

function handleSpacesClick(event) {
    event.stopPropagation();

    const nav = document.getElementById('spaces-nav');
    const body = document.getElementById('spaces-body');
    const arrow = document.getElementById('spaces-arrow');

    const isActive = nav.classList.contains('active');
    const isExpanded = !body.classList.contains('hidden');

    // 1️⃣ Первый клик — просто активируем
    if (!isActive) {
        document
            .querySelectorAll('.nav-item')
            .forEach(i => i.classList.remove('active'));

        nav.classList.add('active');

        body.classList.add('hidden');
        arrow.textContent = '▶';
        return;
    }

    // 2️⃣ Второй клик — раскрываем / закрываем
    if (isExpanded) {
        body.classList.add('hidden');
        arrow.textContent = '▶';
    } else {
        body.classList.remove('hidden');
        arrow.textContent = '▼';
    }
}







/*===========================GROUP============================*/
function addSpace(event) {
    event.stopPropagation();
    openCreateGroupModal();
}


/*==GROUP MODAL===*/

function openGroupModal() {
    document.getElementById('groupModal').style.display = 'flex';
}

function closeGroupModal() {
    const modal = document.getElementById('groupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openCreateGroupModal(event) {
    if (event) {
        event.stopPropagation();
    }

    const modal = document.getElementById('groupModal');

    if (!modal) {
        console.error('groupModal is not found');
        return;
    }

    document.getElementById('group-name').value = '';  // очищаем имя группы
    document.getElementById('group-priority').value = 'medium';  // сбрасываем приоритет на 'medium'
    document.getElementById('group-limit').value = ''; 

    modal.style.display = 'flex';
}


function closeRenameGroupModal() {
    document.getElementById('renameGroupModal').style.display = 'none';
}

/*===GROUPS===*/

function createGroup() {
    const nameInput = document.getElementById('group-name');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Group name is required');
        return;
    }

    fetch('/groups/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            name: name
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Group creation failed');
        }
        return res.json();
    })
    .then(data => {
        addGroupToSidebar(data);
        closeGroupModal();
        nameInput.value = '';
    })
    .catch(err => {
        alert(err.message);
    });
}


function submitGroup() {
    const name = document.getElementById('group-name').value;
    const priority = document.getElementById('group-priority').value;
    const limit = Number(document.getElementById('group-limit').value);

    if (!name) {
        showToast('Name is required!', 'error');
        return;
    }

    if (!priority) {
        showToast('Priority is required!', 'error');
        return;
    }

    if (!limit) {
        showToast('Limit is required!', 'error');
        return;
    }


    fetch('/groups/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({
            name,
            priority,
            limit
        })
    })
    .then(res => res.json())
    .then(group => {
        renderGroup(group);   // 👈 только тут рисуем
        closeGroupModal();
    });
}




function loadGroups() {
    return fetch('/groups/')
        .then(res => res.json())
        .then(groups => {
            const container = document.getElementById('spaces-body');
            container.innerHTML = ''; // очистка всех групп

            groups.forEach(group => {
                renderGroup(group);
            });
        })
        .catch(err => {
            console.error('Ошибка загрузки групп', err);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
});


function renderGroup(group) {
    const spacesBody = document.getElementById('spaces-body');
    const groupEl = document.createElement('div');

    groupEl.className = 'spaces-group';
    groupEl.dataset.groupId = group.id;

    groupEl.innerHTML = `
        <div class="group-title clickable priority-${group.priority}">
            <span class="group-name">${group.name}</span>
            <div class="group-actions">
                <span class="limit-badge">${group.limit}</span>
                <button class="group-menu-btn">⋯</button>
            </div>
        </div>
        <div class="projects" style="display:none"></div>
    `;

    spacesBody.appendChild(groupEl);

    const title = groupEl.querySelector('.group-title');
    const menuBtn = groupEl.querySelector('.group-menu-btn');

    title.addEventListener('click', () => activateGroup(title));
    title.addEventListener('click', toggleGroupProjects);

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        openGroupMenu(e, group.id);
    });

}

function renderProject(project) {
    const groupEl = document.querySelector(`.spaces-group[data-group-id="${project.group_id}"]`);
    if (!groupEl) {
        console.error('Group element not found for project rendering', project);
        return;
    }

    let projectContainer = groupEl.querySelector('.projects');
    if (!projectContainer) {
        projectContainer = document.createElement('div');
        projectContainer.className = 'projects';
        projectContainer.style.display = 'none';
        groupEl.appendChild(projectContainer);
    }

    const el = document.createElement('div');
    el.className = 'project-item';
    el.dataset.projectId = project.id;
    el.innerHTML = `
        <span class="project-name">${project.name}</span>
        <div class="project-actions">
            <button class="project-menu-btn" onclick="openProjectMenu(event, ${project.id}, '${project.name}')">⋯</button>
        </div>
    `;

    projectContainer.appendChild(el);

    el.addEventListener('click', (e) => {
    e.stopPropagation();
    activateProject(el);
    });
    const fav = el.querySelector('.project-fav');
    if (fav) {
        fav.addEventListener('click', (e) => {
            e.stopPropagation(); // чтобы клик по сердечку не активировал проект
            fav.classList.toggle('filled');
            fav.textContent = fav.classList.contains('filled') ? '♥' : '♡';
    });
}
}


function activateGroup(activeEl) {
    document
        .querySelectorAll('.group-title')
        .forEach(el => el.classList.remove('active'));

    activeEl.classList.add('active');
}


function openGroupMenu(event, groupId) {
    event.stopPropagation();

    currentGroupId = groupId;

    const dropdown = document.getElementById('group-dropdown');
    const rect = event.target.getBoundingClientRect();

    dropdown.style.display = 'block';
    dropdown.style.top = (rect.bottom + window.scrollY) + "px";
    dropdown.style.left = rect.left + "px";
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('group-dropdown');
    if (dropdown) dropdown.style.display = 'none';
});



function renameGroup() {
    const groupId = currentGroupId;
    const titleEl = document.querySelector(`.spaces-group[data-group-id="${groupId}"] .group-name`);


    document.getElementById('renameGroupId').value = groupId;
    document.getElementById('renameGroupInput').value = titleEl.textContent;
    document.getElementById('renameGroupModal').style.display = 'flex';
}


function submitRenameGroup() {
    const groupId = document.getElementById('renameGroupId').value;
    const newName = document.getElementById('renameGroupInput').value;

    if (!newName) {
        showToast('Name is required!', 'error');
        return;
    }


    fetch('/groups/rename/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            group_id: groupId,
            new_name: newName,
        }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const titleEl = document.querySelector(`.spaces-group[data-group-id="${groupId}"] .group-name`);
            titleEl.textContent = newName;

            const activeGroup = document.querySelector('.spaces-group .group-title.active');
            if (activeGroup && activeGroup.closest('.spaces-group').dataset.groupId === groupId) {
                updatePageTitle(newName); // обновляем сразу заголовок
            }


            closeRenameGroupModal();
        } else {
            alert('Error renaming group');
        }
    });
}



function toggleGroupProjects(event) {
    const titleEl = event.currentTarget;
    const groupEl = titleEl.closest('.spaces-group');
    if (!groupEl) return;

    const projectsContainer = groupEl.querySelector('.projects');
    if (!projectsContainer) return;

    const isHidden = projectsContainer.style.display === 'none';
    projectsContainer.style.display = isHidden ? 'block' : 'none';
    titleEl.classList.toggle('active', isHidden);
}





function changeGroupPriority() {
    if (!currentGroupId) {
        alert('No group selected');
        return;
    }

    const groupEl = document.querySelector(`.spaces-group[data-group-id="${currentGroupId}"] .group-title`);
    const currentPriorityClass = Array.from(groupEl.classList).find(cls => cls.startsWith('priority-'));
    const currentPriority = currentPriorityClass ? currentPriorityClass.replace('priority-', '') : 'normal';

    document.getElementById('changePriorityGroupId').value = currentGroupId;
    document.getElementById('changePrioritySelect').value = currentPriority;

    document.getElementById('changePriorityModal').style.display = 'flex';
}

function closeChangePriorityModal() {
    document.getElementById('changePriorityModal').style.display = 'none';
}

function submitChangePriority() {
    const groupId = document.getElementById('changePriorityGroupId').value;
    const newPriority = document.getElementById('changePrioritySelect').value;

    fetch('/groups/change_priority/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({ group_id: groupId, new_priority: newPriority })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Меняем класс группы на новый приоритет
            const groupEl = document.querySelector(`.spaces-group[data-group-id="${groupId}"] .group-title`);
            groupEl.classList.remove('priority-low', 'priority-normal', 'priority-high');
            groupEl.classList.add(`priority-${newPriority}`);
            closeChangePriorityModal();
        } else {
            alert(data.error || 'Error changing priority');
        }
    })
    .catch(err => console.error(err));
}

// Делаем функции глобальными, чтобы их вызывал dropdown
window.changeGroupPriority = changeGroupPriority;
window.closeChangePriorityModal = closeChangePriorityModal;
window.submitChangePriority = submitChangePriority;


function duplicateGroup() {
    if (!currentGroupId) {
        alert('No group selected');
        return;
    }

    fetch(`/groups/duplicate/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ group_id: currentGroupId })
    })
    .then(res => res.json())
    .then(group => {
        if (!group) {
            console.error('Server returned empty group');
            return;
        }

        // Находим все дубликаты с таким же именем
        const originalGroupEl = document.querySelector(`.spaces-group[data-group-id="${currentGroupId}"]`);
        const spacesBody = document.getElementById('spaces-body');

        let baseName = group.name || 'Duplicated Group';
        const existingNames = Array.from(document.querySelectorAll('.spaces-group .group-name'))
            .map(el => el.textContent)
            .filter(name => name.startsWith(baseName));

        let copyNumber = existingNames.length; // сколько уже дубликатов
        let groupName = copyNumber > 0 ? `${baseName} (${copyNumber})` : baseName;

        // Создаём новый элемент группы
        const groupEl = document.createElement('div');
        groupEl.className = 'spaces-group';
        groupEl.dataset.groupId = group.id;

        groupEl.innerHTML = `
            <div class="group-title clickable priority-${group.priority || 'normal'}">
                <span class="group-name">${groupName}</span>
                <div class="group-actions">
                    <span class="limit-badge">${group.limit || 0}</span>
                    <button class="group-menu-btn">⋯</button>
                </div>
            </div>
            <div class="projects"></div>
        `;

        // Вставка после оригинала
        originalGroupEl.after(groupEl);

        const title = groupEl.querySelector('.group-title');
        const menuBtn = groupEl.querySelector('.group-menu-btn');

        title.addEventListener('click', () => activateGroup(title));
        title.addEventListener('click', toggleGroupProjects);

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openGroupMenu(e, group.id);
        });

        // Добавляем проекты оригинальной группы
        const originalProjects = originalGroupEl.querySelectorAll('.project-item');
        const projectsContainer = groupEl.querySelector('.projects');

        originalProjects.forEach(project => {
            const clone = project.cloneNode(true);
            projectsContainer.appendChild(clone);

            // Навешиваем обработчики на клонированные проекты
            const menuBtn = clone.querySelector('.project-menu-btn');
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openProjectMenu(e, project.dataset.projectId);
            });

            clone.addEventListener('click', () => activateProject(clone));
        });
    })
    .catch(err => console.error('Error duplicating group', err));
}


function deleteGroup() {
    if (!currentGroupId) return;

    const modal = document.getElementById('delete-group-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function confirmDeleteGroup() {
    if (!currentGroupId) return;

    fetch('/groups/delete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ group_id: currentGroupId })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) return;

        const groupEl = document.querySelector(
            `.spaces-group[data-group-id="${currentGroupId}"]`
        );
        if (groupEl) groupEl.remove();

        closeDeleteGroupModal();
        currentGroupId = null;

        showToast('Group successfully deleted');
    });
}





function closeDeleteGroupModal() {
    const modal = document.getElementById('delete-group-modal');
    if (modal) modal.style.display = 'none';
}



function activateProject(activeEl) {
    document
        .querySelectorAll('.project-item')
        .forEach(el => el.classList.remove('active'));

    activeEl.classList.add('active');
}





/*===OTHER===*/
function getCSRFToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
}


/*===========================PROJECT============================*/
function addProjectInGroup() {
    if (!currentGroupId) {
        alert('No group selected');
        return;
    }

    document.getElementById('createProjectGroupId').value = currentGroupId;
    document.getElementById('createProjectName').value = '';
    document.getElementById('createProjectLimit').value = 50;
    document.getElementById('createProjectModal').style.display = 'flex';
}



function addProjectToGroupSidebar(project) {
    // Найти контейнер группы
    const groupEl = document.querySelector(`.spaces-group[data-group-id="${project.group_id}"]`);
    if (!groupEl) {
        console.error('Group element not found for project rendering');
        return;
    }

    // Создать контейнер проектов, если его нет
    let projectContainer = groupEl.querySelector('.projects');
    if (!projectContainer) {
        projectContainer = document.createElement('div');
        projectContainer.className = 'projects';
        groupEl.appendChild(projectContainer);
    }

    // Создать элемент проекта
    const el = document.createElement('div');
    el.className = 'project-item';
    el.dataset.projectId = project.id;
    el.innerHTML = `
        <span class="project-name">${project.name}</span>
        <div class="project-actions">
            <button class="project-menu-btn">⋯</button>
        </div>
    `;

    projectContainer.appendChild(el);

    // Навешиваем открытие меню на кнопку
    const btn = el.querySelector('.project-menu-btn');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectMenu(e, project.id, project.name);
    });

    // Навешиваем клик на имя проекта (если нужно отдельное поведение)
    el.querySelector('.project-name').addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectMenu(e, project.id, project.name);
    });

    el.addEventListener('click', (e) => {
    e.stopPropagation();
    activateProject(el);
});}






function submitCreateProject() {
    const name = document.getElementById('createProjectName').value.trim();
    const groupId = document.getElementById('createProjectGroupId').value;
    const limit = Number(document.getElementById('createProjectLimit').value);

    if (!name) {
        showToast('Name is required!', 'error');
        return;
    }

    if (!limit) {
        showToast('Limit is required!', 'error');
        return;
    }

    fetch('/projects/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ name, group_id: groupId, limit })
    })
    .then(res => res.json())
    .then(project => {
        if (project.error) {
            if (project.error === 'PROJECT_LIMIT_REACHED') {
                showToast('Project limit reached for this group!');
                return;
            }

            showToast(project.error);
            return;
        }

        addProjectToGroupSidebar(project);

        const cardsContainer = document.querySelector('#recent .cards'); // или '#fav .cards' если хотите в избранное
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.projectId = project.id; // чтобы потом можно было удалить
        cardEl.id = `card-${project.id}`;


        const groupEl = document.querySelector(`.spaces-group[data-group-id="${project.group_id}"]`);
        const groupName = groupEl ? groupEl.querySelector('.group-name').textContent : '';


        cardEl.innerHTML = `
            <button class="card-menu-btn" onclick="openProjectMenu(event, '${project.id}', '${project.name}')"></button>
            <div class="card-content">
                    <div class="card-img">
                        <img src="/static/tasks/icons/doc_light.png" alt="icon" class="card-icon"/>
                        <span class="card-subtitle">example</span>
                    </div>
            <div class="card-title">
                    ${project.name}
                    <span class="project-group-dot">• ${groupName}</span>
                </div>
            </div>
        `;
        

        // Добавляем карточку в начало контейнера, чтобы соблюдался LIFO порядок
        cardsContainer.prepend(cardEl);

        // 3️⃣ Обновляем видимые карточки
        updateCards('recent', 3);
        updateCards('fav', 3);


        closeCreateProjectModal();
    })
    .catch(err => console.error('Error creating project', err));
}




function openProjectMenu(event, projectId, projectName) {
    event.stopPropagation(); 

    currentProjectId = projectId;
    currentProjectName = projectName;

    const dropdown = document.getElementById('project-dropdown');
    const rect = event.target.getBoundingClientRect();

    dropdown.style.display = 'block';
    dropdown.style.top = (rect.bottom + window.scrollY) + "px";
    dropdown.style.left = rect.left + "px";

    const favBtn = dropdown.querySelector('.project-fav-btn');
    if (!favBtn) return;

    // 2️⃣ Проверяем, есть ли проект в избранных
    const cardEl = document.getElementById(`card-${projectId}`);
    const isFavourite = cardEl ? cardEl.classList.contains('favourite') : false;

    // 3️⃣ Меняем текст в дропдауне
    favBtn.textContent = isFavourite ? 'Remove from favourites' : 'Add to favourites';

    // 4️⃣ Навешиваем обработчик клика
    favBtn.onclick = () => {
        toggleFavourite(favBtn, projectId);
    };
}



function loadProjects() {
    fetch('/projects/')
        .then(res => res.json())
        .then(projects => {
            // Удаляем все существующие проекты, чтобы не дублировать
            document.querySelectorAll('.project-item').forEach(el => el.remove());

            projects.forEach(project => {
                renderProject(project);
            });
        })
        .catch(err => {
            console.error('Error loading projects', err);
        });
}




/*==PROJECT MODAL===*/
function closeCreateProjectModal() {
    document.getElementById('createProjectModal').style.display = 'none';
}




/*===DROPDOWN MENU===*/
function openMenu(event, projectId, projectName) {
    event.stopPropagation();

    currentProjectId = projectId;
    currentProjectName = projectName;

    const rect = event.target.getBoundingClientRect();
    dropdown.style.display  = 'block';
    dropdown.style.top=(rect.bottom + window.scrollY) + "px";
    dropdown.style.left=rect.left + "px";   
}


function renameProject() {
    if (!currentProjectId) return;

    const projectEl = document.querySelector(`.project-item[data-project-id="${currentProjectId}"]`);
    const projectName = projectEl ? projectEl.querySelector('.project-name').textContent : '';

    document.getElementById('renameProjectId').value = currentProjectId;
    document.getElementById('renameProjectName').value = projectName;

    document.getElementById('renameProjectModal').style.display = 'flex';
}

// закрыть модалку
function closeRenameProjectModal() {
    document.getElementById('renameProjectModal').style.display = 'none';
}

// отправка изменений на сервер
function submitRenameProject() {
    const projectId = document.getElementById('renameProjectId').value;
    const newName = document.getElementById('renameProjectName').value.trim();

    if (!newName) {
        alert('Project name cannot be empty');
        return;
    }

    fetch('/projects/rename/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ project_id: projectId, new_name: newName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Обновляем имя на странице
            const projectEl = document.querySelector(`.project-item[data-project-id="${projectId}"]`);
            if (projectEl) {
                projectEl.querySelector('.project-name').textContent = newName;
            }
            // Закрываем модалку
            closeRenameProjectModal();
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error renaming project');
    });
}


function toggleFavourite(button, projectId) {
    console.log('CLICKED, projectId =', projectId);

    fetch('/projects/favourite/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ project_id: projectId })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) return;

        const cardEl = document.getElementById(`card-${projectId}`);
        if (cardEl) {
            cardEl.classList.toggle('favourite', data.is_favourite);
        }

        // 2️⃣ Переключаем текст в дропдауне, если открыт
        const dropdown = document.getElementById('project-dropdown');
        const favBtn = dropdown.querySelector('.project-fav-btn');
        if (favBtn) {
            favBtn.textContent = data.is_favourite ? 'Remove from favourites' : 'Add to favourites';
        }



        showToast(
            data.is_favourite
                ? 'Successfully added to favourites'
                : 'Removed from favourites'
        );

        const favContainer = document.querySelector('#fav .cards');
        if (data.is_favourite && cardEl) {
            // Добавляем карточку в избранное
            favContainer.prepend(cardEl.cloneNode(true));
            updateCards('fav', 3);
        } else if (!data.is_favourite) {
            // Убираем карточку из избранного
            const favCard = document.getElementById(`card-${projectId}`);
            if (favCard && favCard.parentElement.id === 'fav') {
                favCard.remove();
                updateCards('fav', 3);
            }
        }
    });
}



function duplicateProject() {
    if (!currentProjectId) {
        showToast("No project selected");
        return;
    }

    const originalEl = document.querySelector(`.project-item[data-project-id="${currentProjectId}"]`);
    if (!originalEl) return;

    const groupEl = originalEl.closest(".spaces-group");
    if (!groupEl) return;

    const projectContainer = groupEl.querySelector(".projects") || originalEl.parentElement;
    const currentProjectsCount = projectContainer.querySelectorAll(".project-item").length;

    // Получаем лимит группы из data-атрибута (добавить на сервере при рендере)
    const groupLimit = parseInt(groupEl.dataset.groupLimit, 10);

    if (currentProjectsCount >= groupLimit) {
        showToast("Project limit reached for this group");
        return; // не создаем дубликат
    }

    fetch("/projects/duplicate/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken()
        },
        body: JSON.stringify({ project_id: currentProjectId })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showToast(data.error || "Error duplicating project");
            return;
        }

        const project = data.project;

        let container = groupEl.querySelector(".projects");
        if (!container) {
            container = document.createElement("div");
            container.className = "projects";
            container.style.display = "none";
            groupEl.appendChild(container);
        }

        const el = document.createElement("div");
        el.className = "project-item";
        el.dataset.projectId = project.id;
        el.innerHTML = `
            <span class="project-name">${project.name}</span>
            <div class="project-actions">
                <button class="project-menu-btn" onclick="openProjectMenu(event, ${project.id}, '${project.name}')">⋯</button>
            </div>
        `;
        originalEl.after(el);
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            activateProject(el);
        });
    })
    .catch(err => console.error(err));
}


function deleteProject() {
    if (!currentProjectId) return;

    document.getElementById('delete-project-modal').style.display = 'flex';
}


function closeDeleteProjectModal() {
    const modal = document.getElementById('delete-project-modal');
    if (modal) modal.style.display = 'none';
}



document.getElementById('confirm-delete-project')
    ?.addEventListener('click', () => {

        fetch('/projects/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ project_id: currentProjectId })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert(data.error || 'Error deleting project');
                return;
            }

            // 🔥 Удаляем проект из сайдбара
            const projectEl = document.querySelector(
                `.project-item[data-project-id="${currentProjectId}"]`
            );
            if (projectEl) projectEl.remove();
            
            const cardEl = document.getElementById(`card-${currentProjectId}`);
            if (cardEl) cardEl.remove();
            

            updateCards('recent', 3);
            updateCards('fav', 3);

            closeDeleteProjectModal();
            currentProjectId = null;

            showToast('Project successfully deleted');
        });
    });



const searchInput = document.getElementById('global-search');
const suggestionsBox = document.getElementById('search-suggestions');

let searchTimeout = null;

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();

    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // немного задержки, чтобы не спамить сервер на каждый символ
    searchTimeout = setTimeout(() => {
        fetch(`/search_suggestions/?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(results => {
                renderSearchSuggestions(results);
            });
    }, 300);
});

function renderSearchSuggestions(results) {
    suggestionsBox.innerHTML = '';

    if (!results || results.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-suggestion-item';
        div.textContent = item.name + ` (${item.type})`; // type: project/group/task
        div.addEventListener('click', () => {
            searchInput.value = item.name;
            suggestionsBox.style.display = 'none';
            // Дополнительно: можешь добавить переход к элементу
            highlightItem(item);
        });
        suggestionsBox.appendChild(div);
    });

    if (results.length) {
            // 🔹 растягиваем подсказки по ширине input
            const rect = searchInput.getBoundingClientRect();
            suggestionsBox.style.width = rect.width + 'px';
            suggestionsBox.style.top = (rect.bottom + window.scrollY) + 'px';
            suggestionsBox.style.left = rect.left + 'px';
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }

    suggestionsBox.style.display = 'block';
}

// пример подсветки выбранного элемента
function highlightItem(item) {
    // project: {id: ..., type: 'project'}
    if(item.type === 'project') {
        const el = document.querySelector(`.project-item[data-project-id="${item.id}"]`);
        if(el) {
            el.scrollIntoView({behavior: 'smooth', block: 'center'});
            el.classList.add('highlight');
            setTimeout(() => el.classList.remove('highlight'), 2000);
        }
    }

    if(item.type === 'group') {
        const el = document.querySelector(`.spaces-group[data-group-id="${item.id}"]`);
        if(el) {
            el.scrollIntoView({behavior: 'smooth', block: 'center'});
            el.classList.add('highlight');
            setTimeout(() => el.classList.remove('highlight'), 2000);
        }
    }
}
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
    }
});



/*===MODALS===*/
function openRename() {
    dropdown.style.display = 'none';

    document.getElementById('renameProjectId').value = currentProjectId;
    document.getElementById('renameProjectName').value = currentProjectName;
    document.getElementById('renameModal').style.display = 'flex';

}

function openDelete() {
    dropdown.style.display = 'none';

    document.getElementById('deleteProjectId').value = currentProjectId;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('renameModal').style.display = 'none';
    document.getElementById('deleteModal').style.display = 'none';
}







window.renameGroup = renameGroup;
window.submitRenameGroup = submitRenameGroup;
window.closeRenameGroupModal = closeRenameGroupModal;
window.deleteGroup = deleteGroup;
window.renameProject = renameProject;
window.closeRenameProjectModal = closeRenameProjectModal;
window.submitRenameProject = submitRenameProject;
window.duplicateProject = duplicateProject;
window.deleteProject = deleteProject;
window.closeDeleteProjectModal = closeDeleteProjectModal;


document.addEventListener('DOMContentLoaded', () => {
    // Загружаем группы и после успешного рендера загружаем проекты
    loadGroups()
        .then(() => {
            loadProjects();
        });
});



document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('project-dropdown');
    if (!dropdown) return;

    // Если клик не по dropdown и не по кнопке ⋯
    if (!dropdown.contains(event.target) && !event.target.classList.contains('project-menu-btn')) {
        dropdown.style.display = 'none';
    }
});


document.addEventListener('click', (e) => {
    const fav = e.target.closest('.project-fav');
    if (!fav) return;

    e.stopPropagation();
    fav.classList.toggle('filled');
});



function showToast(text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}


document.addEventListener('click', function(e) {
    const spacesBody = document.getElementById('spaces-body');
    const spacesHeader = document.querySelector('.spaces-header');
    const projectDropdown = document.getElementById('project-dropdown');
    const groupDropdown = document.getElementById('group-dropdown');

    if (!spacesBody || spacesBody.classList.contains('hidden')) return;

    // Если клик не по spacesBody, не по заголовку и не по дропдаунам
    if (!spacesBody.contains(e.target) &&
        !spacesHeader.contains(e.target) &&
        (!projectDropdown || !projectDropdown.contains(e.target)) &&
        (!groupDropdown || !groupDropdown.contains(e.target))) {
        spacesBody.classList.add('hidden');
    }
});



document.addEventListener('DOMContentLoaded', () => {

    const savedView = localStorage.getItem('selectedView');

    if (!savedView) return;

    const btnToActivate = document.querySelector(`.view-btn[data-view="${savedView}"]`);

    if (btnToActivate) {
        btnToActivate.click();
    }

});