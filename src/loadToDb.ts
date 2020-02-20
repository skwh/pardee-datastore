import { Pool } from "pg";

const pool = new Pool({
  user: 'postgres',
  database: 'postgres'
});

enum POSTGRES_TYPE {
  STRING = 'character varying',
  NUMBER = 'double precision'
};

interface ColumnInfo {
  name: string,
  type: POSTGRES_TYPE
};

function make_postgres_type(str : string) : POSTGRES_TYPE {
  if (isNaN(parseInt(str))) {
    return POSTGRES_TYPE.STRING;
  }

  return POSTGRES_TYPE.NUMBER;
}

function modify_column_name(name : string) : string {
  if (/\d{4}/.test(name)) {
    return "Year_" + name;
  }
  return name;
}

export function make_column_info(obj: any) : ColumnInfo[] {
  let info : ColumnInfo[] = [];
  Object.keys(obj).forEach((key : string) => {
    info.push({
      name : modify_column_name(key),
      type : make_postgres_type(obj[key])
    });
  });
  return info;
}

function stringify_column_info(info : ColumnInfo[]) {
  return info.map(({ name, type } : ColumnInfo) => `${name} ${type}`).join(',\n');
}

export async function make_table( table_name : string, 
                            columns_and_types : ColumnInfo[] ) : Promise<Boolean> {
  const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${stringify_column_info(columns_and_types)} );`
  try {
    await pool.query(QUERY_TEXT);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function load_from_csv(table_name : string, file_path : string) : Promise<Boolean> {
  const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',';`
  try {
    await pool.query(QUERY_TEXT);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}