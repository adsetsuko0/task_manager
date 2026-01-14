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


function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-toggle');

    sidebar.classList.toggle('collapsed');

    btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
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




/*===создание группы в сайдбаре===*/
function addSpace(event) {
    event.stopPropagation();

    const spacesBody = document.getElementById('spaces-body');

    const newGroup = document.createElement('div');
    newGroup.className = 'space-group';
    newGroup.innerHTML = `<strong>My First Group</strong>`;
    spacesBody.appendChild(newGroup);
    spacesBody.classList.remove('hidden');
    document.getElementById('spaces-arrow').textContent = '▼';

}