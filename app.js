const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
let dbPath = path.join(__dirname, "todoApplication.db");
let app = express();
app.use(express.json());
module.exports = app;
let db = null;

async function starting() {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => console.log("server started at 3000"));
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}
starting();

const authentication = (request, response, next) => {
  let { category, status, priority, date, search_q } = request.query;
  let temp = [
    { category: category, val: category },
    { priority: priority, val: priority },
    { status: status, val: status },
    { date: date, val: date },
    { search_q: search_q, val: search_q },
  ];
  let vals = temp.filter((ele) => ele.val !== undefined);
  if (vals.length === 0) {
    request.sqlQuery = `select * from todo`;
    next();
  } else {
    let queryParams = {};
    let cond = true;
    for (let i of vals) {
      if (i.category !== undefined) {
        let comp = ["WORK", "HOME", "LEARNING"];
        const bool = comp.includes(i.val);
        if (bool) {
          queryParams["category"] = i.val;
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
          cond = false;
          break;
        }
      } else if (i.priority !== undefined) {
        let comp = ["HIGH", "MEDIUM", "LOW"];
        const bool = comp.includes(i.val);
        if (bool) {
          queryParams["priority"] = i.val;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
          cond = false;
        }
      } else if (i.status !== undefined) {
        let comp = ["TO DO", "IN PROGRESS", "DONE"];
        const bool = comp.includes(i.val);
        if (bool) {
          queryParams["status"] = i.val;
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
          cond = false;
          break;
        }
      } else if (i.date !== undefined) {
        let dateComp1 = format(new Date(i.date), "yyyy-MM-dd");
        console.log(dateComp1);
        dateComp2 = new Date(dateComp1);
        console.log(dateComp2.getFullYear());
        const bool = isValid(
          dateComp2.getFullYear(),
          dateComp2.getMonth(),
          dateComp2.getDate()
        );
        if (bool) {
          queryParams["due_date"] = dateComp1;
        } else {
          response.status(400);
          response.send("Invalid Due Date");
          cond = false;
          break;
        }
      } else if (i.search_q !== undefined) {
        queryParams["search_q"] = i.val;
      }
    }
    if (cond) {
      request.definedParams = queryParams;
      next();
    }
  }
};

async function verify(request, response, next) {
  let { id, category, status, priority, dueDate, todo } = request.body;
  let temp = [
    { category: category, val: category },
    { priority: priority, val: priority },
    { status: status, val: status },
    { dueDate: dueDate, val: dueDate },
  ];
  let cond = true;
  for (let i of temp) {
    if (i.category !== undefined) {
      let comp = ["WORK", "HOME", "LEARNING"];
      const bool = comp.includes(i.category);
      if (bool) {
        continue;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
        cond = false;
        break;
      }
    } else if (i.priority !== undefined) {
      let comp = ["HIGH", "MEDIUM", "LOW"];
      const bool = comp.includes(i.priority);
      if (bool) {
        continue;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
        cond = false;
      }
    } else if (i.status !== undefined) {
      let comp = ["TO DO", "IN PROGRESS", "DONE"];
      const bool = comp.includes(i.status);
      if (bool) {
        continue;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
        cond = false;
        break;
      }
    } else if (i.DueDate !== undefined) {
      let dateComp = format(new Date(i.dueDate), "yyyy-MM-dd");
      dateComp = new Date(dateComp);
      const bool = isValid(
        dateComp.getFullYear(),
        dateComp.getMonth(),
        dateComp.getDate()
      );
      if (bool) {
        continue;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        cond = false;
        break;
      }
    }
  }
  if (cond) {
    next();
  }
}

app.get("/todos/", authentication, async (request, response) => {
  const queryParams = request.definedParams;
  let {
    category = "",
    status = "",
    priority = "",
    due_date = "",
    search_q = "",
  } = queryParams;
  const query = `select * from todo where 
  status like "%${status}%" and priority like "%${priority}%" and todo like "%${search_q}%"
  and due_date like "%${due_date}%" and category like "%${category}%";`;
  const result = await db.all(query);
  let reqResult = result.map((ele) => {
    return {
      id: ele.id,
      todo: ele.todo,
      category: ele.category,
      priority: ele.priority,
      status: ele.status,
      dueDate: ele.due_date,
    };
  });
  response.send(reqResult);
});

app.get("/todos/:todoId", async (request, response) => {
  let { todoId } = request.params;
  const query = `select * from todo where id=${todoId}`;
  let ele = await db.get(query);
  let result = {
    id: ele.id,
    todo: ele.todo,
    category: ele.category,
    priority: ele.priority,
    status: ele.status,
    dueDate: ele.due_date,
  };
  response.send(result);
});

app.get("/agenda/", authentication, async (request, response) => {
  const queryParams = request.definedParams;
  let {
    category = "",
    status = "",
    priority = "",
    due_date = "",
  } = queryParams;
  const query = `select * from todo where 
  status like "%${status}%" and priority like "%${priority}%"
  and due_date like "${due_date}" and category like "%${category}%";`;
  console.log(query);
  let ele = await db.all(query);
  if (ele !== undefined) {
    let result = ele.map((e) => {
      return {
        id: e.id,
        todo: e.todo,
        category: e.category,
        priority: e.priority,
        status: e.status,
        dueDate: e.due_date,
      };
    });
    response.send(result);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", authentication, verify, async (request, response) => {
  let { id, category, status, priority, dueDate, todo } = request.body;

  const query = `insert into todo (id,todo,priority,status,category,due_date)
    values(${id},"${todo}","${priority}","${status}","${category}","${dueDate}");`;
  await db.run(query);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", authentication, async (request, response) => {
  let { todoId } = request.params;
  let { category, status, priority, dueDate, todo } = request.body;
  if (category !== undefined) {
    let comp = ["WORK", "HOME", "LEARNING"];
    const bool = comp.includes(category);
    if (bool) {
      const query = `update todo set category="${category}"
        where id=${todoId};`;
      await db.run(query);
      response.send("Category Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (priority !== undefined) {
    let comp = ["HIGH", "MEDIUM", "LOW"];
    const bool = comp.includes(priority);
    if (bool) {
      const query = `update todo set priority="${priority}"
        where id=${todoId};`;
      await db.run(query);
      response.send("Priority Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (status !== undefined) {
    let comp = ["TO DO", "IN PROGRESS", "DONE"];
    const bool = comp.includes(status);
    if (bool) {
      const query = `update todo set status="${status}"
        where id=${todoId};`;
      await db.run(query);
      response.send("Status Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (todo !== undefined) {
    const query = `update todo set todo="${todo}"
        where id=${todoId};`;
    await db.run(query);
    response.send("Todo Updated");
  } else if (dueDate !== undefined) {
    let dateComp = format(new Date(dueDate), "yyyy-MM-dd");
    dateComp = new Date(dateComp);
    const bool = isValid(
      dateComp.getFullYear(),
      dateComp.getMonth(),
      dateComp.getDate()
    );
    if (bool) {
      const query = `update todo set due_date="${dueDate}"
        where id=${todoId};`;
      await db.run(query);
      response.send("Due Date Updated");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  let { todoId } = request.params;
  const query = `delete from todo where id=${todoId};`;
  await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;
