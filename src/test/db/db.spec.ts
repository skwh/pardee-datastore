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
      const expected_value = `test character varying,\n test2 double precision`;
      const actual_value = db.stringify_column_info(column_info);

      assert.equal(actual_value, expected_value);
    });
  });

  it('should make a correct drop table query', async () => {
    const expected_value = `DROP TABLE ${table_name}`;
    const { rows } = await db.drop_table(table_name);

    assert.equal(rows[0], expected_value);
  });

  it('should make a correct create table query', async() => {
    const expected_value = `CREATE TABLE ${table_name} ( test character varying,\n test2 double precision );`;
    const { rows } = await db.make_table(table_name, column_info);

    assert.equal(rows[0], expected_value);
  })
});