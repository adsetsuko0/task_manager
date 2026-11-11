import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
CSS = ROOT / "tasks/static/tasks/css"
JS = ROOT / "tasks/static/tasks/js"
TPL = ROOT / "tasks/templates/tasks"

problems = []


def read(p):
    return p.read_bytes().decode("utf-8")


def write(p, s):
    p.write_bytes(s.encode("utf-8"))


def nl_of(text):
    return "\r\n" if "\r\n" in text else "\n"


def expect(name, count, minimum=1):
    if count < minimum:
        problems.append(f"НЕ НАЙДЕНО: {name}")
        print(f"  [!] не найдено: {name}")
    else:
        print(f"  [ok] {name}: {count}")


# ----------------------------------------------------------------- CSS ------
ACCENT_BLOCK = """/*===ACCENT (нейтральный, переключается вместе с темой)===*/
:root {
    --accent: #2b2b2b;            /* текст, рамки, заливка кнопок */
    --accent-hover: #000000;      /* наведение */
    --accent-contrast: #ffffff;   /* текст на заливке акцента */
    --accent-soft: rgba(0, 0, 0, 0.06);   /* лёгкая подложка */
    --accent-ring: rgba(0, 0, 0, 0.15);   /* тень при фокусе */
}

body.dark-theme {
    --accent: #d4d4d4;
    --accent-hover: #ffffff;
    --accent-contrast: #161616;
    --accent-soft: rgba(255, 255, 255, 0.08);
    --accent-ring: rgba(255, 255, 255, 0.18);
}

"""

HEX_MAP = [
    (r"#7c76f0", "var(--accent)"),
    (r"#6a64d8", "var(--accent-hover)"),
    (r"#6f6ad2", "var(--accent-hover)"),
    (r"#514da4", "var(--accent)"),
    (r"#746fc8", "var(--accent)"),
    (r"#1a1a2e", "#2a2a2a"),
    (r"#2a2a3a", "#2a2a2a"),
    (r"#eef2ff", "#ededed"),
    (r"#f5f4ff", "#f2f2f2"),
]

RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")
SOLID = re.compile(r"(?<![\w-])background(?:-color)?\s*:\s*var\(--accent(?:-hover)?\)")
WHITE = re.compile(
    r"(?<![\w-])color\s*:\s*(?:white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))",
    re.I,
)
ANY_COLOR = re.compile(r"(?<![\w-])color\s*:")

solid_without_text_color = []


def fix_rule(m):
    sel_raw, body = m.group(1), m.group(2)
    sel = " ".join(re.sub(r"/\*.*?\*/", "", sel_raw, flags=re.S).split())

    # В тёмной теме базовый цвет кнопки это --accent, при наведении --accent-hover
    if sel == "body.dark-theme .btn-primary, body.dark-theme .btn-create":
        body = re.sub(r"(background(?:-color)?\s*:\s*)var\(--accent-hover\)", r"\1var(--accent)", body)
    elif sel == "body.dark-theme .btn-primary:hover, body.dark-theme .btn-create:hover":
        body = re.sub(r"(background(?:-color)?\s*:\s*)var\(--accent\)", r"\1var(--accent-hover)", body)

    # Текст на залитой кнопке: вместо белого берём цвет, который контрастен акценту
    if SOLID.search(body):
        if WHITE.search(body):
            body = WHITE.sub("color: var(--accent-contrast)", body)
        elif not ANY_COLOR.search(body):
            solid_without_text_color.append(sel)
    return f"{sel_raw}{{{body}}}"


def recolor_css(text):
    # особые случаи до общей замены
    text = re.sub(r"(border-left\s*:\s*4px\s+solid\s+)#514da4", r"\1#8a8a8a", text, flags=re.I)
    text = re.sub(
        r"linear-gradient\(\s*90deg\s*,\s*#7c76f0\s*,\s*#9b97e8\s*\)",
        "var(--accent)",
        text,
        flags=re.I,
    )
    text = re.sub(r"rgba\(\s*124\s*,\s*118\s*,\s*240\s*,\s*0?\.2\s*\)", "var(--accent-ring)", text)
    text = re.sub(r"rgba\(\s*124\s*,\s*118\s*,\s*240\s*,\s*[0-9.]+\s*\)", "var(--accent-soft)", text)
    for old, new in HEX_MAP:
        text = re.sub(old + r"(?![0-9a-fA-F])", new, text, flags=re.I)
    text = RULE.sub(fix_rule, text)
    return text


print("CSS:")
for css in sorted(CSS.glob("*.css")):
    t = read(css)
    new = recolor_css(t)
    if css.name == "style.css" and "--accent:" not in new:
        nl = nl_of(new)
        new = ACCENT_BLOCK.replace("\n", nl) + new
    if new != t:
        write(css, new)
        print(f"  [ok] {css.name}: обновлён")
    else:
        print(f"  [--] {css.name}: без изменений")

# ------------------------------------------------------- шаблоны и JS ------
print("Страницы входа и регистрации (свои стили внутри файла):")
for name in ("login.html", "register.html"):
    p = TPL / name
    if not p.exists():
        continue
    t = read(p)
    new = re.sub(r"#7c76f0(?![0-9a-fA-F])", "#2b2b2b", t, flags=re.I)
    new = re.sub(r"#6a64d8(?![0-9a-fA-F])", "#000000", new, flags=re.I)
    if new != t:
        write(p, new)
        print(f"  [ok] {name}")

