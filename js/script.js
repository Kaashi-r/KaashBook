document.addEventListener("DOMContentLoaded", function () {
  const worker = new Worker("js/worker.js");

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
  const cashModal = document.getElementById("account-modal");
  const cNameInput = document.getElementById("cash-name");
  const cName = document.getElementById("transaction-text");
  const cSymbolInput = document.getElementById("cash-symbol");
  const openBalInput = document.getElementById("open-bal");
  const openDateInput = document.getElementById("open-date");
  const editModal = document.getElementById("edit-modal");
  const editModalLabel = document.getElementById("edit-modal-label");
  const rcpt = document.getElementById("rcpt");
  const pymt = document.getElementById("pymt");
  const fromDate = document.getElementById("from-date");
  const toDate = document.getElementById("to-date");
  const fromToForm = document.getElementById("from-to-form");

  const newCashForm = document.getElementById("new-cash-form");
  const newCashModal = document.getElementById("new-account-modal");
  const newCNameInput = document.getElementById("new-cash-name");
  const newCSymbolInput = document.getElementById("new-cash-symbol");
  const newOpenBalInput = document.getElementById("new-open-bal");
  const newOpenDateInput = document.getElementById("new-open-date");
  const cashDltBtn = document.getElementById("cash-delete-btn");
  const cashModalDltBtn = document.getElementById("dlt-acc-modal-btn");
  const cashDltModalLabel = document.getElementById("dlt-acc-modal-label");

  let mdlEditBtn = document.getElementById("modal-edit-btn");
  let mdlDltBtn = document.getElementById("modal-delete-btn");

  let cBook = [];
  let isUpdating = 0;

  localStorage.getItem("cash-id") || localStorage.setItem("cash-id", 1);
  localStorage.getItem("user-id") || localStorage.setItem("user-id", 1);

  /**
   * Formats the given date into a string with the format YYYY-MM-DD.
   * @param {Date} date - The date to format.
   * @returns {string} The formatted date string.
   */
  const formatDate = (date) => {
    if (!date) {
      return ""; // Return an empty string if the date is invalid
    }
    try {
      date = new Date(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return ""; // Return an empty string if an error occurs
    }
  };

  // Set the initial date to be Today's
  dateInput.value = formatDate(new Date());
  newOpenDateInput.value = formatDate(new Date());

  /**
   * Clears the transaction table by removing all existing rows.
   */
  function clearTable() {
    // Clear existing transactions
    while (tBody.children.length > 0) {
      tBody.removeChild(tBody.lastChild);
    }
  }

  fromDate.value = localStorage.getItem("from-date") || formatDate(aWeekAgo);
  toDate.value = localStorage.getItem("to-date") || formatDate(today);

  /**
   * Renders the list of transactions into the table.
   * @param {Array} transactions - The array of transaction objects to render.
   */
  function renderTransactions(transactions) {
    cBook = transactions;
    clearTable();
    cBook.forEach(function (transaction, i) {
      // if (i === 0) {
      //   localStorage.setItem("cash-id", transaction.id);
      // }
      addTransactionRow(
        transaction.amount,
        transaction.description,
        transaction.date,
        transaction.id,
        transaction.added,
        transaction.editable
      );
    });
    // transactionForm.classList = ["needs-validation"];
  }

  /**
   * Updates the closing balance display.
   * @param {number} closing - The new closing balance.
   */
  function changeClosing(closing) {
    cBalance.textContent = formatter.format(closing);
    closing < 0
      ? (cBalance.classList = "col-3 text-end bg-danger text-light")
      : (cBalance.classList = "col-3 text-end");
  }

  /**
   * Adds a new row to the transaction table.
   * @param {number} amount - The amount of the transaction.
   * @param {string} description - The description of the transaction.
   * @param {string} date - The date of the transaction.
   * @param {number} id - The unique identifier of the transaction.
   * @param {boolean} added - Flag indicating if the transaction was added.
   * @param {boolean} editable - Flag indicating if the transaction can be edited.
   */
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
          showToast("Transaction deleted", "Deleted", "red");
          clearFields();
        });

        mdlDltBtn = newMdlDltBtn;
        mdlEditBtn = newMdlEditBtn;

        new bootstrap.Modal(editModal).show();
      });
    }
  }

  // // Initial render
  refreshTransactions();
  worker.postMessage({ action: "addPrimary" });

  // Listen for messages from the worker
  worker.onmessage = function (event) {
    const { action, data } = event.data;

    switch (action) {
      case "getTransactions":
        renderTransactions(data);
        break;
      case "refresh":
        refreshTransactions();
        break;
      case "userChanged":
        worker.postMessage({ action: "getUsers" });
        break;
      case "updateUsers":
        updateUserForm(data[0]);
        break;
      case "accountChanged":
        worker.postMessage({ action: "getAccounts" });
        refreshTransactions();
        break;
      case "updateAccounts":
        if (data.length === 1) localStorage.setItem("cash-id", 1);
        refreshTransactions();
        loadAccounts(data);
        updateCashForm(
          data.find(
            (a) => a["id"] === Number.parseInt(localStorage.getItem("cash-id"))
          )
        );
        break;
      case "updateClosing":
        changeClosing(data.closing);
        break;
      case "exportXL":
        exportXL(data);
        break;
      case "error":
        showToast("Error", data.message, "red");
        break;
      default:
        console.warn("Unhandled action:", action);
    }
  };
  /**
   *
   * Cash transaction entry function
   * @param {Event} event
   * @return {*}
   */
  function submitEntry(event) {
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
      return;
    }

    const transactionAmount = type === "payment" ? -amount : amount;

    const cashID = Number.parseInt(localStorage.getItem("cash-id"));
    const userID = Number.parseInt(localStorage.getItem("user-id"));

    // DB transaction entry
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
          byUser: userID,
          account: cashID,
          added: localStorage.getItem("entry-added"),
          modified,
        },
      });
      isUpdating = false;
      transactionForm.setAttribute("data-id", "");
      showToast(
        "Transaction Updated",
        (type === "payment" ? "Payment" : "Receipt") +
          " of " +
          formatter.format(Math.abs(transactionAmount) / 1000),
        "green"
      );
    } else {
      worker.postMessage({
        action: "addTransaction",
        data: {
          amount: transactionAmount,
          description,
          date,
          editable,
          byUser: userID,
          account: cashID,
          added,
          modified,
        },
      });
      showToast(
        "Transaction Added",
        (type === "payment" ? "Payment" : "Receipt") +
          " of " +
          formatter.format(Math.abs(transactionAmount) / 1000),
        "green"
      );
    }

    clearFields();
    dateInput.value = date;
    descriptionInput.focus();
    transactionForm.classList = ["needs-validation"];
  }

  /**
   * Updates the transaction form with the details of the specified transaction.
   * @param {string} date - The date of the transaction.
   * @param {string} description - The description of the transaction.
   * @param {number} amount - The amount of the transaction.
   * @param {number} id - The unique identifier of the transaction.
   */
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

  /**
   * Updates the user form with the provided user data.
   * @param {Object} data - The user data.
   */
  function updateUserForm(data) {
    uNameInput.value = data.name;
    userForm.setAttribute("data-user-id", data.id);
    userBtn.innerText = data.name;
    localStorage.setItem("user-id", data.id);
  }

  /**
   * Updates the cash form with the provided account data.
   * @param {Object} data - The account data.
   */
  function updateCashForm(data) {
    cNameInput.value = data.name;
    cSymbolInput.value = data.symbol;
    openBalInput.value = data.openBal;
    openDateInput.value = data.openDate;
    cashForm.setAttribute("data-cash-id", data.id);
    console.log("cash id set as " + cashForm.getAttribute("data-cash-id"));
    cashBtn.textContent = data.name;
    cName.textContent = data.name + " Transactions";

    localStorage.setItem("decimal", data.decimals);
    date.setAttribute("min", data.openDate);
    fromDate.setAttribute("min", data.openDate);
    toDate.setAttribute("min", data.openDate);
  }

  /**
   * Add the new cash to the database.
   */
  function addCash() {
    worker.postMessage({
      action: "addAccount",
      data: {
        name: newCNameInput.value,
        symbol: newCSymbolInput.value,
        openBal: Number.parseFloat(newOpenBalInput.value),
        openDate: formatDate(newOpenDateInput.value),
        decimals: 3,
        users: [],
        added: new Date(),
      },
    });
    showToast("Account Added", newCNameInput.value, "green");
  }

  /**
   * Updates the cash in the database.
   */
  function updateCash() {
    console.log("updating");
    worker.postMessage({
      action: "updateAccount",
      data: {
        name: cNameInput.value,
        symbol: cSymbolInput.value,
        openBal: Number.parseFloat(openBalInput.value),
        openDate: formatDate(openDateInput.value),
        id: Number.parseInt(cashForm.getAttribute("data-cash-id")),
        decimals: 3,
        users: [],
        added: new Date(),
      },
    });
    showToast("Account Updated", cNameInput.value, "green");
  }

  /**
   * Updates the user in the database.
   */
  function updateUser() {
    worker.postMessage({
      action: "updateUser",
      data: {
        name: uNameInput.value,
        id: Number.parseInt(userForm.getAttribute("data-user-id")),
        password: "",
      },
    });
    showToast("User Updated", uNameInput.value, "blue");
  }

  /**
   * Clears all input fields in the transaction form.
   */
  function clearFields() {
    amountInput.value = "";
    descriptionInput.value = "";
    transactionForm.setAttribute("data-id", "");
    isUpdating = false;
    submitBtn.innerText = "Add transaction";
  }

  /**
   * Load transactions from database
   */
  function refreshTransactions() {
    let frDate = formatDate(fromDate.value);
    let tDate = formatDate(toDate.value);
    worker.postMessage({
      action: "getFTransactions",
      data: {
        from: frDate,
        to: tDate,
        account: Number.parseInt(localStorage.getItem("cash-id")),
      },
    });
  }

  /**
   * Sets up event listeners for form actions and buttons.
   */
  function setupEventListeners() {
    fromToForm.addEventListener("change", function (event) {
      let frDate = formatDate(fromDate.value);
      let tDate = formatDate(toDate.value);
      localStorage.setItem("from-date", frDate);
      localStorage.setItem("to-date", tDate);
      refreshTransactions();
      return false;
    });

    // Transaction form submission handler
    transactionForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submitEntry(event);
      return false;
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
    // listen for changes in user form
    userForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!userForm.checkValidity()) {
        event.preventDefault(); // Prevent form submission
        event.stopPropagation(); // Stop event propagation
        return;
      }
      updateUser();

      const bsCollapse = new bootstrap.Collapse(
        document.getElementById("user-master"),
        {
          toggle: false,
        }
      ).hide();
      return false;
    });

    // listen for changes in cash form
    cashForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!cashForm.checkValidity()) {
        event.preventDefault(); // Prevent form submission
        event.stopPropagation(); // Stop event propagation
        return;
      }
      updateCash();
      bootstrap.Modal.getInstance(cashModal).hide();
      return false;
    });

    // listen for changes in cash form
    newCashForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!newCashForm.checkValidity()) {
        event.preventDefault(); // Prevent form submission
        event.stopPropagation(); // Stop event propagation
        return;
      }
      addCash();
      bootstrap.Modal.getInstance(newCashModal).hide();
      newCNameInput.value = "";
      newOpenBalInput.value = "";
      newOpenDateInput.value = formatDate(new Date());
      newCashForm.classList = ["needs-validation"];
      return false;
    });

    // listen for clicks on spreadsheet export button
    document.getElementById("xl-btn").addEventListener("click", () => {
      worker.postMessage({
        action: "getTransactionsXL",
        data: {
          acc: Number.parseInt(localStorage.getItem("cash-id")),
        },
      });
    });

    //
    cashModalDltBtn.addEventListener("click", function () {
      const id = Number.parseInt(this.getAttribute("data-cash-id"));
      if (id != 1) {
        worker.postMessage({
          action: "deleteAccount",
          data: {
            id,
          },
        });
        localStorage.setItem("cash-id", 1);
        setAccDeletable();
      }
    });

    document.getElementById("kb-banner").addEventListener("click", function () {
      const profileModal = document.getElementById("profile-moodal");
      // new bootstrap.Modal(profileModal).show();
    });
    // Date range problem solved
    fromDate.addEventListener("change", function () {
      toDate.setAttribute("min", fromDate.value);
    });
    toDate.addEventListener("change", function () {
      fromDate.setAttribute("max", toDate.value);
    });
  }

  setupEventListeners();

  /**
   * Changes the date in the datepicker by a specified number of days.
   * @param {number} days - The number of days to change the date by.
   */
  function changeDate(days) {
    const currentDate = new Date(dateInput.value);
    if (!isNaN(currentDate)) {
      currentDate.setDate(currentDate.getDate() + days);
      dateInput.value = currentDate.toISOString().split("T")[0];
    }
  }

  /**
   * Exports the transactions data to an Excel file.
   * @param {Array} data - The transactions data to export.
   */
  function exportXL(data) {
    try {
      // Check if data is valid
      if (!Array.isArray(data) || data.length === 0) {
        showToast("Error", "Empty transactions", "red");
        throw new Error(
          "Invalid data: The data to be exported should be a non-empty array."
        );
      }

      // Convert the data to a worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Generate XLSX file and trigger download
      const fileName = `KaashBook ${cName.textContent}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast("Exported", `File ${fileName} has been saved.`, "green");
    } catch (error) {
      showToast("Error", "Unknown error while exporting", "green");
      console.error(
        "An error occurred while exporting to Excel:",
        error.message
      );
    }
  }

  /**
   *Show a Bootstrap Toast element to deliver feedback
   * @param {String} title
   * @param {String} message
   * @param {String} color
   */
  function showToast(title, message, color) {
    document.getElementById("toast-title").textContent = title;
    document.getElementById("toast-title").style.color = color;
    document.getElementById("toast-content").textContent = message;

    const toastHTML = document.getElementById("live-toast");
    const newToast = toastHTML.cloneNode(true);
    toastHTML.parentNode.replaceChild(newToast, toastHTML);
    const toast = new bootstrap.Toast(newToast);
    toast.show();
  }

  function loadAccounts(accounts) {
    let btns = [];

    accounts.forEach((account) => {
      const accBtn = document.createElement("button");
      accBtn.classList = ["btn p-1 mx-1 text-start shadow-sm"];
      accBtn.setAttribute("type", "button");
      accBtn.setAttribute("data-bs-dismiss", "modal");
      accBtn.textContent = account.name;
      accBtn.addEventListener("click", function () {
        localStorage.setItem("cash-id", account.id);
        updateCashForm(account);
        refreshTransactions();
        setAccDeletable();
        if (account.id != 1) {
          cashDltModalLabel.textContent = `Delete ${account.name} and all it's transactions?`;
          cashModalDltBtn.setAttribute("data-cash-id", account.id);
        }
      });
      btns.push(accBtn);
    });

    const accountList = document.getElementById("account-list");
    accountList.replaceChildren(...btns);
  }

  function setAccDeletable() {
    if (localStorage.getItem("cash-id") == 1) {
      cashDltBtn.classList.add("d-none");
    } else {
      cashDltBtn.classList.remove("d-none");
    }
  }
  setAccDeletable();
});

