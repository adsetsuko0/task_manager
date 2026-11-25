const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const mainJsPath = path.join(
    __dirname,
    '../../tasks/static/tasks/js/main.js'
);

const mainJs = fs.readFileSync(mainJsPath, 'utf8');

const start = mainJs.indexOf('function renderGroup(group) {');
const end = mainJs.indexOf('\nfunction renderProject(project)', start);

if (start === -1 || end === -1) {
    throw new Error('Could not find renderGroup() in main.js');
}

const renderGroupSource = mainJs.slice(start, end);

test('renderGroup displays a group name as text, not executable HTML', () => {
    const dom = new JSDOM(
        '<!DOCTYPE html><body><div id="spaces-body"></div></body>',
        { runScripts: 'outside-only' }
    );

    const { window } = dom;

    window.eval(renderGroupSource);

    const maliciousName = '<img src=x onerror=alert(1)>';

    window.renderGroup({
        id: 1,
        name: maliciousName,
        priority: 'medium',
        limit: 10
    });

    const groupName = window.document.querySelector('.group-name');

    assert.ok(groupName, 'Group name element should exist');
    assert.equal(groupName.textContent, maliciousName);
    assert.equal(
        groupName.querySelector('img'),
        null,
        'User input must not create an HTML image element'
    );

    dom.window.close();
});

const projectJsStart = mainJs.indexOf('function renderProject(project) {');
const projectJsEnd = mainJs.indexOf('\nfunction activateGroup(', projectJsStart);

if (projectJsStart === -1 || projectJsEnd === -1) {
    throw new Error('Could not find renderProject() in main.js');
}

const renderProjectSource = mainJs.slice(projectJsStart, projectJsEnd);

test('renderProject displays a project name as text, not executable HTML', () => {
    const dom = new JSDOM(
        '<!DOCTYPE html><body><div class="spaces-group" data-group-id="1"><div class="projects"></div></div></body>',
        { runScripts: 'outside-only' }
    );

    const { window } = dom;

    window.eval(renderProjectSource);

    const maliciousName = '<img src=x onerror=alert(1)>';

    window.renderProject({
        id: 10,
        group_id: 1,
        name: maliciousName,
        is_favourite: false
    });

    const projectName = window.document.querySelector('.project-name');

    assert.ok(projectName, 'Project name element should exist');
    assert.equal(projectName.textContent, maliciousName);
    assert.equal(
        projectName.querySelector('img'),
        null,
        'User input must not create an HTML image element'
    );

    dom.window.close();
});

const projectJsPath = path.join(
    __dirname,
    '../../tasks/static/tasks/js/project.js'
);

const projectJs = fs.readFileSync(projectJsPath, 'utf8');
const safeJsPath = path.join(__dirname, '../../tasks/static/tasks/js/safe.js');
const safeJsSource = fs.readFileSync(safeJsPath, 'utf8');

const userIconMatch = projectJs.match(/^const USER_ICON = .*;$/m);
const taskRowStart = projectJs.indexOf('function taskRowHTML(task, projectId) {');
const taskRowEnd = projectJs.indexOf("\ndocument.addEventListener('click'", taskRowStart);

if (!userIconMatch || taskRowStart === -1 || taskRowEnd === -1) {
    throw new Error('Could not find USER_ICON or taskRowHTML() in project.js');
}

const taskRowSource = userIconMatch[0] + '\n' + projectJs.slice(taskRowStart, taskRowEnd);

test('taskRowHTML displays task title and assignee as text, not executable HTML', () => {
    const dom = new JSDOM(
        '<!DOCTYPE html><body><table><tbody id="tasks"></tbody></table></body>',
        { runScripts: 'outside-only' }
    );

    const { window } = dom;
    window.eval(safeJsSource);
    window.eval(taskRowSource);

    const maliciousTitle = '<img src=x onerror=alert(1)>';
    const maliciousAssignee = '<img src=x onerror=alert(2)>';

    const tbody = window.document.getElementById('tasks');
    tbody.innerHTML = window.taskRowHTML({
        id: 1,
        status: 'todo',
        title: maliciousTitle,
        assignee: maliciousAssignee,
        due_date: null,
        priority: 'medium'
    }, 10);

    const titleCell = tbody.querySelector('.task-title-td');
    const assigneeCell = tbody.querySelectorAll('td.task-muted')[0];

    assert.ok(titleCell, 'Task title cell should exist');
    assert.equal(titleCell.textContent, maliciousTitle);
    assert.equal(titleCell.querySelector('img'), null);

    assert.ok(assigneeCell, 'Assignee cell should exist');
    assert.ok(assigneeCell.textContent.includes(maliciousAssignee));
    assert.equal(assigneeCell.querySelector('img'), null);

    dom.window.close();
});


const notificationsStart = mainJs.indexOf('function toggleNotifications() {');
const notificationsEnd = mainJs.indexOf('\nfunction loadNotificationsBadge()', notificationsStart);

if (notificationsStart === -1 || notificationsEnd === -1) {
    throw new Error('Could not find toggleNotifications() in main.js');
}

const notificationsSource = mainJs.slice(notificationsStart, notificationsEnd);

test('toggleNotifications displays notification data as text, not executable HTML', async () => {
    const dom = new JSDOM(
        '<!DOCTYPE html><body><button id="notifications-bell"></button></body>',
        { runScripts: 'outside-only' }
    );

    const { window } = dom;
    const maliciousTitle = '<img src=x onerror=alert(1)>';
    const maliciousProject = '<img src=x onerror=alert(2)>';
    let clickedTaskId = null;

    window.fetch = () => Promise.resolve({
        json: () => Promise.resolve({
            notifications: [{
                id: 42,
                title: maliciousTitle,
                project: maliciousProject,
                due_date: '2026-11-24'
            }]
        })
    });

    window.openTaskProject = (id) => {
        clickedTaskId = id;
    };

    window.eval(
        "const ALERT_ICON = '<svg></svg>';\n" + notificationsSource
    );

    window.toggleNotifications();

    await new Promise(resolve => setTimeout(resolve, 0));

    const item = window.document.querySelector('.notification-item');
    const title = window.document.querySelector('.notification-title');
    const meta = window.document.querySelector('.notification-meta');

    assert.ok(item, 'Notification item should exist');
    assert.equal(title.textContent, maliciousTitle);
    assert.equal(meta.textContent, `${maliciousProject} ? overdue 2026-11-24`);
    assert.equal(item.querySelector('img'), null, 'User input must not create image elements');

    item.click();
    assert.equal(clickedTaskId, 42);

    dom.window.close();
});
