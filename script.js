document.addEventListener("DOMContentLoaded", function () {
  const worker = new Worker("worker.js");

  const userLocale = navigator.language || navigator.userLanguage;
  const formatter = new Intl.NumberFormat(userLocale, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const transactionForm = document.getElementById("entry-form");
  const typeInput = document.getElementById("type");
  const typeRadio = document.querySelectorAll('input[name="types"]');
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");
  const dateInput = document.getElementById("date");
  const tBody = document.getElementById("transactions-tbody");
  const cBalance = document.getElementById("closing-balance");
  const submitBtn = document.getElementById("submit-btn");
  const cashBtn = document.getElementById("the-cash");
  const userBtn = document.getElementById("the-user");
  const userForm = document.getElementById("user-form");
  const uNameInput = document.getElementById("user-name");
  const cashForm = document.getElementById("cash-form");
  const cNameInput = document.getElementById("cash-name");
  const cSymbolInput = document.getElementById("cash-symbol");
  const openBalInput = document.getElementById("open-bal");
  const openDateInput = document.getElementById("open-date");
  const editModal = document.getElementById("edit-modal");
  const editModalLabel = document.getElementById("edit-modal-label");
  const mdlEditBtn = document.getElementById("modal-edit-btn");
  const mdlDltBtn = document.getElementById("modal-delete-btn");
  const rcpt = document.getElementById("rcpt");
  const pymt = document.getElementById("pymt");

  let cBook = [];
  let closingBalance = 0.0;

  let isUpdating = 0;
  let updatingID = null;

  function clearTable() {
    // Clear existing transactions
    while (tBody.children.length > 0) {
      tBody.removeChild(tBody.lastChild);
    }
  }

  function processTransactions(transactions) {
    cBook = transactions;
    // cBook.sort((a, b) => a.date > b.date);

    // console.log("cbook is " + JSON.stringify(cBook));

    closingBalance = formatter.format(
      cBook.reduce((p, c) => {
        // console.log("p is " + p);
        return p + c.amount;
      }, 0)
    );
    // console.log("closing is " + closingBalance);

    renderTransactions();
  }

  // Function to render transactions
  function renderTransactions() {
    clearTable();
    cBook.forEach(function (transaction) {
      addTransactionRow(
        transaction.amount,
        transaction.description,
        transaction.date,
        transaction.id
      );
    });
    cBalance.innerHTML = closingBalance;
    // console.log(JSON.stringify(cBook));
  }

  // Function to add a new row
  function addTransactionRow(amount, description, date, id) {
    const dateCell = document.createElement("td");
    dateCell.textContent = date;
    dateCell.classList.add("col-3");
    dateCell.classList.add("text-center");

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = description;
    descriptionCell.classList.add("col-6");

    const amountCell = document.createElement("td");
    amountCell.textContent = formatter.format(amount);
    amountCell.classList.add("col-3");
    amountCell.classList.add("text-end");

    let tRow = document.createElement("tr");
    tRow.classList.add("transaction-row");

    tRow.setAttribute("data-id", id);

    tRow.appendChild(dateCell);
    tRow.appendChild(descriptionCell);
    tRow.appendChild(amountCell);
    tBody.appendChild(tRow);

    tRow.addEventListener("click", function () {
      editModalLabel.innerText =
        (amount < 0 ? "Payment" : "Receipt") +
        " of " +
        formatter.format(Math.abs(amount));
      mdlEditBtn.addEventListener("click", function () {
        updateForm(date, description, amount, id);
      });
      mdlDltBtn.addEventListener("click", function () {
        worker.postMessage({ action: "deleteTransaction", data: { id: id } });
        clearFields();
      });

      new bootstrap.Modal(editModal).show();
    });

    // console.log("inserted");
  }

  // // Initial render
  worker.postMessage({ action: "getTransactions" });
  worker.postMessage({ action: "addPrimary" });

  // Listen for messages from the worker
  worker.onmessage = function (event) {
    const { action, data } = event.data;
    console.log(data);
    if (action === "getTransactions") {
      processTransactions(data);
    } else if (action === "refresh") {
      worker.postMessage({ action: "getTransactions" });
    } else if (action === "userChanged") {
      worker.postMessage({ action: "getUsers" });
    } else if (action === "updateUsers") {
      updateUserForm(data[0]);
    } else if (action === "accountChanged") {
      worker.postMessage({ action: "getAccounts" });
    } else if (action === "updateAccounts") {
      updateCashForm(data[0]);
    }
  };

  // Form submission handler
  transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    let type;

    // const type = typeInput.value;

    for (const radioButton of typeRadio) {
      if (radioButton.checked) {
        type = radioButton.value;
        console.log("type is " + type);
        break;
      }
    }
    console.log(type);

    const amount = parseFloat(amountInput.value) * 1000;
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    const editable = true;
    const added = new Date();
    const modified = new Date();

    if (isNaN(amount) || description === "" || date === "") {
      alert("Please enter a valid amount, description, and date.");
      return;
    }

    const transactionAmount = type === "payment" ? -amount : amount;
    if (isUpdating) {
      let id = transactionForm.getAttribute("data-id");
      worker.postMessage({
        action: "updateTransaction",
        data: {
          id: Number.parseInt(id),
          amount: transactionAmount,
          description,
          date,
          editable,
          added,
          modified,
        },
      });
      isUpdating = false;
      transactionForm.setAttribute("data-id", "");
    } else {
      worker.postMessage({
        action: "addTransaction",
        data: {
          amount: transactionAmount,
          description,
          date,
          editable,
          added,
          modified,
        },
      });
    }

    console.log(type.concat(transactionAmount, description, date));

    clearFields();
    dateInput.value = date;
    descriptionInput.focus();
  });

  transactionForm.addEventListener("reset", function (event) {
    transactionForm.setAttribute("data-id", "");
    submitBtn.innerText = "Add transaction";
    dateInput.focus();
  });

  function updateForm(date, description, amount, id) {
    let ttype = amount < 0 ? "payment" : "receipt";
    amount = amount < 0 ? -amount : amount;
    amountInput.value = amount;
    descriptionInput.value = description;
    dateInput.value = date;
    for (const radioButton of typeRadio) {
      if (radioButton.value === ttype) {
        radioButton.checked = true;
      } else {
        radioButton.checked = false;
      }
    }
    isUpdating = true;
    transactionForm.setAttribute("data-id", id);
    submitBtn.innerText = "Update transaction";
  }
  // temporary function for single user
  function updateUserForm(data) {
    uNameInput.value = data.name;
    userForm.setAttribute("data-user-id", data.id);
    userBtn.innerText = data.name;
    localStorage.setItem("user-id", data.id);
  }
  // temporary function for single cash
  function updateCashForm(data) {
    cNameInput.value = data.name;
    cSymbolInput.value = data.symbol;
    openBalInput.value = data.openBal;
    openDateInput.value = data.openDate;
    cashForm.setAttribute("data-cash-id", data.id);
    cashBtn.textContent = data.name;
    localStorage.setItem("cash-id", data.id);
    localStorage.setItem("decimal", data.decimals);
  }

  function updateCash() {
    console.log("updatingCash");
    worker.postMessage({
      action: "updateAccount",
      data: {
        name: cNameInput.value,
        symbol: cSymbolInput.value,
        openBal: openBalInput.value,
        openDate: openDateInput.value,
        id: Number.parseInt(cashForm.getAttribute("data-cash-id")),
        decimals: 3,
        users: [],
        added: new Date(),
      },
    });
  }
  function updateUser() {
    console.log("updating user");
    worker.postMessage({
      action: "updateUser",
      data: {
        name: uNameInput.value,
        id: Number.parseInt(userForm.getAttribute("data-user-id")),
        password: "",
      },
    });
  }

  function clearFields() {
    amountInput.value = "";
    descriptionInput.value = "";
    transactionForm.setAttribute("data-id", "");
    isUpdating = false;
    submitBtn.innerText = "Add transaction";
  }

  cashForm.addEventListener("submit", updateCash);

  userForm.addEventListener("submit", updateUser);

  document.addEventListener("keydown", function (event) {
    // Check if the Ctrl, Shift, and 'Z' keys are pressed
    if (event.ctrlKey && event.shiftKey && event.key === "+") {
      event.preventDefault(); // Prevent the default action
      let xx = pymt.checked;

      pymt.checked = !xx;
      rcpt.checked = xx;
    }
  });
});

