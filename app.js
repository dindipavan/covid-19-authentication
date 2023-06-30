const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const databasePath = path.join(__dirname, "covid19IndiaPortal.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

let db = null;

const intilazerDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error:'${error.message}'`);
    process.exit(1);
  }
};

intilazerDatabaseAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const authonticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "sjdbhbdshbfjdsj", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  try {
    const selectLoginQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectLoginQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "sjdbhbdshbfjdsj");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (error) {
    response.status(500);
    response.send("Internal Server Error");
  }
});

app.get("/states/", authonticationToken, async (request, response) => {
  const getStatesQuery = `
        SELECT 
            *
        FROM
           state; `;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

app.get("/states/:stateId/", authonticationToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
            *
        FROM 
            state
        WHERE 
            state_id = ${stateId};`;
  const state = await database.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(state));
});

app.post("/districts/", authonticationToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const districtPostQuery = `
        INSERT INTO
            district(district_name, state_id, cases, cured, active, deaths)
        VALUES
        ('${districtName}', '${stateId}', '${cases}', '${cured}', '${active}', '${deaths}');`;
  const state = await database.run(districtPostQuery);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authonticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
        SELECT 
            *
        FROM 
            district
        WHERE 
            district_id = ${districtId};`;
    const district = await database.get(getDistrictQuery);
    response.send(convertDbObjectToResponseObject(district));
  }
);

app.delete(
  "/districts/:districtId/",
  authonticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
        DELETE FROM 
            district
        WHERE 
            district_id = ${districtId};`;
    const district = await database.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authonticationToken,
  async (request, response) => {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const { districtId } = request.params;

    const updateDistrictQuery = `
        UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = ${cured},
    active = '${active}',
    deaths = '${deaths}'
  WHERE
    district_id = ${districtId};`;

    await database.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authonticationToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE 
            state_id = ${stateId};`;
    const stateStats = await database.get(getStateStatsQuery);
    console.log(stateStats);

    response.send({
      totalCases: stateStats["SUM(cases)"],
      totalCured: stateStats["SUM(cured)"],
      totalActive: stateStats["SUM(active)"],
      totalDeaths: stateStats["SUM(deaths)"],
    });
  }
);

module.exports = app;
