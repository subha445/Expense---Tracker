
/* ==========================================
   NEON PRO — FIXED EXPENSE TRACKER
   ========================================== */

const $ = id => document.getElementById(id);

const KEYS = {
  transactions: "neon_transactions",
  budget: "neon_monthly_budget",
  goals: "neon_goals",
  theme: "neon_theme",
  pin: "neon_pin_hash",
  light: "neon_light_mode"
};

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

let transactions = readJSON(KEYS.transactions, []);
let goals = readJSON(KEYS.goals, []);
let budget = Number(localStorage.getItem(KEYS.budget)) || 0;

if (!Array.isArray(transactions)) transactions = [];
if (!Array.isArray(goals)) goals = [];

let currentMonth = new Date();
let selectedDay = dateKey(new Date());
let expenseChart = null;
let monthlyChart = null;

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function saveTransactions() {
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
}

function saveGoals() {
  localStorage.setItem(KEYS.goals, JSON.stringify(goals));
}

function monthTransactions(key) {
  return transactions.filter(t => t.date && t.date.startsWith(key));
}

function total(type, list = transactions) {
  return list
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

/* ==========================================
   DASHBOARD
   ========================================== */

function updateDashboard() {
  const income = total("income");
  const expense = total("expense");
  const balance = income - expense;
  const rate = income > 0 ? balance / income * 100 : 0;

  $("totalBalance").textContent = money(balance);
  $("totalIncome").textContent = money(income);
  $("totalExpense").textContent = money(expense);
  $("savingsRate").textContent = `${rate.toFixed(1)}%`;

  renderTransactions();
  updateBudget();
  renderCharts();
  renderCalendar();
  renderGoals();
}

/* ==========================================
   TRANSACTIONS — TABLE-CORRECT VERSION
   ========================================== */

function renderTransactions() {
  const body = $("transactionList");
  if (!body) return;

  body.replaceChildren();

  const search = ($("searchInput")?.value || "").toLowerCase();
  const type = $("filterType")?.value || "all";
  const category = $("filterCategory")?.value || "all";

  const filtered = transactions
    .filter(t => {
      const matchesSearch =
        String(t.description || "").toLowerCase().includes(search) ||
        String(t.category || "").toLowerCase().includes(search);

      return matchesSearch &&
        (type === "all" || t.type === type) &&
        (category === "all" || t.category === category);
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-message";
    cell.textContent = "No transactions found. Add your first transaction!";
    row.append(cell);
    body.append(row);
    return;
  }

  filtered.forEach(t => {
    const row = document.createElement("tr");

    const description = document.createElement("td");
    description.textContent = t.description || "Untitled";

    const categoryCell = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = "type-tag";
    tag.textContent = t.category || "Other";
    categoryCell.append(tag);

    const dateCell = document.createElement("td");
    dateCell.textContent = t.date || "";

    const amountCell = document.createElement("td");
    amountCell.className =
      t.type === "income" ? "amount-income" : "amount-expense";
    amountCell.textContent =
      `${t.type === "income" ? "+" : "-"}${money(t.amount)}`;

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "action-buttons";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editTransaction(t.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteTransaction(t.id));

    actions.append(edit, remove);
    actionsCell.append(actions);

    row.append(description, categoryCell, dateCell, amountCell, actionsCell);
    body.append(row);
  });
}

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("editId").value;
  const description = $("description").value.trim();
  const amount = Number($("amount").value);
  const type = $("type").value;
  const category = $("category").value;
  const date = $("date").value;

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Please enter valid transaction details.");
    return;
  }

  const item = {
    id: id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description,
    amount,
    type,
    category,
    date
  };

  if (id) {
    transactions = transactions.map(t =>
      String(t.id) === String(id) ? item : t
    );
  } else {
    transactions.push(item);
  }

  saveTransactions();
  resetTransactionForm();
  updateDashboard();
});

function resetTransactionForm() {
  $("transactionForm").reset();
  $("editId").value = "";
  $("submitButton").textContent = "＋ Add Transaction";
  $("cancelEdit").classList.add("hidden");
  $("date").value = dateKey(new Date());
}

function editTransaction(id) {
  const item = transactions.find(t => String(t.id) === String(id));
  if (!item) return;

  $("editId").value = item.id;
  $("description").value = item.description;
  $("amount").value = item.amount;
  $("type").value = item.type;
  $("category").value = item.category;
  $("date").value = item.date;

  $("submitButton").textContent = "Update Transaction";
  $("cancelEdit").classList.remove("hidden");

  $("transactionForm").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;

  transactions = transactions.filter(t => String(t.id) !== String(id));
  saveTransactions();
  updateDashboard();
}

$("cancelEdit").addEventListener("click", resetTransactionForm);

$("searchInput").addEventListener("input", renderTransactions);
$("filterType").addEventListener("change", renderTransactions);
$("filterCategory").addEventListener("change", renderTransactions);

