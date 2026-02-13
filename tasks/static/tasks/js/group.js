function clearMainContent() {
    const content = document.querySelector(".content"); // или #main, если так у тебя в html
    if (content) {
        content.innerHTML = ""; // полностью очищаем блок
        console.log("Main content cleared"); // для проверки
    }
}


function initGroupClickHandlers() {
    const groups = document.querySelectorAll(".spaces-group .group-title");
    groups.forEach(groupEl => {
        groupEl.addEventListener("click", () => {
            //очищаем main
            clearMainContent();

            //обновляем заголовок
            const groupName = groupEl.querySelector(".group-name").textContent;
            updatePageTitle(groupName);
        });
    });
}

// запускаем при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    initGroupClickHandlers();
});


function updatePageTitle(newTitle) {
    const titleEl = document.querySelector(".page-title");
    if (titleEl) {
        titleEl.textContent = newTitle;
        console.log("Page title updated to:", newTitle);
    }
}
document.getElementById('spaces-body').addEventListener('click', (e) => {
    const groupTitle = e.target.closest('.group-title');
    if (!groupTitle) return;

    const groupName = groupTitle.querySelector('.group-name').textContent;

    clearMainContent();
    updatePageTitle(groupName);
});