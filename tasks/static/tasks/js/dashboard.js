function animateNumber(el, target, duration = 800) {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start += step;
        if (start >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(start);
        }
    }, 16);
}

function renderDashboardPage() {
    saveAppState('dashboard', null);
    updatePageTitle('Dashboard');

    const content = document.querySelector('.content');
    content.innerHTML = `
        <div id="dashboard-page">
            <div class="dashboard-stats-row" id="dashboard-stats-row">
                <div class="dash-stat-card" id="dash-stat-total">
                    <div class="dash-stat-icon" style="background:#eef2ff">📋</div>
                    <div class="dash-stat-info">
                        <div class="dash-stat-label">Total Tasks</div>
                        <div class="dash-stat-value" id="dash-total">—</div>
                    </div>
                </div>
                <div class="dash-stat-card" id="dash-stat-done">
                    <div class="dash-stat-icon" style="background:#d3f9d8">✅</div>
                    <div class="dash-stat-info">
                        <div class="dash-stat-label">Completed</div>
                        <div class="dash-stat-value" id="dash-done">—</div>
                    </div>
                </div>
                <div class="dash-stat-card" id="dash-stat-progress">
                    <div class="dash-stat-icon" style="background:#fff3bf">⏳</div>
                    <div class="dash-stat-info">
                        <div class="dash-stat-label">In Progress</div>
                        <div class="dash-stat-value" id="dash-progress">—</div>
                    </div>
                </div>
                <div class="dash-stat-card" id="dash-stat-overdue">
                    <div class="dash-stat-icon" style="background:#ffe3e3">🔥</div>
                    <div class="dash-stat-info">
                        <div class="dash-stat-label">Overdue</div>
                        <div class="dash-stat-value" id="dash-overdue">—</div>
                    </div>
                </div>
            </div>

            <div class="dashboard-charts-row">
                <div class="dash-chart-card">
                    <div class="dash-chart-title">Tasks by Status</div>
                    <canvas id="chart-status" height="220"></canvas>
                </div>
                <div class="dash-chart-card">
                    <div class="dash-chart-title">Tasks by Project</div>
                    <canvas id="chart-projects" height="220"></canvas>
                </div>
                <div class="dash-chart-card">
                    <div class="dash-chart-title">Completed (last 7 days)</div>
                    <canvas id="chart-line" height="220"></canvas>
                </div>
            </div>

            <div class="dashboard-tables-row">
                <div class="dash-table-card">
                    <div class="dash-chart-title">🔥 Overdue Tasks</div>
                    <table class="tasks-table">
                        <thead><tr>
                            <th class="tasks-th">Task</th>
                            <th class="tasks-th">Project</th>
                            <th class="tasks-th">Due</th>
                            <th class="tasks-th">Priority</th>
                        </tr></thead>
                        <tbody id="dash-overdue-list"></tbody>
                    </table>
                </div>
                <div class="dash-table-card">
                    <div class="dash-chart-title">📅 Upcoming Tasks</div>
                    <table class="tasks-table">
                        <thead><tr>
                            <th class="tasks-th">Task</th>
                            <th class="tasks-th">Project</th>
                            <th class="tasks-th">Due</th>
                            <th class="tasks-th">Status</th>
                        </tr></thead>
                        <tbody id="dash-upcoming-list"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // загружаем Chart.js если нет
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => loadDashboardData();
        document.head.appendChild(script);
    } else {
        loadDashboardData();
    }
}

function loadDashboardData() {
    fetch('/dashboard/stats/')
        .then(res => res.json())
        .then(data => {
            animateNumber(document.getElementById('dash-total'), data.total);
            animateNumber(document.getElementById('dash-done'), data.done);
            animateNumber(document.getElementById('dash-progress'), data.in_progress);
            animateNumber(document.getElementById('dash-overdue'), data.overdue);

            const isDark = document.body.classList.contains('dark-theme');
            const textColor = isDark ? '#aaa' : '#555';
            const gridColor = isDark ? '#333' : '#eee';

            // stat cards клики
            const statCards = {
                'dash-stat-total': { tasks: data.all_tasks, title: 'All Tasks' },
                'dash-stat-done': { tasks: data.done_tasks, title: 'Completed Tasks' },
                'dash-stat-progress': { tasks: data.progress_tasks, title: 'In Progress' },
                'dash-stat-overdue': { tasks: data.overdue_tasks, title: 'Overdue Tasks' },
            };

            Object.entries(statCards).forEach(([cardId, { tasks, title }]) => {
                const card = document.getElementById(cardId);
                if (!card) return;
                card.style.cursor = 'pointer';

                card.addEventListener('click', () => {
                    const existing = document.getElementById('dash-tasks-panel');
                    if (existing && existing.dataset.source === cardId) {
                        existing.remove();
                        card.classList.remove('dash-stat-active');
                        return;
                    }

                    document.querySelectorAll('.dash-stat-card').forEach(c => c.classList.remove('dash-stat-active'));
                    document.getElementById('dash-tasks-panel')?.remove();
                    card.classList.add('dash-stat-active');

                    const panel = document.createElement('div');
                    panel.id = 'dash-tasks-panel';
                    panel.dataset.source = cardId;
                    panel.innerHTML = `
                        <div class="dash-panel-header">
                            <span class="dash-panel-title">${title}</span>
                            <span class="dash-panel-count">${tasks.length} tasks</span>
                            <button class="dash-panel-close" onclick="document.getElementById('dash-tasks-panel').remove(); document.querySelectorAll('.dash-stat-card').forEach(c=>c.classList.remove('dash-stat-active'))">✕</button>
                        </div>
                        <table class="tasks-table">
                            <thead><tr>
                                <th class="tasks-th">Task</th>
                                <th class="tasks-th">Project</th>
                                <th class="tasks-th">Due</th>
                                <th class="tasks-th">Status</th>
                                <th class="tasks-th">Priority</th>
                            </tr></thead>
                            <tbody>
                                ${tasks.length === 0
                                    ? `<tr><td class="task-td task-muted" colspan="5">No tasks</td></tr>`
                                    : tasks.map(t => `
                                        <tr class="task-row dash-clickable-row" data-project-name="${t.project__name}">
                                            <td class="task-td task-title-td">${t.title}</td>
                                            <td class="task-td task-muted">${t.project__name || '—'}</td>
                                            <td class="task-td task-muted">${t.due_date || '—'}</td>
                                            <td class="task-td"><span class="task-status-badge status-${t.status}">${t.status.replace('_', ' ')}</span></td>
                                            <td class="task-td"><span class="task-priority-inline" style="color:${t.priority === 'high' ? '#e03131' : '#aaa'}">⚑</span></td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    `;

                    panel.querySelectorAll('.dash-clickable-row').forEach(row => {
                        row.addEventListener('click', () => {
                            const projectEl = Array.from(document.querySelectorAll('.project-item'))
                                .find(el => el.querySelector('.project-name')?.textContent.trim() === row.dataset.projectName);
                            if (!projectEl) return;
                            document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
                            projectEl.classList.add('active');
                            renderProjectPage(projectEl);
                        });
                    });

                    document.getElementById('dashboard-page').insertBefore(
                        panel,
                        document.querySelector('.dashboard-charts-row')
                    );
                });
            });

            // donut — status
            new Chart(document.getElementById('chart-status'), {
                type: 'doughnut',
                data: {
                    labels: ['To Do', 'In Progress', 'Done'],
                    datasets: [{
                        data: [data.todo, data.in_progress, data.done],
                        backgroundColor: ['#adb5bd', '#fcc419', '#51cf66'],
                        borderWidth: 0,
                    }]
                },
                options: {
                    plugins: { legend: { labels: { color: textColor } } },
                    cutout: '65%'
                }
            });

            // bar — by project
            new Chart(document.getElementById('chart-projects'), {
                type: 'bar',
                data: {
                    labels: data.by_project.map(p => p.name),
                    datasets: [{
                        label: 'Tasks',
                        data: data.by_project.map(p => p.task_count),
                        backgroundColor: '#7c76f0',
                        borderRadius: 6,
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor }, grid: { color: gridColor } },
                        y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }
                    }
                }
            });

            // line — completed by day
            new Chart(document.getElementById('chart-line'), {
                type: 'line',
                data: {
                    labels: data.completed_by_day.map(d => d.date),
                    datasets: [{
                        label: 'Completed',
                        data: data.completed_by_day.map(d => d.count),
                        borderColor: '#7c76f0',
                        backgroundColor: 'rgba(124,118,240,0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#7c76f0',
                        fill: true,
                        tension: 0.4,
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor }, grid: { color: gridColor } },
                        y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }
                    }
                }
            });

            // overdue table
            const overdueList = document.getElementById('dash-overdue-list');
            if (data.overdue_tasks.length === 0) {
                overdueList.innerHTML = `<tr><td class="task-td task-muted" colspan="4">No overdue tasks 🎉</td></tr>`;
            } else {
                overdueList.innerHTML = data.overdue_tasks.map(t => `
                    <tr class="task-row dash-clickable-row" data-project-name="${t.project__name}">
                        <td class="task-td task-title-td">${t.title}</td>
                        <td class="task-td task-muted">${t.project__name || '—'}</td>
                        <td class="task-td task-muted" style="color:#e03131">${t.due_date}</td>
                        <td class="task-td"><span class="task-priority-inline" style="color:${t.priority === 'high' ? '#e03131' : '#aaa'}">⚑</span></td>
                    </tr>
                `).join('');
            }

            // upcoming table
            const upcomingList = document.getElementById('dash-upcoming-list');
            if (data.upcoming_tasks.length === 0) {
                upcomingList.innerHTML = `<tr><td class="task-td task-muted" colspan="4">No upcoming tasks</td></tr>`;
            } else {
                upcomingList.innerHTML = data.upcoming_tasks.map(t => `
                    <tr class="task-row dash-clickable-row" data-project-name="${t.project__name}">
                        <td class="task-td task-title-td">${t.title}</td>
                        <td class="task-td task-muted">${t.project__name || '—'}</td>
                        <td class="task-td task-muted">${t.due_date}</td>
                        <td class="task-td"><span class="task-status-badge status-${t.status}">${t.status.replace('_', ' ')}</span></td>
                    </tr>
                `).join('');
            }

            document.querySelectorAll('.dash-clickable-row').forEach(row => {
                row.addEventListener('click', () => {
                    const projectEl = Array.from(document.querySelectorAll('.project-item'))
                        .find(el => el.querySelector('.project-name')?.textContent.trim() === row.dataset.projectName);
                    if (!projectEl) return;
                    document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
                    projectEl.classList.add('active');
                    renderProjectPage(projectEl);
                });
            });
        });
}

window.renderDashboardPage = renderDashboardPage;

document.getElementById('nav-dashboard').addEventListener('click', () => {
    renderDashboardPage();
});