/* ==========================================
   CHARTS
   ========================================== */

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const categories = {};

  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      const name = t.category || "Other";
      categories[name] = (categories[name] || 0) + Number(t.amount || 0);
    });

  const labels = Object.keys(categories);
  const values = Object.values(categories);

  const canvas = $("expenseChart");

  if (canvas) {
    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          borderWidth: 2,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  const legend = $("categoryLegend");
  legend.replaceChildren();

  labels.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "legend-item";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = `hsl(${index * 47 + 260} 85% 65%)`;

    const label = document.createElement("span");
    label.textContent = name;

    const value = document.createElement("strong");
    value.className = "legend-value";
    value.textContent = money(values[index]);

    row.append(dot, label, value);
    legend.append(row);
  });

  renderMonthlyChart();
}

function renderMonthlyChart() {
  const canvas = $("monthlyChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = [];
  const incomes = [];
  const expenses = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);

    const key = monthKey(date);
    const list = monthTransactions(key);

    labels.push(date.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit"
    }));

    incomes.push(total("income", list));
    expenses.push(total("expense", list));
  }

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomes,
          backgroundColor: "#35e8ff",
          borderRadius: 6
        },
        {
          label: "Expenses",
          data: expenses,
          backgroundColor: "#ff4fd8",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* ==========================================
   CALENDAR
   ========================================== */

function renderCalendar() {
  const grid = $("calendarGrid");
  if (!grid) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0).getDate();

  $("calendarMonth").textContent =
    currentMonth.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric"
    });

  grid.replaceChildren();

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const label = document.createElement("div");
    label.className = "calendar-weekday";
    label.textContent = day;
    grid.append(label);
  });

  for (let i = 0; i < first.getDay(); i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-day empty";
    grid.append(blank);
  }

  for (let day = 1; day <= last; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const daily = transactions.filter(t => t.date === key);
    const spent = total("expense", daily);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    if (key === dateKey(new Date())) button.classList.add("today");
    if (key === selectedDay) button.classList.add("selected");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    button.append(number);

    if (daily.length) {
      const amount = document.createElement("span");
      amount.className = "day-spend";
      amount.textContent = money(spent);
      button.append(amount);
    }

    button.addEventListener("click", () => {
      selectedDay = key;
      renderCalendar();
      showSelectedDay(key);
    });

    grid.append(button);
  }

  if (!selectedDay.startsWith(monthKey(currentMonth))) {
    selectedDay = dateKey(new Date(year, month, 1));
  }

  showSelectedDay(selectedDay);
}

function showSelectedDay(key) {
  const info = $("selectedDayInfo");
  const daily = transactions.filter(t => t.date === key);

  if (!daily.length) {
    info.textContent = `${key} — No transactions`;
    return;
  }

  info.replaceChildren();

  const heading = document.createElement("strong");
  heading.textContent = key;
  info.append(heading);

  daily.forEach(t => {
    const line = document.createElement("div");
    line.textContent =
      `${t.description} (${t.category}) — ${t.type === "income" ? "+" : "-"}${money(t.amount)}`;
    info.append(line);
  });

  const summary = document.createElement("p");
  summary.textContent =
    `Income: ${money(total("income", daily))} | Expenses: ${money(total("expense", daily))}`;
  info.append(summary);
}

$("prevMonth").addEventListener("click", () => {
  currentMonth.setDate(1);
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  currentMonth.setDate(1);
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

/* ==========================================
   MONTHLY BUDGET
   ========================================== */

function updateBudget() {
  const spent = total("expense", monthTransactions(monthKey(new Date())));
  const remaining = budget - spent;
  const percentage = budget > 0
    ? Math.min(100, spent / budget * 100)
    : 0;

  $("budgetSpent").textContent = money(spent);
  $("budgetRemaining").textContent = budget ? money(remaining) : "Not set";
  $("budgetProgress").style.width = `${percentage}%`;
  $("budgetAmount").value = budget || "";

  $("budgetMessage").textContent = !budget
    ? "Set a monthly budget to begin."
    : remaining >= 0
      ? `You have ${money(remaining)} left this month.`
      : `You exceeded your budget by ${money(Math.abs(remaining))}.`;
}

$("budgetForm").addEventListener("submit", event => {
  event.preventDefault();

  const value = Number($("budgetAmount").value);

  if (!Number.isFinite(value) || value <= 0) {
    alert("Enter a valid budget.");
    return;
  }

  budget = value;
  localStorage.setItem(KEYS.budget, String(budget));
  updateBudget();
});

/* ==========================================
   SAVINGS GOALS
   ========================================== */

function renderGoals() {
  const container = $("goalsList");
  container.replaceChildren();

  if (!goals.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "No goals yet. Create your first savings goal!";
    container.append(empty);
    return;
  }

  goals.forEach(goal => {
    const card = document.createElement("article");
    card.className = "goal-card";

    const name = document.createElement("h3");
    name.textContent = goal.name;

    const description = document.createElement("p");
    description.textContent =
      `${money(goal.saved)} saved of ${money(goal.target)}`;

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width =
      `${Math.min(100, goal.saved / goal.target * 100)}%`;

    track.append(fill);

    const actions = document.createElement("div");
    actions.className = "goal-actions";

    const update = document.createElement("button");
    update.type = "button";
    update.textContent = "Update Saved";

    update.addEventListener("click", () => {
      const answer = prompt("Enter total saved amount:", goal.saved);
      if (answer === null) return;

      const amount = Number(answer);

      if (!Number.isFinite(amount) || amount < 0) {
        alert("Enter a valid amount.");
        return;
      }

      goal.saved = amount;
      saveGoals();
      renderGoals();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      if (!confirm("Delete this goal?")) return;

      goals = goals.filter(g => g.id !== goal.id);
      saveGoals();
      renderGoals();
    });

    actions.append(update, remove);
    card.append(name, description, track, actions);
    container.append(card);
  });
}

$("goalForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value);
  const saved = Number($("goalSaved").value);

  if (!name || !Number.isFinite(target) || target <= 0 ||
      !Number.isFinite(saved) || saved < 0) {
    alert("Enter valid goal details.");
    return;
  }

  goals.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    target,
    saved
  });

  saveGoals();
  $("goalForm").reset();
  $("goalSaved").value = 0;
  renderGoals();
});

