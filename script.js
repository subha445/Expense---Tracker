/* =========================================
   NEON PRO EXPENSE TRACKER
   ========================================= */

const $ = (id) => document.getElementById(id);

const KEYS = {
  transactions: "neon_transactions",
  budget: "neon_monthly_budget",
  goals: "neon_goals",
  theme: "neon_theme",
  pin: "neon_pin_hash",
  light: "neon_light_mode"
};

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

let transactions = loadData(KEYS.transactions, []);
let goals = loadData(KEYS.goals, []);
let budget = Number(localStorage.getItem(KEYS.budget)) || 0;

if (!Array.isArray(transactions)) transactions = [];
if (!Array.isArray(goals)) goals = [];

let currentMonth = new Date();
let selectedDay = null;
let expenseChart = null;
let monthlyChart = null;

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

function saveTransactions() {
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
}

function saveGoals() {
  localStorage.setItem(KEYS.goals, JSON.stringify(goals));
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date) {
  return dateKey(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);
}

function monthTransactions(month) {
  return transactions.filter(t => t.date && t.date.startsWith(month));
}

function total(type, list = transactions) {
  return list
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

/* =========================================
   DASHBOARD
   ========================================= */

function updateDashboard() {
  const income = total("income");
  const expense = total("expense");
  const balance = income - expense;
  const rate = income > 0 ? ((balance / income) * 100) : 0;

  if ($("totalBalance")) $("totalBalance").textContent = money(balance);
  if ($("totalIncome")) $("totalIncome").textContent = money(income);
  if ($("totalExpense")) $("totalExpense").textContent = money(expense);
  if ($("savingsRate")) $("savingsRate").textContent = `${rate.toFixed(1)}%`;

  updateBudget();
  renderTransactions();
  renderCharts();
  renderCalendar();
  renderGoals();
}

/* =========================================
   TRANSACTIONS
   ========================================= */

function renderTransactions() {
  const container = $("transactionList");
  if (!container) return;

  container.replaceChildren();

  const search = ($("searchInput")?.value || "").toLowerCase();
  const typeFilter = $("filterType")?.value || "all";
  const categoryFilter = $("filterCategory")?.value || "all";

  const filtered = [...transactions]
    .filter(t => {
      const matchesSearch =
        (t.description || "").toLowerCase().includes(search) ||
        (t.category || "").toLowerCase().includes(search);

      const matchesType =
        typeFilter === "all" || t.type === typeFilter;

      const matchesCategory =
        categoryFilter === "all" || t.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No transactions found.";
    container.append(empty);
    return;
  }

  filtered.forEach(t => {
    const item = document.createElement("div");
    item.className = "transaction-item";

    const details = document.createElement("div");
    details.className = "transaction-details";

    const name = document.createElement("strong");
    name.textContent = t.description;

    const info = document.createElement("small");
    info.textContent = `${t.category} • ${t.date}`;

    details.append(name, info);

    const amount = document.createElement("strong");
    amount.className = t.type === "income" ? "income" : "expense";
    amount.textContent =
      `${t.type === "income" ? "+" : "-"}${money(t.amount)}`;

    const actions = document.createElement("div");
    actions.className = "transaction-actions";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.type = "button";
    edit.addEventListener("click", () => editTransaction(t.id));

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.type = "button";
    remove.addEventListener("click", () => deleteTransaction(t.id));

    actions.append(edit, remove);
    item.append(details, amount, actions);
    container.append(item);
  });
}

$("transactionForm")?.addEventListener("submit", event => {
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

  const transaction = {
    id: id || String(Date.now()),
    description,
    amount,
    type,
    category,
    date
  };

  if (id) {
    transactions = transactions.map(t =>
      t.id === id ? transaction : t
    );
  } else {
    transactions.push(transaction);
  }

  saveTransactions();
  $("transactionForm").reset();
  $("editId").value = "";
  $("submitButton").textContent = "Add Transaction";
  $("cancelEdit")?.classList.add("hidden");
  $("date").value = dateKey(new Date());

  updateDashboard();
});

function editTransaction(id) {
  const t = transactions.find(item => item.id === id);
  if (!t) return;

  $("editId").value = t.id;
  $("description").value = t.description;
  $("amount").value = t.amount;
  $("type").value = t.type;
  $("category").value = t.category;
  $("date").value = t.date;

  $("submitButton").textContent = "Update Transaction";
  $("cancelEdit")?.classList.remove("hidden");

  $("transactionForm").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;

  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  updateDashboard();
}

$("cancelEdit")?.addEventListener("click", () => {
  $("transactionForm").reset();
  $("editId").value = "";
  $("submitButton").textContent = "Add Transaction";
  $("cancelEdit").classList.add("hidden");
  $("date").value = dateKey(new Date());
});

/* =========================================
   SEARCH AND FILTER
   ========================================= */

$("searchInput")?.addEventListener("input", renderTransactions);
$("filterType")?.addEventListener("change", renderTransactions);
$("filterCategory")?.addEventListener("change", renderTransactions);

/* =========================================
   CHARTS
   ========================================= */

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const expenses = transactions.filter(t => t.type === "expense");
  const categories = {};

  expenses.forEach(t => {
    categories[t.category] =
      (categories[t.category] || 0) + Number(t.amount);
  });

  const labels = Object.keys(categories);
  const values = Object.values(categories);

  const expenseCanvas = $("expenseChart");

  if (expenseCanvas) {
    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(expenseCanvas, {
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

  if (legend) {
    legend.replaceChildren();

    labels.forEach((label, index) => {
      const row = document.createElement("p");
      row.textContent = `${label}: ${money(values[index])}`;
      legend.append(row);
    });
  }

  renderMonthlyChart();
}

function renderMonthlyChart() {
  const canvas = $("monthlyChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = [];
  const incomeData = [];
  const expenseData = [];

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

    incomeData.push(total("income", list));
    expenseData.push(total("expense", list));
  }

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderRadius: 6
        },
        {
          label: "Expenses",
          data: expenseData,
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

/* =========================================
   CALENDAR
   ========================================= */

function renderCalendar() {
  const grid = $("calendarGrid");
  if (!grid) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();

  $("calendarMonth").textContent =
    currentMonth.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric"
    });

  grid.replaceChildren();

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .forEach(day => {
      const label = document.createElement("div");
      label.className = "calendar-weekday";
      label.textContent = day;
      grid.append(label);
    });

  for (let i = 0; i < firstDay.getDay(); i++) {
    const blank = document.createElement("div");
    grid.append(blank);
  }

  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const daily = transactions.filter(t => t.date === key);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (key === dateKey(new Date())) button.classList.add("today");
    if (key === selectedDay) button.classList.add("selected");
    if (daily.length) button.classList.add("has-transactions");

    button.addEventListener("click", () => {
      selectedDay = key;
      renderCalendar();
      showSelectedDay(key);
    });

    grid.append(button);
  }

  if (!selectedDay || !selectedDay.startsWith(monthKey(currentMonth))) {
    selectedDay = dateKey(new Date(year, month, 1));
    showSelectedDay(selectedDay);
  }
}

function showSelectedDay(key) {
  const info = $("selectedDayInfo");
  if (!info) return;

  const daily = transactions.filter(t => t.date === key);
  const income = total("income", daily);
  const expense = total("expense", daily);

  info.textContent = daily.length
    ? `${key} — ${daily.length} transaction(s) | Income: ${money(income)} | Expenses: ${money(expense)}`
    : `${key} — No transactions`;
}

$("prevMonth")?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});

