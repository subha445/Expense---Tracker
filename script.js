const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "neon_transactions";
const BUDGET_KEY = "neon_monthly_budget";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let monthlyBudget = Number(localStorage.getItem(BUDGET_KEY) || 0);
let expenseChart = null;

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

const today = new Date().toLocaleDateString("en-CA");
$("date").value = today;

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function updateDashboard() {
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;
  const savings = income > 0 ? (balance / income) * 100 : 0;

  $("totalBalance").textContent = money(balance);
  $("totalIncome").textContent = money(income);
  $("totalExpense").textContent = money(expense);
  $("savingsRate").textContent = `${savings.toFixed(1)}%`;

  updateBudget();
  updateChart();
}

function updateBudget() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const spent = transactions
    .filter(t => {
      const d = new Date(t.date + "T00:00:00");
      return t.type === "expense" &&
        d.getMonth() === month &&
        d.getFullYear() === year;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  $("budgetSpent").textContent = money(spent);
  $("budgetRemaining").textContent = monthlyBudget
    ? money(monthlyBudget - spent)
    : "Not set";

  const percent = monthlyBudget
    ? Math.min((spent / monthlyBudget) * 100, 100)
    : 0;

  $("budgetProgress").style.width = percent + "%";

  $("budgetMessage").textContent = !monthlyBudget
    ? "Set a monthly budget to start tracking."
    : spent > monthlyBudget
      ? "You've crossed your monthly budget."
      : `${Math.max(0, 100 - (spent / monthlyBudget) * 100).toFixed(1)}% of your budget remains.`;
}

function updateChart() {
  const totals = {};

  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

  const labels = Object.keys(totals);
  const values = Object.values(totals);

  const colors = [
    "#a855f7", "#ff4fd8", "#35e8ff",
    "#43e6a1", "#ffb454", "#7c8cff",
    "#ff668d", "#b8a0ff", "#5dd6c0", "#aaa0bc"
  ];

  const canvas = $("expenseChart");

  if (expenseChart) {
    expenseChart.destroy();
    expenseChart = null;
  }

  expenseChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: "#11111f",
        borderWidth: 4,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context =>
              `${context.label}: ${money(context.raw)}`
          }
        }
      }
    }
  });

  $("categoryLegend").replaceChildren();

  if (!labels.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Add expenses to see your breakdown.";
    $("categoryLegend").appendChild(empty);
    return;
  }

  labels.forEach((label, index) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = colors[index % colors.length];

    const name = document.createElement("span");
    name.textContent = label;

    const amount = document.createElement("strong");
    amount.className = "legend-value";
    amount.textContent = money(values[index]);

    item.append(dot, name, amount);
    $("categoryLegend").appendChild(item);
  });
}

function renderTransactions() {
  const search = $("searchInput").value.toLowerCase();
  const type = $("filterType").value;
  const category = $("filterCategory").value;

  const filtered = transactions
    .filter(t =>
      t.description.toLowerCase().includes(search) &&
      (type === "all" || t.type === type) &&
      (category === "all" || t.category === category)
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const tbody = $("transactionList");
  tbody.replaceChildren();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-message";
    cell.textContent = "No matching transactions found.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  filtered.forEach(t => {
    const row = document.createElement("tr");

    const description = document.createElement("td");
    description.textContent = t.description;

    const categoryCell = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = "type-tag";
    tag.textContent = t.category;
    categoryCell.appendChild(tag);

    const date = document.createElement("td");
    date.textContent = t.date;

    const amount = document.createElement("td");
    amount.className = t.type === "income"
      ? "amount-income"
      : "amount-expense";
    amount.textContent =
      `${t.type === "income" ? "+" : "−"}${money(t.amount)}`;

    const actions = document.createElement("td");
    const buttons = document.createElement("div");
    buttons.className = "action-buttons";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editTransaction(t.id));

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.className = "delete-button";
    remove.addEventListener("click", () => deleteTransaction(t.id));

    buttons.append(edit, remove);
    actions.appendChild(buttons);

    row.append(description, categoryCell, date, amount, actions);
    tbody.appendChild(row);
  });
}

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const description = $("description").value.trim();
  const amount = Number($("amount").value);
  const type = $("type").value;
  const category = $("category").value;
  const date = $("date").value;
  const editId = Number($("editId").value);

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Please enter valid transaction details.");
    return;
  }

  if (editId) {
    const index = transactions.findIndex(t => t.id === editId);

    if (index !== -1) {
      transactions[index] = {
        ...transactions[index],
        description,
        amount,
        type,
        category,
        date
      };
    }
  } else {
    transactions.push({
      id: Date.now(),
      description,
      amount,
      type,
      category,
      date
    });
  }

  saveData();
  updateDashboard();
  renderTransactions();
  resetForm();
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
  $("submitButton").textContent = "Save Changes";
  $("cancelEdit").classList.remove("hidden");

  $("transactions").scrollIntoView({ behavior: "smooth" });
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;

  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateDashboard();
  renderTransactions();
}

function resetForm() {
  $("transactionForm").reset();
  $("editId").value = "";
  $("date").value = today;
  $("submitButton").textContent = "＋ Add Transaction";
  $("cancelEdit").classList.add("hidden");
}

$("cancelEdit").addEventListener("click", resetForm);

$("budgetForm").addEventListener("submit", event => {
  event.preventDefault();

  const value = Number($("budgetAmount").value);

  if (!Number.isFinite(value) || value <= 0) {
    alert("Enter a valid budget.");
    return;
  }

  monthlyBudget = value;
  saveData();
  updateBudget();
  $("budgetAmount").value = "";
});

["searchInput", "filterType", "filterCategory"].forEach(id => {
  $(id).addEventListener("input", renderTransactions);
  $(id).addEventListener("change", renderTransactions);
});

$("exportCSV").addEventListener("click", () => {
  if (!transactions.length) {
    alert("No transactions to export.");
    return;
  }

  const rows = [
    ["Description", "Amount", "Type", "Category", "Date"],
    ...transactions.map(t => [
      t.description, t.amount, t.type, t.category, t.date
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "neon-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
});

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  $("themeToggle").textContent =
    document.body.classList.contains("light-mode") ? "☾" : "☼";
});

updateDashboard();
renderTransactions();
