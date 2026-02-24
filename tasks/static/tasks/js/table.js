// === VIEW SWITCH ===
viewButtons = document.querySelectorAll('.view-switch .view-btn');

viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Снимаем active со всех кнопок
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.dataset.view;
        const cardsSections = document.querySelectorAll('.cards');

        cardsSections.forEach(section => {
            section.classList.remove('board-view', 'list-view', 'calendar-view', 'table-view');

            if (view === 'board') section.classList.add('board-view');
            else if (view === 'list') section.classList.add('list-view');
            else if (view === 'calendar') section.classList.add('calendar-view');
            else if (view === 'table') {
                section.classList.add('table-view');
                renderTableView(section);
            }
        });
    });
});


function renderTableView(section) {

    const cards = section.querySelectorAll('.card');

    // скрываем карточки
    cards.forEach(card => {
        card.style.display = 'none';
    });

    // если таблицы уже созданы — не создаём повторно
    if (section.querySelector('.project-table-wrapper')) return;

    cards.forEach(card => {
        const titleEl = card.querySelector('.card-title');
        const groupEl = card.querySelector('.project-group-dot');

        const projectName = titleEl ? titleEl.textContent.trim() : 'Project';
        const groupName = groupEl ? groupEl.textContent.trim() : '';

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'project-table-wrapper';

        tableWrapper.innerHTML = `
            <table class="project-table">
                <thead>
                    <tr class="project-header-row">
                        <th colspan="5">
                            <span class="project-name">${projectName}</span>
                            ${groupName ? `<span class="project-group">${groupName}</span>` : ''}
                        </th>
                    </tr>
                    <tr>
                        <th style="width:40px;">
                            <input type="checkbox">
                        </th>
                        <th>Name</th>
                        <th>Assignee</th>
                        <th>Status</th>
                        <th>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="5" style="text-align:center;">…</td>
                    </tr>
                </tbody>
            </table>
        `;

        section.appendChild(tableWrapper);
    });
}


function removeTableView(section) {

    // удаляем таблицы
    const tables = section.querySelectorAll('.project-table-wrapper');
    tables.forEach(t => t.remove());

    // возвращаем карточки
    const cards = section.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.display = '';
    });
}



function restoreCards(section) {

    // удалить таблицы
    const tables = section.querySelectorAll('.project-table-wrapper');
    tables.forEach(t => t.remove());

    // показать карточки обратно
    const cards = section.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.display = '';
    });
}

