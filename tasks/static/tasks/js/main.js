let currentProjectId = null;
let currentPrijectName = null;

const dropdown = document.getElementById('dropdown');

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
    document.getElementById('group-modal').style.display = 'flex';
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
    const name = document.getElementById('group-name').value.trim();
    const priority = document.getElementById('group-priority').value;
    const limit = document.getElementById('group-limit').value;

    if (!name) {
        alert('Group name is required');
        return;
    }

    // ВРЕМЕННО: только DOM
    const container = document.getElementById('spaces-body');

    const group = document.createElement('div');
    group.className = 'space-group';

    group.innerHTML = `
        <div class="group-title">${name}</div>
    `;

    container.appendChild(group);

    closeGroupModal();
}


function submitGroup() {
    const name = document.getElementById('group-name').value;
    const priority = document.getElementById('group-priority').value;
    const limit = document.getElementById('group-limit').value;

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



function renderGroup(group) {
    const spacesBody = document.getElementById('spaces-body');

    const groupEl = document.createElement('div');
    groupEl.className = 'space-group';

    groupEl.innerHTML = `
        <strong class="group-title priority-${group.priority}">
            ${group.name}
            <span class="limit-badge">${group.limit}</span>
        </strong>
    `;

    spacesBody.appendChild(groupEl);
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

document.addEventListener('click', () => {
    dropdown.style.display = 'none';
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