print("Графики дашборда:")
dash = JS / "dashboard.js"
t = read(dash)
new = (
    t.replace("#9d9ad6", "#9a9a9a")
    .replace("rgba(124,118,240,0.1)", "rgba(154,154,154,0.15)")
    .replace('style="background:#eef2ff"', 'style="background:rgba(128,128,128,0.18)"')
)
if new != t:
    write(dash, new)
    print("  [ok] dashboard.js")

# --------------------------------------------------- иконки вместо эмодзи ---
USER_SVG = (
    '<svg class="user-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    'stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
)
ALERT_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
    'stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16'
    'a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
)

print("project.js (иконка пользователя):")
pj = JS / "project.js"
t = read(pj)
nl = nl_of(t)
n_before = t.count("👤")
if n_before:
    c = t.count(">👤 ${u.username}</div>")
    t = t.replace(">👤 ${u.username}</div>", ">${USER_ICON} ${u.username}</div>")
    expect("список исполнителей (div)", c, 2)

    c = t.count("td.textContent = userId ? '👤 ' + username : '—';")
    t = t.replace("td.textContent = userId ? '👤 ' + username : '—';", "setAssigneeCell(td, userId, username);")
    expect("ячейка исполнителя в таблице", c, 2)

    c = t.count(">👤 ${v}</div>")
    t = t.replace(">👤 ${v}</div>", ">${USER_ICON} ${v}</div>")
    expect("группировка по исполнителю", c, 1)

    c = t.count("${task.assignee ? '👤 ' + task.assignee :")
    t = t.replace("${task.assignee ? '👤 ' + task.assignee :", "${task.assignee ? USER_ICON + ' ' + task.assignee :")
    expect("исполнитель в карточке задачи", c, 2)

    c = t.count('<option value="${u.id}">👤 ${u.username}</option>')
    t = t.replace('<option value="${u.id}">👤 ${u.username}</option>', '<option value="${u.id}">${u.username}</option>')
    expect("выпадающий список (option)", c, 1)

    if "👤" in t:
        problems.append("в project.js остались эмодзи 👤")
        print("  [!] в project.js остались эмодзи 👤")

if "const USER_ICON" not in t:
    header = (
        "// Монохромная иконка пользователя (цвет берёт у текста вокруг)" + nl
        + "const USER_ICON = '" + USER_SVG + "';" + nl + nl
        + "function setAssigneeCell(td, userId, username) {" + nl
        + "    td.textContent = '';" + nl
        + "    if (!userId) { td.textContent = '—'; return; }" + nl
        + "    td.insertAdjacentHTML('beforeend', USER_ICON + ' ');" + nl
        + "    td.appendChild(document.createTextNode(username));" + nl
        + "}" + nl + nl
    )
    t = header + t
write(pj, t)

print("main.js (иконка в уведомлениях):")
mj = JS / "main.js"
t = read(mj)
nl = nl_of(t)
t2, c = re.subn(r'<div class="notification-icon">⚠\ufe0f?</div>', '<div class="notification-icon">${ALERT_ICON}</div>', t)
if c:
    t = t2
    expect("значок предупреждения", c, 1)
if "const ALERT_ICON" not in t:
    t = "const ALERT_ICON = '" + ALERT_SVG + "';" + nl + nl + t
write(mj, t)

print("main.html:")
mh = TPL / "main.html"
t = read(mh)
if "👤" in t or "#7c76f0" in t:
    c = t.count('style="background:#7c76f0"')
    t = t.replace('style="background:#7c76f0"', 'style="background:var(--accent);color:var(--accent-contrast)"')
    expect("кнопки Move и Log out", c, 2)
    c = t.count('<option value="">👤 Unassigned</option>')
    t = t.replace('<option value="">👤 Unassigned</option>', '<option value="">Unassigned</option>')
    expect("пункт Unassigned", c, 1)
    c = t.count(">👤 Assignees</button>")
    t = t.replace(">👤 Assignees</button>", ">" + USER_SVG + " Assignees</button>")
    expect("кнопка Assignees", c, 1)
    write(mh, t)
else:
    print("  [--] уже обновлён")

# CSS для иконок
print("CSS для иконок:")
pc = CSS / "project.css"
t = read(pc)
if ".user-icon" not in t:
    nl = nl_of(t)
    t += nl + "/*===MONO ICONS===*/" + nl + ".user-icon {" + nl + "    width: 14px;" + nl + "    height: 14px;" + nl \
         + "    vertical-align: -2px;" + nl + "    opacity: 0.75;" + nl + "    flex-shrink: 0;" + nl + "}" + nl
    write(pc, t)
    print("  [ok] .user-icon добавлен в project.css")
sc = CSS / "style.css"
t = read(sc)
if "/*===NOTIFICATION ICON===*/" not in t:
    nl = nl_of(t)
    t += nl + "/*===NOTIFICATION ICON===*/" + nl + ".notification-icon {" + nl + "    display: flex;" + nl \
         + "    opacity: 0.75;" + nl + "}" + nl
    write(sc, t)
    print("  [ok] стиль иконки уведомлений добавлен в style.css")

# ------------------------------------------------------------ итог ---------
print()
needs_check = [
    x for x in solid_without_text_color
    if ":hover" not in x and "progress-bar" not in x
]
if needs_check:
    print("Залитые кнопки без явного цвета текста (проверь глазами в обеих темах):")
    for x in needs_check:
        print("   ", x)
if problems:
    print("ЕСТЬ ПРОБЛЕМЫ:")
    for p in problems:
        print("   -", p)
    sys.exit(1)
print("Готово. Проверь страницу (Ctrl+F5) в светлой и тёмной теме.")
