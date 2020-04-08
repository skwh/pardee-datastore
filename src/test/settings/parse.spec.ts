import { assert } from "chai";
import "mocha";

import { 
  Column_Label_Values, 
  LabelList, 
  find_object_in_label_list,
  make_series_name,
  replace_symbol_with_phrase,
  replace_all_symbols_with_phrases,
  sanitize_name,
  modify_column_name,
  ColumnSettings,
  ColumnInfo,
  make_info,
  make_info_from_spread,
  make_info_from_column,
  Postgres_Type,
  Column_Modifier_Values,
  sort_into_groups,
  column_values_to_name_maps,
  make_categories_from_groups
} from '../../settings/parse';
import { Series, Group, Category } from '../../models/Series';

describe('find_object_in_label_list', () => {
  it('should find the correct name map in the label list', () => {
    const testType = Column_Label_Values.RANGE;
    const labelList: LabelList = {
      key: [],
      cokey: [],
      special: [],
      range: [ { alias: 'test', original: 'test' }],
      anchor: []
    };
    const alias = 'test';

    const expected_value = { alias: 'test', original: 'test' };
    const actual_value = find_object_in_label_list(testType, labelList, alias);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('make_series_name', () => {
  it('should correctly generate a name from a series object', () => {
    const series = new Series();
    series.groupName = "Test Group Name";
    series.name = "Test Series Name";

    const expected_value = "Series_TestGroupName_TestSeriesName";
    const actual_value = make_series_name(series);

    assert.equal(actual_value, expected_value);
  });
});

describe('modify_column_name', () => {
  it('should prepend a numeric input with "n"', () => {
    const input = "1200";

    const expected_value = "n1200";
    const actual_value = modify_column_name(input);

    assert.equal(actual_value, expected_value);
  });
  it('should otherwise pass through an input', () => {
    const input = "test";

    const actual_value = modify_column_name(input);

    assert.equal(actual_value, input);
  });
});

describe('make_info', () => {
  it('should correctly transform settings into a column info object', () => {
    const settings: ColumnSettings = {
      name: "Test",
      type: "string",
      label: Column_Label_Values.RANGE
    };
    const expected_value: ColumnInfo = {
      nameMap: {
        original: "Test",
        alias: "test"
      },
      type: Postgres_Type.STRING,
      label: Column_Label_Values.RANGE
    };
    const actual_value = make_info(settings);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('make_info_from_spread', () => {
  it('should make many columns from a settings spread', () => {
    const settings: ColumnSettings = {
      name: "1..3",
      type: "number",
      label: Column_Label_Values.RANGE
    };

    const expected_values = [
      {
        nameMap: {
          alias: "n1",
          original: "1"
        },
        type: Postgres_Type.NUMBER,
        label: Column_Label_Values.RANGE
      },
      {
        nameMap: {
          alias: "n2",
          original: "2"
        },
        type: Postgres_Type.NUMBER,
        label: Column_Label_Values.RANGE
      },
      {
        nameMap: {
          alias: "n3",
          original: "3"
        },
        type: Postgres_Type.NUMBER,
        label: Column_Label_Values.RANGE
      }
    ];

    const actual_value = make_info_from_spread(settings);

    assert.deepEqual(actual_value, expected_values);
  });
});

describe('make_info_from_column', () => {
  it('should call the spread function if the column has a spread modifier', () => {
    const settings: ColumnSettings = {
      name: "1..2",
      type: "number",
      label: Column_Label_Values.RANGE,
      modifier: Column_Modifier_Values.MANY
    };

    const actual_value = make_info_from_column(settings);
    assert.equal(actual_value.length, 2);
  });
  it('should return a singleton if the column does not have a spread modifier', () => {
    const settings: ColumnSettings = {
      name: "Test",
      type: "string",
      label: Column_Label_Values.ANCHOR
    };

    const actual_value = make_info_from_column(settings);
    assert.equal(actual_value.length, 1);
  });
});

describe('sort_into_groups', () => {
  it('should correctly sort a list of series into groups', () => {
    const series: Series[] = [];
    const first = new Series();
    first.name = "first";
    first.groupName = "firstGroup";
    series.push(first);
    const second = new Series();
    second.name = "second";
    second.groupName = "secondGroup";
    series.push(second);
    const third = new Series();
    third.name = "third";
    third.groupName = "firstGroup";
    series.push(third);

    const actual_value = sort_into_groups(series);

    assert.equal(actual_value.length, 2);
    assert.equal(actual_value[0].name, "firstGroup");
    assert.equal(actual_value[1].name, "secondGroup");
  });
});

describe('generate_groups_from_settings', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('create_group_list', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('make_categories_from_groups', () => {
  it('should make a list of categories from a list of groups', () => {
    const groups: Group[] = [
      new Group("Group1", "Group1"),
      new Group("Group2", "Group2")
    ];
    const one = new Series();
    one.name = "Series1";
    one.category = "Category1";
    groups[0].series.push(one);

    const two = new Series();
    two.name = "Series2";
    two.category = "Category 2";
    groups[1].series.push(two);

    const expected_categories: Category[] = [];
    const catone = new Category("Category1");
    catone.addSeries(one);

    const cattwo = new Category("Category 2");
    cattwo.addSeries(two);

    expected_categories.push(catone, cattwo);

    const actual_value = make_categories_from_groups(groups);

    assert.deepEqual(actual_value, expected_categories);
  });
});

describe('column_values_to_name_maps', () => {
  it('should correctly create a list of column name maps from a list of strings', () => {
    const strs: string[] = [ 'test', 'test 2' ];
    const expected_value = [
      {
        original: 'test',
        alias: 'test'
      },
      {
        original: 'test 2',
        alias: 'test2' 
      }
    ];
    const actual_value = column_values_to_name_maps(strs);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('replace_symbol_with_phrase', () => {
  it('should replace % with Pcnt', () => {
    const expected_value = "Pcnt";
    const actual_value = replace_symbol_with_phrase("%");

    assert.equal(actual_value, expected_value);
  });
  it('should replace - with To', () => {
    const expected_value = "To";
    const actual_value = replace_symbol_with_phrase("-");

    assert.equal(actual_value, expected_value);
  });
  it('should replace & with And', () => {
    const expected_value = "And";
    const actual_value = replace_symbol_with_phrase("&");

    assert.equal(actual_value, expected_value);
  });
  it('should not replace any other value', () => {
    const expected_value = "A";
    const actual_value = replace_symbol_with_phrase("A");
    
    assert.equal(actual_value, expected_value);
  });
});

describe('replace_all_symbols_with_phrases', () => {
  it('should replace all symbols with phrases', () => {
    const input = "Total%12-13&Correlation";
    
    const expected_value = "TotalPcnt12To13AndCorrelation";
    const actual_value = replace_all_symbols_with_phrases(input);

    assert.equal(actual_value, expected_value);
  });
});

describe('sanitize_name', () => {
  it('should remove spaces from any input', () => {
    const input = "Test Name";

    const expected_value = "TestName";
    const actual_value = sanitize_name(input);

    assert.equal(actual_value, expected_value);
  });
  it('should replace any symbols in the input', () => {
    const input = "Total%";

    const expected_value = "TotalPcnt";
    const actual_value = sanitize_name(input);

    assert.equal(actual_value, expected_value);
  });
  it('should replace symbols and remove spaces from the same input', () => {
    const input = "Total% Test";
    
    const expected_value = "TotalPcntTest";
    const actual_value = sanitize_name(input);

    assert.equal(actual_value, expected_value);
  });
});