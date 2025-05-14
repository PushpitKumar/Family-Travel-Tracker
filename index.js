import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Main",
  password: "***************",
  port: 5432
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let countries = [];

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

app.get("/", async (req, res) => {
  const userDataset = await db.query("SELECT * FROM Users ORDER BY Id ASC");
  users = userDataset.rows;
  console.log(users);
  const dataset = await db.query("SELECT Country_Code FROM Family_Visited_Countries WHERE User_Id = ($1)", [currentUserId]);
  const result = dataset.rows;
  console.log(result);
  if (result.length !== 0) {
    countries = result.map(item => item.country_code);
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: users[currentUserId -1].color,
    });
  } else {
    res.render("index.ejs", {
      countries: [],
      total: 0,
      users: users,
      color: users[currentUserId - 1].color
    });
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM Countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    if (result.rows.length !== 0) {
      const data = result.rows[0];
      const countryCode = data.country_code;
      console.log(countryCode);
      const check = await hasVisited(countryCode, currentUserId);
      if (!check) {
        console.log("Adding New Country!");
        const insertedData = await db.query("INSERT INTO Family_Visited_Countries (Country_Code, User_Id) VALUES ($1, $2)Returning *", [countryCode, currentUserId]);
        console.log(insertedData.rows[0]);
        res.redirect("/");
      } else {
        console.log("Country Already Visited!");
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          users: users,
          color: users[currentUserId - 1].color,
          error: "Country has already been added. Try Again!"
        });
      }
    } else {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: users[currentUserId - 1].color,
        error: "Country does not exist. Try Again!"
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const familyMember = req.body.name;
  const color = req.body.color;
  const user = familyMember.charAt(0).toUpperCase() + familyMember.slice(1).toLowerCase();
  const result = await db.query("INSERT INTO Users (Name, Color) VALUES ($1, $2) RETURNING *", [user, color]);
  console.log("Inserted Data:", result.rows[0]);
  currentUserId = result.rows[0].id;
  res.redirect("/");
});

async function hasVisited(countryCode, currentUserId) {
  try {
    const dataset = await db.query("SELECT Country_Code FROM Family_Visited_Countries WHERE Country_Code = ($1) AND User_Id = ($2)", [countryCode, currentUserId]);
    const result = dataset.rows;
    if (result.length === 0) { //Country not visited
      console.log("False");
      return false;
    }
    console.log("True");
    return true;
  } catch (err) {
    console.error("Server Error!", err.stack);
    res.status(500).send("Server Error");
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});