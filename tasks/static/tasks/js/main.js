

let currentProjectId = null;
let currentGroupId = null;
let currentProjectName = null;

const dropdown = document.getElementById('group-dropdown');

/*===COLLAPSE SECTION===*/
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});



function toggleSection(Id) {
    const section = document.getElementById(Id);
    if (section) {
        section.classList.toggle('collapsed');
    }
}



function toggleSpaces(event) {
    event.stopPropagation();
    
    const body = document.getElementById('spaces-body');
    const arrow = document.getElementById('spaces-arrow');

    body.classList.toggle('hidden');
    if (body.classList.contains('hidden')) {
        arrow.textContent = '▶';
    } else {
        arrow.textContent = '▼';
    } 
}

/*===GROUP CREATING===*/
function addSpace(event) {
    event.stopPropagation();
    openCreateGroupModal();
}


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
        console.error('❌ groupModal not found in DOM');
        return;
    }

    modal.style.display = 'flex';
}

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


function getCSRFToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
}


function addGroupToSidebar(group) {
    const container = document.getElementById('spaces-body');

    const el = document.createElement('div');
    el.className = `space-group priority-${group.priority}`;

    el.innerHTML = `
    <div class="group-title">
      ${group.name}
      <span class="limit-badge">${group.limit}</span>
    </div>
    `;
    container.appendChild(el);
}


function loadGroups() {
    fetch('/groups/')
        .then(res => res.json())
        .then(groups => {
            const container = document.getElementById('spaces-body');
            container.innerHTML = ''; // очистка

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


function renderGroup(group, ) {
    const spacesBody = document.getElementById('spaces-body');
    const groupEl = document.createElement('div');


    groupEl.className = 'space-group';

    groupEl.innerHTML = `
        <div class="group-title priority-${group.priority}">
            <span class="group-name">${group.name}</span>

            <div class="group-actions">
                <span class="limit-badge">${group.limit}</span>
                <button class="group-menu-btn">⋯</button>
            </div>


        </div>

    `;

    spacesBody.appendChild(groupEl);
    const title=groupEl.querySelector('.group-title');
    const menuBtn = groupEl.querySelector('.group-menu-btn');
    
    title.addEventListener('click', () => activateGroup(title));

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        openGroupMenu(e, group.id);
    });

    groupEl.className = 'space-group';
    groupEl.dataset.groupId = group.id;
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
    console.log('renameGroup clicked', currentGroupId);
    if (!currentGroupId) {
        alert('Выберите группу перед переименованием!');
        return;
    }
    const titleEl = document.querySelector(`.space-group[data-group-id="${currentGroupId}"] .group-name`);
    if (!titleEl) return;

    document.getElementById('renameGroupId').value = currentGroupId;
    document.getElementById('renameGroupInput').value = titleEl.textContent;
    document.getElementById('renameGroupModal').style.display = 'flex';
}


function submitRenameGroup() {
    const groupId = document.getElementById('renameGroupId').value;
    const newName = document.getElementById('renameGroupInput').value;

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
            const titleEl = document.querySelector(`.space-group[data-group-id="${groupId}"] .group-name`);
            titleEl.textContent = newName;
            closeRenameGroupModal();
        } else {
            alert('Error renaming group');
        }
    });
}

function closeRenameGroupModal() {
    document.getElementById('renameGroupModal').style.display = 'none';
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





document.addEventListener('DOMContentLoaded', () => {
    const renameBtn = document.getElementById('renameGroupBtn');
    if (renameBtn) {
        renameBtn.addEventListener('click', renameGroup);
    }

    const addBtn = document.getElementById('addGroupProjectBtn');
    if (addBtn) addBtn.addEventListener('click', addProjectInGroup);

    const changeBtn = document.getElementById('changeGroupPriorityBtn');
    if (changeBtn) changeBtn.addEventListener('click', changeGroupPriority);

    const duplicateBtn = document.getElementById('duplicateGroupBtn');
    if (duplicateBtn) duplicateBtn.addEventListener('click', duplicateGroup);

    const deleteBtn = document.getElementById('deleteGroupBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteGroup);
});



