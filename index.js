const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// For local use
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

client.connect();

app.use(bodyParser.json());

app.post('/ensureTable', async (req, res) => {
  const { testName } = req.body;
  // Check if the table exists
  const checkTableQuery = `
    SELECT to_regclass('${testName}');
  `;
  
  try {
    const checkResult = await client.query(checkTableQuery);
    
    // If the table does not exist
    if (checkResult.rows[0].to_regclass === null) {
      const createTableQuery = `
        CREATE TABLE ${testName} ( 
          id SERIAL PRIMARY KEY,
          test_name VARCHAR(255),
          success BOOLEAN,
          duration_ms FLOAT,
          error_count INTEGER,
          iterations INTEGER,
          http_reqs INTEGER,
          vus INTEGER,
          vus_max INTEGER,
          created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
        );
      `;
      await client.query(createTableQuery);
      console.log(`Table ${testName} was created`);
      res.status(200).send(`Table ${testName} was created`);
    } else {
      console.log(`Table ${testName} already exists`);
      res.status(200).send(`Table ${testName} already exists`);
    }
  } catch (err) {
    console.error('Error during table validation/creation:', err);
    res.status(500).send('Error during table validation/creation');
  }
});

app.post('/saveTestResult', async (req, res) => {
  const {
    testName, success, durationMs, errorCount, iterations, httpReqs, vus, vusMax
  } = req.body;

  const query = `
    INSERT INTO ${testName} (
      test_name, success, duration_ms, error_count, iterations, http_reqs, vus, vus_max
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
  `;

  const values = [ testName, success, durationMs, errorCount, iterations, httpReqs, vus, vusMax ];

  try {
    const result = await client.query(query, values);
    const testResultId = result.rows[0].id;
    res.json({ id: testResultId });
  } catch (err) {
    console.error('Error saving test result:', err);
    res.status(500).send('Error saving test result');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
