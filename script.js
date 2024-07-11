document.addEventListener("DOMContentLoaded", function () {
  const worker = new Worker("worker.js");

  // Get browser locale for formating amounts
  const userLocale = navigator.language || navigator.userLanguage;
  const formatter = new Intl.NumberFormat(userLocale, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let today = new Date();
  let aWeekAgo = new Date();
  aWeekAgo.setDate(today.getDate() - 7);

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
  const cName = document.getElementById("transaction-text");
  const cSymbolInput = document.getElementById("cash-symbol");
  const openBalInput = document.getElementById("open-bal");
  const openDateInput = document.getElementById("open-date");
  const editModal = document.getElementById("edit-modal");
  const editModalLabel = document.getElementById("edit-modal-label");
  let mdlEditBtn = document.getElementById("modal-edit-btn");
  let mdlDltBtn = document.getElementById("modal-delete-btn");
  const rcpt = document.getElementById("rcpt");
  const pymt = document.getElementById("pymt");
  const fromDate = document.getElementById("from-date");
  const toDate = document.getElementById("to-date");
  const fromToForm = document.getElementById("from-to-form");

  let cBook = [];
  let isUpdating = 0;

  const formatDate = (date) => {
    if (!date) {
      return ""; // Return an empty string if the date is invalid
    }
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return date;
    }
  };

  // Set the initial date to be Today's
  dateInput.value = formatDate(new Date());

  // Clears transaction table before reload on every transaction entry
  function clearTable() {
    // Clear existing transactions
    while (tBody.children.length > 0) {
      tBody.removeChild(tBody.lastChild);
    }
  }

  fromDate.value = localStorage.getItem("from-date")
    ? localStorage.getItem("from-date")
    : formatDate(aWeekAgo);
  toDate.value = localStorage.getItem("to-date")
    ? localStorage.getItem("to-date")
    : formatDate(today);

  // Function to render transactions
  function renderTransactions(transactions) {
    cBook = transactions;
    clearTable();
    cBook.forEach(function (transaction, i) {
      if (i === 0) {
        localStorage.setItem("cash-id", transaction.id);
      }
      addTransactionRow(
        transaction.amount,
        transaction.description,
        transaction.date,
        transaction.id,
        transaction.added,
        transaction.editable
      );
    });
  }

  // Change closing balance
  function changeClosing(closing) {
    cBalance.innerHTML = formatter.format(closing);
    closing < 0
      ? (cBalance.classList = "col-3 text-end bg-danger text-light")
      : (cBalance.classList = "col-3 text-end");
  }

  // Function to add a new row
  function addTransactionRow(amount, description, date, id, added, editable) {
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

    if (editable) {
      tRow.addEventListener("click", function () {
        const newMdlDltBtn = mdlDltBtn.cloneNode(true);
        mdlDltBtn.parentNode.replaceChild(newMdlDltBtn, mdlDltBtn);

        const newMdlEditBtn = mdlEditBtn.cloneNode(true);
        mdlEditBtn.parentNode.replaceChild(newMdlEditBtn, mdlEditBtn);

        editModalLabel.innerText =
          (amount < 0 ? "Payment" : "Receipt") +
          " of " +
          formatter.format(Math.abs(amount));
        newMdlEditBtn.addEventListener("click", function () {
          updateForm(date, description, amount, id);
          localStorage.setItem("entry-added", added);
        });
        newMdlDltBtn.addEventListener("click", function () {
          worker.postMessage({ action: "deleteTransaction", data: { id: id } });
          clearFields();
        });

        mdlDltBtn = newMdlDltBtn;
        mdlEditBtn = newMdlEditBtn;

        new bootstrap.Modal(editModal).show();
      });
    }
  }

  // // Initial render
  // worker.postMessage({ action: "getTransactions" });
  worker.postMessage({
    action: "getFTransactions",
    data: { from: fromDate.value, to: toDate.value },
  });
  worker.postMessage({ action: "addPrimary" });

  // Listen for messages from the worker
  worker.onmessage = function (event) {
    const { action, data } = event.data;

    if (action === "getTransactions") {
      renderTransactions(data);
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
    } else if (action === "updateClosing") {
      changeClosing(data.closing);
    }
  };
  // Update transaction for on editing transaction
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

  // temporary function for single user entry form
  function updateUserForm(data) {
    uNameInput.value = data.name;
    userForm.setAttribute("data-user-id", data.id);
    userBtn.innerText = data.name;
    localStorage.setItem("user-id", data.id);
  }

  // temporary function for single cash entry form
  function updateCashForm(data) {
    cNameInput.value = data.name;
    cSymbolInput.value = data.symbol;
    openBalInput.value = data.openBal;
    openDateInput.value = data.openDate;
    cashForm.setAttribute("data-cash-id", data.id);
    cashBtn.textContent = data.name;
    cName.textContent = data.name + " Transactions";
    localStorage.setItem("cash-id", data.id);
    localStorage.setItem("decimal", data.decimals);
    localStorage.setItem("enrty-added", data.added);
    date.setAttribute("min", data.openDate);
    fromDate.setAttribute("min", data.openDate);
    toDate.setAttribute("min", data.openDate);
  }

  // update cash in database
  function updateCash() {
    worker.postMessage({
      action: "updateAccount",
      data: {
        name: cNameInput.value,
        symbol: cSymbolInput.value,
        openBal: openBalInput.value,
        openDate: formatDate(openDateInput.value),
        id: Number.parseInt(cashForm.getAttribute("data-cash-id")),
        decimals: 3,
        users: [],
        added: new Date(),
      },
    });
  }

  // update User in database
  function updateUser() {
    worker.postMessage({
      action: "updateUser",
      data: {
        name: uNameInput.value,
        id: Number.parseInt(userForm.getAttribute("data-user-id")),
        password: "",
      },
    });
  }

  // Clear transacion form
  function clearFields() {
    amountInput.value = "";
    descriptionInput.value = "";
    transactionForm.setAttribute("data-id", "");
    isUpdating = false;
    submitBtn.innerText = "Add transaction";
  }

  // Cash form submission handler
  cashForm.addEventListener("submit", updateCash);

  // User form submission handler
  userForm.addEventListener("submit", updateUser);

  fromToForm.addEventListener("change", function (event) {
    let frDate = formatDate(fromDate.value);
    let tDate = formatDate(toDate.value);

    localStorage.setItem("from-date", frDate);
    localStorage.setItem("to-date", tDate);

    worker.postMessage({
      action: "getFTransactions",
      data: { from: frDate, to: tDate },
    });
  });

  // Transaction form submission handler
  transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    let type;

    // const type = typeInput.value;

    for (const radioButton of typeRadio) {
      if (radioButton.checked) {
        type = radioButton.value;

        break;
      }
    }

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
          byUser: localStorage.getItem("user-id"),
          account: localStorage.getItem("cash-id"),
          added: localStorage.getItem("entry-added"),
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
          byUser: localStorage.getItem("user-id"),
          account: localStorage.getItem("cash-id"),
          added,
          modified,
        },
      });
    }

    clearFields();
    dateInput.value = date;
    descriptionInput.focus();
  });

  // Transaction form reset handler
  transactionForm.addEventListener("reset", function (event) {
    transactionForm.setAttribute("data-id", "");
    submitBtn.innerText = "Add transaction";
    dateInput.focus();
  });

  // Keyboard shortcut to toggle between Receipt and Payment
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.shiftKey && event.key === "+") {
      event.preventDefault(); // Prevent the default action
      let xx = pymt.checked;

      pymt.checked = !xx;
      rcpt.checked = xx;
    }
  });
  // Keyboard shortcut to increase date if dateInput is selected
  dateInput.addEventListener("keydown", function (event) {
    if (event.key === "+") {
      changeDate(1);
    } else if (event.key === "-") {
      changeDate(-1);
    }
  });

  // change the datepicker day
  function changeDate(days) {
    const currentDate = new Date(dateInput.value);
    if (!isNaN(currentDate)) {
      currentDate.setDate(currentDate.getDate() + days);
      dateInput.value = currentDate.toISOString().split("T")[0];
    }
  }

  console.log(
    "%c Ⓚ Welcome to the KaashBook Extension! Ⓚ",
    "color: lightgreen; font-size: 16px; font-weight: bold;"
  );
  console.log(
    "%cTracking your transactions has never been easier, within your web browser, where you do everything else!",
    "color: lightblue; font-size: 14px;"
  );

  document.getElementById("cash-btn").addEventListener("click", function () {
    toggleClass("cash-master", "show");
  });

  document.getElementById("user-btn").addEventListener("click", function () {
    toggleClass("user-master", "show");
  });
});

function toggleClass(id, cls) {
  let btn = document.getElementById(id);
  btn.classList.contains(cls)
    ? btn.classList.remove(cls)
    : btn.classList.add(cls);
}
