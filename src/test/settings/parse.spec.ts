import { assert } from "chai";
import "mocha";

import { 
  Column_Label_Values, 
  LabelList, 
  find_object_in_label_list,
  make_series_name
} from '../../settings/parse';
import { Series } from '../../models/Series';

describe('find_object_in_label_list', () => {
  it('should find the correct name map in the label list', () => {
    const testType = Column_Label_Values.RANGE;
    const labelList: LabelList = {
      key: [],
      special: [],
      range: [ { alias: 'test', original: 'test' }],
      anchor: []
    };
    const alias = 'test';

    const expected_value = { alias: 'test', original: 'test' };
    const actual_value = find_object_in_label_list(testType, labelList, alias);

    assert.deepEqual(actual_value, expected_value);
  })
});

describe('make_series_name', () => {
  it('should correctly generate a name from a series object', () => {
    const series = new Series();
    series.groupName = "Test Group Name";
    series.name = "Test Series Name";

    const expected_value = "Series_TestGroupName_TestSeriesName";
    const actual_value = make_series_name(series);

    assert.equal(actual_value, expected_value);
  })
});

describe('modify_column_name', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('make_info', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('make_info_from_spread', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('make_info_from_column', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('sort_into_groups', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('generate_groups_from_settings', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('create_group_list', () => {
  it('should have tests written for it', () => assert.fail());
});