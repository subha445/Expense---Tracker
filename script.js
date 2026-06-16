const description = document.getElementById("description");
const amount = document.getElementById("amount");
const type = document.getElementById("type");
const addBtn = document.getElementById("addBtn");

const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const transactionList = document.getElementById("transaction-list");

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function saveTransactions() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

function updateUI() {

    transactionList.innerHTML = "";

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((transaction, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${transaction.description}</td>
            <td>₹${transaction.amount}</td>
            <td>${transaction.type}</td>
            <td>
                <button onclick="deleteTransaction(${index})">
                    Delete
                </button>
            </td>
        `;

        transactionList.appendChild(row);

        if (transaction.type === "income") {
            totalIncome += transaction.amount;
        } else {
            totalExpense += transaction.amount;
        }
    });

    income.textContent = "₹" + totalIncome;
    expense.textContent = "₹" + totalExpense;
    balance.textContent = "₹" + (totalIncome - totalExpense);
}

addBtn.addEventListener("click", () => {

    const desc = description.value.trim();
    const amt = Number(amount.value);
    const transactionType = type.value;

    if (desc === "" || amt <= 0) {
        alert("Please enter valid details");
        return;
    }

    transactions.push({
        description: desc,
        amount: amt,
        type: transactionType
    });

    saveTransactions();
    updateUI();

    description.value = "";
    amount.value = "";
});

function deleteTransaction(index) {
    transactions.splice(index, 1);
    saveTransactions();
    updateUI();
}

updateUI();
