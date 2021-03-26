"use strict";
exports.__esModule = true;
var __1 = require("..");
var moment_1 = require("moment");
test("toMD makes good markdown", function () {
    var input = { "id": "0", "description": "test2 of add task",
        "end": "20201230T193817Z", "entry": "20201026T070000Z", "modified": "20201230T193817Z",
        "status": "deleted", "uuid": "3d3f46c1-72aa-4682-96a8-d5afc5b5481e", "urgency": "0.367123" };
    var inTask = input;
    var res = __1.toMD(inTask);
    console.log(res);
    expect(res).toBe("- [*] test2 of add task {id:3d3f46c1-72aa-4682-96a8-d5afc5b5481e}");
});
test('findAll from markdown', function () {
    var input = "\n- [x] test 1\n- [*] test 2\n- [ ] test 3\n- [ ] test #tag";
    var res = __1.findAll(input, 'test');
    expect(res.length).toBe(4);
});
test('add new task with date', function () {
    var date = new Date(2020, 11, 26);
    var task = {
        item: "tape test 2",
        tags: ["tag3", "tag4"],
        complete: false,
        date: date
    };
    var tnum = __1.add(task, 'test');
    var tw = __1.getTask(tnum)[0];
    expect(tw.description).toBe("tape test 2");
    expect(tw.status).toBe("pending");
    expect(tw.tags.length).toBe(2);
    expect(tw.uuid.length).toBe(36);
    var entryDate = moment_1["default"](tw.entry, "YYYYMMDDTHHmmssZ").toDate();
    expect(entryDate.getTime()).toBe(date.getTime());
    __1.rem(tnum);
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
