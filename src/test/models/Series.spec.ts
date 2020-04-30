// import { assert } from 'chai';
// import 'mocha';

// import { Category } from '../../models/Category.model';
// import { Series } from '../../models/Series.model';
// import { Group } from '../../models/Group.model';

// describe('Series', () => {
//   it('should be constructed with some empty fields', () => {
//     const series = new Series();

//     assert.equal(series.name, '');
//     assert.equal(series.category, '');
//     assert.equal(series.location, '');
//   });
// });

// describe('Group', () => {
//   const group = new Group('groupName', 'anchorVal');

//   it('should be constructed with some empty fields', () => {    
//     assert.equal(group.name, 'groupName');
//     assert.equal(group.anchorVal, 'anchorVal');
//     assert.equal(group.series.length, 0);
//     assert.equal(Object.keys(group.domainKeyValues).length, 0);
//   });

//   it('should add a series', () => {
//     const series = new Series();
//     series.name = 'test';

//     const expected_value = 1;
//     const actual_value = group.addSeries(series);

//     assert.equal(actual_value, expected_value);
//     assert.equal(series.groupName, 'groupName');
//     assert.equal(series.group, group);
//   });
// });

// describe('Category', () => {
//   it('should sanitize whatever name it is given', () => {
//     const name = 'Name With Spaces';
//     const category = new Category(name);

//     const expected_value = 'NameWithSpaces';
//     const actual_value = category.name.alias;

//     assert.equal(actual_value, expected_value);
//   });
  
//   it('should add a series', () => {
//     const series = new Series();
//     const category = new Category('test');

//     const expected_value = 1;
//     const actual_value = category.addSeries(series);

//     assert.equal(actual_value, expected_value);
//   });
// });