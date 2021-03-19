import { toMD, findAll, Task, rem as twtRem, add as twtAdd, getTask as twtGet }  from '../src';

import moment from 'moment';


  test("toMD makes good markdown", () => {
  const input = {"id":"0","description":"test2 of add task",
    "end":"20201230T193817Z","entry":"20201026T070000Z","modified":"20201230T193817Z",
    "status":"deleted","uuid":"3d3f46c1-72aa-4682-96a8-d5afc5b5481e","urgency":"0.367123"};

    let inTask : Task = input as Task;
    let res = toMD(inTask);
    console.log(res);
  expect(res).toBe("- [*] test2 of add task {id:3d3f46c1-72aa-4682-96a8-d5afc5b5481e}");
});

  test('findAll from markdown', () => {
  let input =
`
- [x] test 1
- [*] test 2
- [ ] test 3
- [ ] test #tag`;

let res = findAll(input,'test');
  expect(res.length).toBe(4);
});


test('add new task with date', () =>{
  const date = new Date(2020,11,26);
  const task = {
    item: "tape test 2",
    tags: ["tag3","tag4"],
    complete: false,
    date : date
  };
  const tnum = twtAdd(task, 'test');
  const tw = twtGet(tnum)[0];
  expect(tw.description).toBe("tape test 2");
  expect(tw.status).toBe("pending");
  expect(tw.tags.length).toBe(2);
  expect(tw.uuid.length).toBe(36);
  var entryDate = moment(tw.entry,"YYYYMMDDTHHmmssZ").toDate();
  expect(entryDate.getTime()).toBe(date.getTime());
  twtRem(tnum);
});
/*
skip('fetch pending',  =>{
  t.plan(3);
  const task = {
    item: "tape test 3",
    tags: ["tag5","tag6"],
    complete: false
  };
  const tnum = twt.add(task);
  console.log(`tnum = ${tnum}`)
  const twtask = twt.get(tnum)[0];
  const list = twt.active();
  t.equals(task.id.length, 36, "task id is set");
  t.equals(list.length,1,'1 task good');

  twt.rem(twtask.uuid);
  const list2= twt.active();
  t.equals(list2.length,0,'0 task good');
});
*/