$("nextMonth")?.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});

/* =========================================
   MONTHLY BUDGET
   ========================================= */

function updateBudget() {
  const current = monthTransactions(monthKey(new Date()));
  const spent = total("expense", current);
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  if ($("budgetSpent")) $("budgetSpent").textContent = money(spent);
  if ($("budgetRemaining")) $("budgetRemaining").textContent = money(remaining);
  if ($("budgetProgress")) $("budgetProgress").style.width = `${percent}%`;

  if ($("budgetMessage")) {
    $("budgetMessage").textContent = !budget
      ? "Set a monthly budget to begin."
      : remaining >= 0
        ? `You have ${money(remaining)} left this month.`
        : `You exceeded your budget by ${money(Math.abs(remaining))}.`;
  }

  if ($("budgetAmount")) $("budgetAmount").value = budget || "";
}

$("budgetForm")?.addEventListener("submit", event => {
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

/* =========================================
   SAVINGS GOALS
   ========================================= */

function renderGoals() {
  const container = $("goalsList");
  if (!container) return;

  container.replaceChildren();

  if (!goals.length) {
    const empty = document.createElement("p");
    empty.textContent = "No savings goals yet. Create your first goal!";
    container.append(empty);
    return;
  }

  goals.forEach(goal => {
    const card = document.createElement("div");
    card.className = "goal-card";

    const name = document.createElement("h3");
    name.textContent = goal.name;

    const progressText = document.createElement("p");
    progressText.textContent =
      `${money(goal.saved)} saved of ${money(goal.target)}`;

    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = Math.min(
      100,
      (goal.saved / goal.target) * 100
    );

    const actions = document.createElement("div");
    actions.className = "goal-actions";

    const update = document.createElement("button");
    update.textContent = "Update Saved";
    update.type = "button";
    update.addEventListener("click", () => {
      const value = prompt(
        "Enter your total saved amount:",
        String(goal.saved)
      );

      if (value === null) return;

      const amount = Number(value);

      if (!Number.isFinite(amount) || amount < 0) {
        alert("Enter a valid amount.");
        return;
      }

      goal.saved = amount;
      saveGoals();
      renderGoals();
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (!confirm("Delete this goal?")) return;

      goals = goals.filter(g => g.id !== goal.id);
      saveGoals();
      renderGoals();
    });

    actions.append(update, remove);
    card.append(name, progressText, progress, actions);
    container.append(card);
  });
}

$("goalForm")?.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value);
  const saved = Number($("goalSaved").value || 0);

  if (!name || !Number.isFinite(target) || target <= 0 ||
      !Number.isFinite(saved) || saved < 0) {
    alert("Please enter valid goal details.");
    return;
  }

  goals.push({
    id: String(Date.now()),
    name,
    target,
    saved
  });

  saveGoals();
  $("goalForm").reset();
  renderGoals();
});

