const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const csvParser = require('csv-parser');
const { Pool } = require('pg');

String.prototype.toCapitalCase = function () {
  return (this.slice(0, 1).toUpperCase()) + (this.slice(1).toLowerCase());
}

const pool = new Pool({
  user: 'postgres',
  database: 'postgres'
});

const CONFIG_FOLDER = '/test-config';

try {
  let settings = yaml.safeLoad(fs.readFileSync(__dirname + CONFIG_FOLDER + '/settings.yml', 'utf8'));
  if (!settings.hasOwnProperty('dataseries')) {
    throw new Error("Settings file is malformatted");
  }
  settings['dataseries'].forEach(series => {
    let rowCount = 0;
    let seriesName = `Series${series.category}${series.name.split(" ").join("")}`;
    let stream = fs.createReadStream(__dirname + '/' + series.location, { emitClose: true })
      .pipe(csvParser())
      .on('error', (e) => { throw e; })
      .on('data', (row) => {
        if (rowCount > 0) {
          insertRow(seriesName, row);
        } else {
          makeTable(seriesName, row);
          rowCount++;
        }
      })
      .on('end', () => {
        console.log('finished reading file & writing table');
      });
  });
} catch (error) {
  console.error(error);
}

function query(text, params, callback) {
  return pool.query(text, params, callback);
}

const SQL_TYPES = {
  'string' : 'character varying',
  'number' : 'double precision'
};

const determine_type = (value) => {
  if (typeof value === 'string') {
    if (parseInt(value) === NaN) {
      return 'character varying';
    }
    return 'double precision';
  } else if (typeof value === 'number') return 'double precision';
  else throw Error('unconvertable type, value ' + value);
}

function modify_column_name(name) {
  if (/\d{4}/.test(name)) {
    return "Year_" + name;
  }
  return name;
}

function makeTable(series_name, first_row) {
  let columns = Object.keys(first_row).map(k => `${modify_column_name(k)} ${determine_type(first_row[k])}`).join(',\n');
  let { KEYS, VALUES } = (() => {
    return {
      KEYS: Object.keys(first_row).map(modify_column_name),
      VALUES: Object.keys(first_row).map(k => first_row[k])
    }
  })();
  let QUERY_TEXT = `CREATE TABLE ${series_name} ( ${columns} );`
  let INSERT_TEXT = `INSERT INTO ${series_name} ( ${KEYS.join(',\n')} ) VALUES ( ${genArgs( KEYS.length )})`
  query(QUERY_TEXT, undefined, (err, res) => {
    if (err) {
      console.error(err);
      return;
    }
    query(INSERT_TEXT, VALUES, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }
    })
  });
}

function genArgs(length) {
  return (new Array(length)).fill(0).map((_, i) => '$' + (i + 1)).join(',');
}

function validate_value(val) {

}

function insertRow(series_name, row) {
  let { KEYS, VALUES } = (() => {
    return {
      KEYS: Object.keys(row).map(modify_column_name),
      VALUES: Object.keys(row).map(k => validate_value(row[k]))
    }
  })();
  let INSERT_TEXT = `INSERT INTO ${series_name} ( ${KEYS.join(',\n')} ) VALUES ( ${genArgs(KEYS.length)})`
  query(INSERT_TEXT, VALUES, (err, res) => {
    if (err) {
      console.error(err);
      return;
    }
  });
}
