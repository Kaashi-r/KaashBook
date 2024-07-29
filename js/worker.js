self.addEventListener("message", function (event) {
  const { action, data } = event.data;
  const dbName = "cashbook";
  const register = "register";
  const account = "account";
  const user = "user";
  const state = "state";

  let db;
  let dbVersion = 1;

  const openRequest = indexedDB.open(dbName, dbVersion);

  openRequest.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains(register)) {
      const rgTable = db.createObjectStore(register, {
        keyPath: "id",
        autoIncrement: true,
      });
      rgTable.createIndex("date", "date", { unique: false });
      rgTable.createIndex("description", "description", { unique: false });
      rgTable.createIndex("amount", "amount", { unique: false });
      rgTable.createIndex("byUser", "byUser", { unique: false });
      rgTable.createIndex("account", "account", { unique: false });
      rgTable.createIndex("editable", "editable", { unique: false });
      rgTable.createIndex("added", "added", { unique: false });
      rgTable.createIndex("modified", "modified", { unique: false });
    }
    if (!db.objectStoreNames.contains(account)) {
      const acTable = db.createObjectStore(account, {
        keyPath: "id",
        autoIncrement: true,
      });
      acTable.createIndex("name", "name", { unique: true });
      acTable.createIndex("decimals", "decimals", { unique: false });
      acTable.createIndex("symbol", "symbol", { unique: false });
      acTable.createIndex("openBal", "openBal", { unique: false });
      acTable.createIndex("openDate", "openDate", { unique: false });
      acTable.createIndex("users", "users", { unique: false });
      acTable.createIndex("added", "added", { unique: false });
    }

    if (!db.objectStoreNames.contains(user)) {
      const acTable = db.createObjectStore(user, {
        keyPath: "id",
        autoIncrement: true,
      });
      acTable.createIndex("name", "name", { unique: true });
      acTable.createIndex("password", "password", { unique: false });
    }
  };

  openRequest.onsuccess = function (event) {
    db = event.target.result;

    switch (action) {
      case "addTransaction":
        addTransaction(db, data);
        break;
      case "updateTransaction":
        updateTransaction(db, data);
        break;
      case "deleteTransaction":
        deleteTransaction(db, data.id);
        break;
      case "getTransactions":
        getTransactions(db);
        // getFTransactions(db, "2023-01-15", "2023-01-20");
        break;
      case "getFTransactions":
        // getTransactions(db);
        getFTransactions(db, data.from, data.to);
        break;
      case "addUser":
        addUser(db, data);
        break;
      case "updateUser":
        updateUser(db, data);
        break;
      case "deleteUser":
        deleteUser(db, data.id);
        break;
      case "getUsers":
        getUsers(db);
        break;
      case "addAccount":
        addAccount(db, data);
        break;
      case "updateAccount":
        updateAccount(db, data);
        break;
      case "deleteAccount":
        deleteAccount(db, data.id);
        break;
      case "getAccounts":
        getAccounts(db);
        break;
      case "addPrimary":
        addPrimaryUser(db);
        addPrimaryCash(db);
        break;
      case "getTransactionsXL":
        getTransactionsXL(db);
        break;
      default:
        console.error("Unknown action:", action);
    }
  };

  openRequest.onerror = function (event) {
    const error = event.target.error;
    handleError(error.name);
  };

  function addTransaction(db, transaction) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    const request = store.add(transaction);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function updateTransaction(db, transaction) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    const request = store.put(transaction);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function deleteTransaction(db, id) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    const request = store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getTransactions(db) {
    const tx = db.transaction(register, "readonly");
    const store = tx.objectStore(register);
    const request = store.getAll();

    request.onsuccess = function (event) {
      let transactions = event.target.result;
      let ob = transactions[0];
      let obd = ob.date;
      transactions.shift();

      transactions.sort((a, b) => a.date > b.date);
      transactions.unshift(ob);
      transactions = transactions.filter(function (tr) {
        return tr.date >= obd;
      });

      transactions.map(function (i) {
        i.amount = i.amount / 1000;
        return i;
      });
      self.postMessage({
        action: "getTransactions",
        data: transactions,
      });
      calcClosing();
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getFTransactions(db, startDate, endDate) {
    const tx = db.transaction("register", "readonly");
    const store = tx.objectStore("register");
    const index = store.index("date");

    let range;
    let request;

    if (startDate !== "" && endDate !== "") {
      range = IDBKeyRange.bound(startDate, endDate, false, false);
    } else if (startDate !== "") {
      range = IDBKeyRange.lowerBound(startDate);
    } else if (endDate !== "") {
      range = IDBKeyRange.upperBound(endDate);
    } else {
      getTransactions(db);
      return;
    }

    // Create a range for date strings

    request = index.openCursor(range);
    let transactions = []; // Collect transactions here

    request.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        //
        transactions.push(cursor.value); // Add current cursor value to transactions array
        cursor.continue(); // Continue to the next cursor entry
      } else {
        // Process transactions after cursor iteration is complete

        if (transactions.length > 0) {
          let ob = transactions[0];
          let obd = ob.date;

          transactions.sort((a, b) => (a.date > b.date ? 1 : -1));
          transactions = transactions.filter((tr) => tr.date >= obd);

          transactions = transactions.map(function (i) {
            i.amount = i.amount / 1000;
            return i;
          });

          self.postMessage({
            action: "getTransactions",
            data: transactions,
          });
        } else {
          self.postMessage({
            action: "getTransactions",
            data: [],
          });
        }
      }
    };

    request.onerror = function (event) {
      handleError(error.name);
    };
    calcClosing();
  }

  function addUser(db, usr) {
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    const request = store.add(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "userChanged" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function updateUser(db, usr) {
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    const request = store.put(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "userChanged" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function deleteUser(db, id) {
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    const request = store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getUsers(db) {
    const tx = db.transaction(user, "readonly");
    const store = tx.objectStore(user);
    const request = store.getAll();

    request.onsuccess = function (event) {
      self.postMessage({
        action: "updateUsers",
        data: event.target.result,
      });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getUsersCount(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(user, "readonly");
      const store = tx.objectStore(user);
      const request = store.getAll();

      request.onsuccess = function (event) {
        resolve(event.target.result.length);
        self.postMessage({ action: "userChanged" });
      };

      request.onerror = function (event) {
        handleError(error.name);
      };
    });
  }

  function addAccount(db, a) {
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    let acc = store.add(a);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    acc.onsuccess = function (event) {
      const account = event.target.result;
      const amount = a.openBal;
      const date = a.openDate;
      const user = a.users[0];
      const added = new Date();
      const modified = new Date();
      const description = "Opening balance";

      addTransaction(db, {
        amount,
        date,
        account,
        description,
        editable: false,
        user,
        added,
        modified,
      });
    };
    acc.onerror = function (event) {
      handleError(error.name);
    };
  }

  function updateAccount(db, a) {
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    let acc = store.put(a);
    tx.oncomplete = function () {
      self.postMessage({ action: "accountChanged" });
    };
    acc.onerror = function (event) {
      handleError(error.name);
    };
    acc.onsuccess = function (event) {
      const id = 1;
      const account = event.target.result;
      const amount = a.openBal * 1000;
      const date = a.openDate;
      const byUser = a.users[0];
      const added = new Date();
      const modified = new Date();
      const description = "Opening balance";

      updateTransaction(db, {
        id,
        amount,
        date,
        account,
        description,
        editable: false,
        byUser,
        added,
        modified,
      });
    };
  }

  function deleteAccount(db, id) {
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    const request = store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getAccounts(db) {
    const tx = db.transaction(account, "readonly");
    const store = tx.objectStore(account);
    const request = store.getAll();
    var accCount = 0;

    request.onsuccess = function (event) {
      self.postMessage({
        action: "updateAccounts",
        data: event.target.result,
      });

      accCount = event.target.result.length;
      return accCount;
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getAccountsCount(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(account, "readonly");
      const store = tx.objectStore(account);
      const request = store.getAll();

      request.onsuccess = function (event) {
        resolve(event.target.result.length);
        self.postMessage({ action: "accountChanged" });
      };
      request.onerror = function (event) {
        handleError(error.name);
      };
    });
  }

  // temporary functions for single user single cash
  function addPrimaryUser(db) {
    getUsersCount(db).then((c) => {
      if (c > 0) return;
      addUser(db, { name: "User 1", password: "" });
    });
  }

  function addPrimaryCash(db) {
    getAccountsCount(db).then((c) => {
      if (c > 0) return;
      addAccount(db, {
        name: "Cashbook",
        decimals: 3,
        symbol: "$",
        openBal: 0,
        openDate: getFirstDateOfCurrentMonth(),
        users: [1],
        added: new Date(),
      });
    });
  }

  function calcClosing() {
    let closing = 0;

    const tx = db.transaction(register, "readonly");
    const store = tx.objectStore(register);
    const request = store.getAll();

    request.onsuccess = function (event) {
      let transactions = event.target.result;

      closing =
        transactions.reduce((p, c) => {
          return p + c.amount;
        }, 0) / 1000;

      self.postMessage({ action: "updateClosing", data: { closing } });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function getTransactionsXL(db) {
    const tx = db.transaction(register, "readonly");
    const store = tx.objectStore(register);
    const request = store.getAll();

    request.onsuccess = function (event) {
      let transactions = event.target.result;
      let ob = transactions[0];

      transactions.shift();

      transactions.sort((a, b) => a.date > b.date);
      transactions.unshift(ob);

      transactions.map(function (i) {
        i.amount = i.amount / 1000;
        return i;
      });

      let trans = [];

      transactions.map((obj, index) => {
        let newObj = {};

        let da = obj["date"];
        let de = obj["description"];
        let am = obj["amount"];
        let re = am >= 0 ? am : "";
        let pa = am < 0 ? -am : "";

        newObj["Date"] = da;
        newObj["Details"] = de;
        newObj["Receipt"] = re;
        newObj["Payment"] = pa;

        trans.push(newObj);
      });

      let tr = trans.map((row, index) => {
        row["Balance"] =
          index === 0
            ? { f: `C${index + 2}-D${index + 2}` }
            : { f: `C${index + 2}-D${index + 2}+E${index + 1}` }; // Add Excel formula for running balance
        return row;
      });

      self.postMessage({
        action: "exportXL",
        data: tr,
      });
    };
    request.onerror = function (event) {
      handleError(error.name);
    };
  }

  function handleError(error) {
    let message = "";
    switch (error) {
      case "QuotaExceededError":
        message = "Disk space is full. Please free up some space.";
        break;
      case "DataError":
        message = "Database is corrupted. Please contact support.";
        break;
      case "VersionError":
        message = "Database version error. Please update the application.";
        break;
      default:
        message = "An unknown error occurred.";
        break;
    }
    self.postMessage({ action: "error", message: message });
  }
});

function getFirstDateOfCurrentMonth() {
  // Get the current date
  const currentDate = new Date();

  // Create a new date object for the first date of the current month
  const firstDateOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  // Extract the year, month, and day
  const year = firstDateOfMonth.getFullYear();
  const month = String(firstDateOfMonth.getMonth() + 1).padStart(2, "0"); // Months are zero-based, so add 1
  const day = String(firstDateOfMonth.getDate()).padStart(2, "0");

  // Format the date as yyyy-mm-dd
  const formattedDate = `${year}-${month}-${day}`;

  return formattedDate;
}