/* =========================================
   THEMES
   ========================================= */

function applyTheme(theme) {
  document.body.classList.remove(
    "theme-cyber",
    "theme-pink",
    "theme-green"
  );

  if (theme !== "purple") {
    document.body.classList.add(`theme-${theme}`);
  }

  localStorage.setItem(KEYS.theme, theme);
}

document.querySelectorAll(".theme-choice").forEach(button => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.theme);
  });
});

const savedTheme = localStorage.getItem(KEYS.theme) || "purple";
applyTheme(savedTheme);

function applyLightMode(enabled) {
  document.body.classList.toggle("light-mode", enabled);
  localStorage.setItem(KEYS.light, enabled ? "true" : "false");
}

applyLightMode(localStorage.getItem(KEYS.light) === "true");

$("themeToggle")?.addEventListener("click", () => {
  applyLightMode(!document.body.classList.contains("light-mode"));
});

/* =========================================
   PIN LOCK
   Convenience lock for this browser only.
   ========================================= */

async function hashPin(pin) {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function showLock() {
  $("lockScreen")?.classList.remove("hidden");
}

function hideLock() {
  $("lockScreen")?.classList.add("hidden");
  if ($("pinInput")) $("pinInput").value = "";
  if ($("pinError")) $("pinError").textContent = "";
}

$("unlockButton")?.addEventListener("click", async () => {
  const pin = $("pinInput").value;

  if (!/^\d{4,8}$/.test(pin)) {
    $("pinError").textContent = "Enter your 4–8 digit PIN.";
    return;
  }

  try {
    const savedHash = localStorage.getItem(KEYS.pin);
    const enteredHash = await hashPin(pin);

    if (enteredHash === savedHash) {
      hideLock();
    } else {
      $("pinError").textContent = "Incorrect PIN. Try again.";
    }
  } catch {
    $("pinError").textContent = "PIN feature is unavailable in this browser.";
  }
});

$("pinInput")?.addEventListener("keydown", event => {
  if (event.key === "Enter") $("unlockButton")?.click();
});

$("setPinButton")?.addEventListener("click", async () => {
  const pin = prompt("Create a 4–8 digit PIN:");

  if (pin === null) return;

  if (!/^\d{4,8}$/.test(pin)) {
    alert("PIN must contain 4–8 digits.");
    return;
  }

  const confirmPin = prompt("Confirm your PIN:");

  if (pin !== confirmPin) {
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

$("removePinButton")?.addEventListener("click", async () => {
  const pin = prompt("Enter your current PIN:");

  if (pin === null) return;

  try {
    const savedHash = localStorage.getItem(KEYS.pin);

    if (await hashPin(pin) !== savedHash) {
      alert("Incorrect PIN.");
      return;
    }

    localStorage.removeItem(KEYS.pin);
    alert("PIN removed.");
    hideLock();
  } catch {
    alert("Unable to verify PIN.");
  }
});

if (localStorage.getItem(KEYS.pin)) {
  showLock();
}

/* =========================================
   CSV EXPORT
   ========================================= */

$("exportCSV")?.addEventListener("click", () => {
  if (!transactions.length) {
    alert("No transactions to export.");
    return;
  }

  const rows = [
    ["Description", "Amount", "Type", "Category", "Date"],
    ...transactions.map(t => [
      t.description,
      t.amount,
      t.type,
      t.category,
      t.date
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "neon-expense-report.csv";
  link.click();

  URL.revokeObjectURL(url);
});

/* =========================================
   INITIAL STARTUP
   ========================================= */

if ($("date")) {
  $("date").value = d