/**
 * Adding boostrap collapse closing functionality for elements
 * @param {String} collapse
 * @param {Strin} btn
 */
function unCollapse(collapse, btn) {
  const collapseElement = document.getElementById(collapse);
  const button = document.querySelector(btn);

  // Handle clicks outside the collapse element
  document.addEventListener("click", function (event) {
    const isClickInside =
      collapseElement.contains(event.target) || button.contains(event.target);

    if (!isClickInside && collapseElement.classList.contains("show")) {
      // Collapse the element if it's currently shown
      const bsCollapse = new bootstrap.Collapse(collapseElement, {
        toggle: false,
      });
      bsCollapse.hide();
    }
  });

  console.log(
    "%c Ⓚ Welcome to the KaashBook Extension! Ⓚ",
    "color: lightgreen; font-size: 16px; font-weight: bold;"
  );
  console.log(
    "%c Record your transactions with this offline cash book extension",
    "color: lightblue; font-size: 14px;"
  );
}
document.addEventListener("DOMContentLoaded", function () {
  unCollapse("nav-expand", '[data-bs-target="#nav-expand"]');
});

// Function to bypass HTML5 error feedback (Because it won't work in the extension sidebar) and show Bootstrap style ones.
(() => {
  "use strict";

  // Fetch all the forms to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();
