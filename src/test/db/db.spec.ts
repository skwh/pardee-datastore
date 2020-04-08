import { assert } from 'chai';
import "mocha";

import {
  Database
} from '../../db/db';
import { Pool, QueryResult } from "pg";
import { ColumnInfo, Postgres_Type, Column_Label_Values } from '../../settings/parse';

describe('Database', () => {
  let db: Database;
  const table_name = 'example_table_name';
  const column_info: ColumnInfo[] = [
    {
      nameMap: {
        original: "test",
        alias: "test"
      },
      type: Postgres_Type.NUMBER,
      label: Column_Label_Values.SPECIAL
    },
    {
      nameMap: {
        original: "test2",
        alias: "test2"
      },
      type: Postgres_Type.STRING,
      label: Column_Label_Values.ANCHOR
    }
  ];

  beforeEach(() => {
    /**
     * Create a fake Pool object. Here, the query 
     * method returns the string query in
     * the rows array as its only item. 
     */
    db = new Database({
      query: (str: string): Promise<QueryResult> => {
        return Promise.resolve({ rows: [str] } as QueryResult);
      }
    } as Pool);
  })
  
  describe('stringify_column_info', () => {
    it('should turn a column info object into a string', () => {
      const expected_value = `test double precision,\ntest2 character varying`;
      const actual_value = db.stringify_column_info(column_info);

      assert.equal(actual_value, expected_value);
    });
  });

  describe('stringify_column_names', () => {
    it('should correctly concatenate column names', () => {
      const expected_value = `test, test2`;
      const actual_value = db.stringify_column_names(column_info);

      assert.equal(actual_value, expected_value);
    });
  });

  it('should make a correct drop table query', async () => {
    const expected_value = `DROP TABLE ${table_name}`;
    const { rows } = await db.drop_table(table_name);

    assert.equal(rows[0], expected_value);
  });

  it('should make a correct create table query', async() => {
    const expected_value = `CREATE TABLE ${table_name} ( test double precision,\ntest2 character varying );`;
    const { rows } = await db.make_table(table_name, column_info);

    assert.equal(rows[0], expected_value);
  });

  it('should make a correct create index query', async() => {
    const expected_value = `CREATE INDEX index_${table_name} ON ${table_name} ( test, test2 );`;
    const { rows } = await db.make_index(table_name, column_info);

    assert.equal(rows[0], expected_value);
  });

  it('should make a correct drop index query', async () => {
    const expected_value = `DROP INDEX index_${table_name};`;
    const { rows } = await db.drop_index(table_name);

    assert.equal(rows[0], expected_value);
  });

  it('should make a correct load csv query', async () => {
    const file_path = "test/file/path.csv";
    // The copy command in Postgres requires an escape at the beginning.
    // eslint-disable-next-line no-useless-escape
    const expected_value = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`
    const { rows } = await db.load_from_csv(table_name, file_path);

    assert.equal(rows[0], expected_value);
  });
});