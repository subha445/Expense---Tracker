const addBtn = document.getElementById("addBtn");

const description = document.getElementById("description");
const amount = document.getElementById("amount");
const type = document.getElementById("type");

const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");

const transactionList = document.getElementById("transaction-list");

let totalBalance = 0;
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

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${desc}</td>
        <td>₹${amt}</td>
        <td>${transactionType}</td>
    `;

    transactionList.appendChild(row);

    if (transactionType === "income") {
        totalIncome += amt;
        totalBalance += amt;
    } else {
        totalExpense += amt;
        totalBalance -= amt;
    }

    income.textContent = `₹${totalIncome}`;
    expense.textContent = `₹${totalExpense}`;
    balance.textContent = `₹${totalBalance}`;

    description.value = "";
    amount.value = "";
});
