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
    console.log(action);
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
    }
  };

  openRequest.onerror = function (event) {
    console.error("Database error:", event.target.error);
  };

  function addTransaction(db, transaction) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    store.add(transaction);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    console.log("transaction added " + JSON.stringify(transaction));
  }

  function updateTransaction(db, transaction) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    store.put(transaction);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    console.log("transaction updated " + JSON.stringify(transaction));
  }

  function deleteTransaction(db, id) {
    const tx = db.transaction(register, "readwrite");
    const store = tx.objectStore(register);
    store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
  }

  function getTransactions(db) {
    const tx = db.transaction(register, "readonly");
    const store = tx.objectStore(register);
    const request = store.getAll();

    request.onsuccess = function (event) {
      let transactions = event.target.result;
      transactions.sort((a, b) => a.date > b.date);
      transactions.map(function (i) {
        i.amount = i.amount / 1000;
        return i;
      });
      self.postMessage({
        action: "getTransactions",
        data: event.target.result,
      });
    };
  }

  function addUser(db, usr) {
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    store.add(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "userChanged" });
    };
    console.log("user added " + JSON.stringify(usr));
  }

  function updateUser(db, usr) {
    console.log("now updating user ", usr);
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    store.put(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "userChanged" });
    };
    console.log("user updated " + JSON.stringify(usr));
  }

  function deleteUser(db, id) {
    const tx = db.transaction(user, "readwrite");
    const store = tx.objectStore(user);
    store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
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
        reject(event.target.error);
      };
    });
  }

  function addAccount(db, usr) {
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    store.add(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
    };
    console.log("account added " + JSON.stringify(account));
  }

  function updateAccount(db, usr) {
    console.log("updating account " + usr);
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    store.put(usr);
    tx.oncomplete = function () {
      self.postMessage({ action: "accountChanged" });
    };
    console.log("account updated " + JSON.stringify(account));
  }

  function deleteAccount(db, id) {
    const tx = db.transaction(account, "readwrite");
    const store = tx.objectStore(account);
    store.delete(id);
    tx.oncomplete = function () {
      self.postMessage({ action: "refresh" });
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
      console.log(event.target.result.length);
      accCount = event.target.result.length;
      return accCount;
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
        reject(event.target.error);
      };
    });
  }

  // temporary functions for single user single cash
  function addPrimaryUser(db) {
    getUsersCount(db).then((c) => {
      if (c > 0) return;
      addUser(db, { name: "User 1", password: "" });
      console.log("users count ", c);
      console.log("adding Primary user");
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
        users: [],
        added: new Date(),
      });
      console.log("adding primary cash");
    });
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
