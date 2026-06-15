let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
const description = document.getElementById("description");
const amount = document.getElementById("amount");
const type = document.getElementById("type");
const addBtn = document.getElementById("addBtn");

const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const history = document.getElementById("transaction-list");

let totalIncome = 0;
let totalExpense = 0;

addBtn.addEventListener("click", () => {

    const desc = description.value;
    const amt = Number(amount.value);
    const transactionType = type.value;

    if (desc === "" || amt <= 0) {
        alert("Please enter valid details");
        return;
    }

    if (transactionType === "income") {
        totalIncome += amt;
    } else {
        totalExpense += amt;
    }

    income.textContent = "₹" + totalIncome;
    expense.textContent = "₹" + totalExpense;
    balance.textContent = "₹" + (totalIncome - totalExpense);

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${desc}</td>
        <td>₹${amt}</td>
        <td>${transactionType}</td>
    `;

    history.appendChild(row);

    description.value = "";
    amount.value = "";
});