// scroll up table
document.addEventListener("DOMContentLoaded", function () {
  var tableContainer = document.getElementById("transactions-div");
  tableContainer.scrollTop = tableContainer.scrollHeight;

  const worker = new Worker("worker.js");

  function generateRandomTransactions() {
    // Array to store the generated transactions
    let transactions = [];

    // Function to generate a random date within a range
    function randomDate(start, end) {
      return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
    }

    // Generate 100 random transactions
    for (let i = 0; i < 100; i++) {
      // Random date within a range (adjust as needed)
      let startDate = new Date(2023, 0, 1); // January 1, 2023
      let endDate = new Date(); // Today's date
      let randomDateGenerated = randomDate(startDate, endDate);

      // Random description and amount
      let randomDescription = `Transaction ${i + 1}`;
      let randomAmount = (Math.random() * 1000).toFixed(2); // Random amount between 0 and 999.99

      // Construct transaction object
      let transaction = {
        date: randomDateGenerated.toISOString().split("T")[0], // Format date as YYYY-MM-DD
        description: randomDescription,
        amount: randomAmount,
      };

      transaction.editable = true;
      transaction.added = new Date();
      transaction.modified = new Date();
      worker.postMessage({
        action: "addTransaction",
        data: {
          amount: Number.parseFloat(transaction.amount),
          description: transaction.description,
          date: transaction.date,
          editable: transaction.editable,
          added: transaction.added,
          modified: transaction.modified,
        },
      });

      // Add transaction to array
      transactions.push(transaction);
    }

    // Return the array of transactions
    return transactions;
  }

  // Example usage:
  // let randomTransactions = generateRandomTransactions();
  // console.log(randomTransactions);
});

function toggleClass(id, cls) {
  let btn = document.getElementById(id);
  btn.classList.contains(cls)
    ? btn.classList.remove(cls)
    : btn.classList.add(cls);
}