/* ==========================================
   NEON THEMES
   ========================================== */

function applyTheme(theme) {
  const valid = ["purple", "cyber", "pink", "green"];
  if (!valid.includes(theme)) theme = "purple";

  document.body.classList.remove(
    "theme-cyber",
    "theme-pink",
    "theme-green"
  );

  if (theme !== "purple") {
    document.body.classList.add(`theme-${theme}`);
  }

  document.querySelectorAll(".theme-choice").forEach(button => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });

  localStorage.setItem(KEYS.theme, theme);
}

document.querySelectorAll(".theme-choice").forEach(button => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.theme);
  });
});

applyTheme(localStorage.getItem(KEYS.theme) || "purple");

function applyLightMode(enabled) {
  document.body.classList.toggle("light-mode", enabled);
  localStorage.setItem(KEYS.light, String(enabled));
}

applyLightMode(localStorage.getItem(KEYS.light) === "true");

$("themeToggle").addEventListener("click", () => {
  applyLightMode(!document.body.classList.contains("light-mode"));
});

/* ==========================================
   PIN LOCK
   Basic browser convenience feature only.
   ========================================== */

async function hashPin(pin) {
  if (!crypto.subtle) throw new Error("Secure crypto unavailable");

  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function showLock() {
  $("lockScreen").classList.remove("hidden");
}

function hideLock() {
  $("lockScreen").classList.add("hidden");
  $("pinInput").value = "";
  $("pinError").textContent = "";
}

$("unlockButton").addEventListener("click", async () => {
  const pin = $("pinInput").value;

  if (!/^\d{4,8}$/.test(pin)) {
    $("pinError").textContent = "Enter your 4–8 digit PIN.";
    return;
  }

  try {
    const saved = localStorage.getItem(KEYS.pin);
    const entered = await hashPin(pin);

    if (entered === saved) {
      hideLock();
    } else {
      $("pinError").textContent = "Incorrect PIN. Try again.";
    }
  } catch {
    $("pinError").textContent = "PIN is unavailable in this browser.";
  }
});

$("pinInput").addEventListener("keydown", event => {
  if (event.key === "Enter") $("unlockButton").click();
});

$("setPinButton").addEventListener("click", async () => {
  const pin = prompt("Create a 4–8 digit PIN:");
  if (pin === null) return;

  if (!/^\d{4,8}$/.test(pin)) {
    alert("PIN must contain 4–8 digits.");
    return;
  }

  if (prompt("Confirm your PIN:") !== pin) {
    alert("PINs do not match.");
    return;
  }

  try {
    localStorage.setItem(KEYS.pin, await hashPin(pin));
    alert("PIN created successfully!");
  } catch {
    alert("PIN setup is unavailable in this browser.");
  }
});

$("removePinButton").addEventListener("click", async () => {
  const pin = prompt("Enter your current PIN:");
  if (pin === null) return;

  try {
    $("removePinButton").addEventListener("click", async () => {
  const pin = prompt("Enter your current PIN:");
  if (pin === null) return;

  try {
    if (await hashPin(pin) !== localStorage.getItem(KEYS.pin)) {
      alert("Incorrect PIN.");
      return;
    }

    localStorage.removeItem(KEYS.pin);
    alert("PIN removed successfully!");
  } catch {
    alert("Could not remove PIN.");
  }
});

// Initialize the expense tracker
if (localStorage.getItem(KEYS.pin)) {
  showLock();
}

resetTransactionForm();
updateDashboard();
