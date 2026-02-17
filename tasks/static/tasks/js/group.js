let lastClearedGroup = null;
let clickCount = 0;

function clearMainContent() {
    console.trace("clearMainContent CALLED");

    const content = document.querySelector(".content");
    if (content) {
        content.innerHTML = "";
    }
}




function updatePageTitle(newTitle) {
    const titleEl = document.querySelector(".page-title");
    if (titleEl) {
        titleEl.textContent = newTitle;
        console.log("Page title updated to:", newTitle);
    }
}




document.getElementById('spaces-body').addEventListener('click', function(e) {

    const groupTitle = e.target.closest('.group-title');
    if (!groupTitle) return;

    const groupEl = groupTitle.closest('.spaces-group');
    const projects = groupEl.querySelector('.projects');
    const groupName = groupTitle.querySelector('.group-name').textContent;

    // проверяем, открыт ли контейнер проектов
    const isOpen = projects.classList.contains('open');

    if (!isOpen) {
        // 1 клик: показываем проекты
        projects.style.display = 'block';
        projects.classList.add('open');
        return; // выходим, Main не трогаем
    }

    // 2 клик: очищаем Main
    clearMainContent();
    updatePageTitle(groupName);

    // при желании можно закрыть проекты после второго клика
    // projects.style.display = 'none';
    // projects.classList.remove('open');
});