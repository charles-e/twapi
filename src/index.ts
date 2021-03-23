import moment, { Moment } from 'moment';
import { execFileSync } from 'child_process';
import which from 'which';

export interface TaskAnnotation {
  description: string;
  entry: string;
}

export interface Task {
  id?: string;
  description?: string;
  status?: string;
  annotations?: TaskAnnotation[];
  modified?: string;
  uuid?: string;
  uniq?: number;
  entry?: string;
  loclen?: string;
  tags?: string[];
}
let taskPath: string = '/usr/local/bin/task';

export function setTaskPath(path: string) {
  taskPath = which.sync(path);
}
export function getTaskPath() {
  return taskPath;
}

export function add(task: Task, relPath: string) {
  let tags: string[] = [];
  if (task.tags) {
    tags = task.tags.map(t => '+' + t);
  }
  let cmdArray = ['add'];
  const taskDesc = task.description || '';
  cmdArray.concat([taskDesc]).concat(tags);
  console.log(cmdArray);
  execFileSync(taskPath, cmdArray).toString();
  // force a gc so that tasknums are synced
  //let list = childProcess.execFileSync( taskPath, ["list"]).toString('utf-8');
  //console.log(list);
  let txt = execFileSync(taskPath, ['+PENDING', 'export']).toString();
  let json = JSON.parse(txt); // tasks numbered from one not zero
  let idx = json.length - 1;
  task.uuid = json[idx].uuid;
  const uuid = task.uuid || '';
  if (task.status === 'completed') {
    execFileSync(taskPath, [uuid, 'done']).toString();
  }
  if (task.entry) {
    entry(uuid, task.entry);
  }
  note(uuid, `file=${encodeURIComponent(relPath)}`);

  const added = JSON.parse(
    execFileSync(taskPath, [uuid, 'export']).toString()
  )[0];

  return added;
}

export function getTask(id: string) {
  const taskparm = [id, 'export'];
  const output = execFileSync(taskPath, taskparm).toString();
  //console.log(output)
  return JSON.parse(output);
}

const todoWithTask: RegExp = /(^\s*[-,\\*] \[)([ ,x,\\*])(\]\s+)(\S.*)$/gm;
const tagMarker: RegExp = /#(\S+)/gm;
const markMarker: RegExp = /{(ok|id):([1-9][0-9,\\.]*|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}/gm;

export function findMarks(input: string) {
  const map: Map<string, string> = new Map();
  let match = markMarker.exec(input);
  let modified: string = input;
  while (match) {
    modified = spliceSlice(modified, match.index, match[0].length, '');
    const type = match[1];
    const val = match[2];
    map.set(type, val);
    match = markMarker.exec(input);
  }
  map.set('str', modified.trim());
  return map;
}

function findTags(input: string) {
  const ret = [];
  const matchIt = input.matchAll(tagMarker);
  const matches = Array.from(matchIt);

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    ret.push(match[1]);
  }
  return ret;
}

function spliceSlice(
  str: string,
  index: number,
  count: number,
  add: string
): string {
  // We cannot pass negative indexes directly to the 2nd slicing operation.
  if (index < 0) {
    index = str.length + index;
    if (index < 0) {
      index = 0;
    }
  }

  const loc2 = index * 1.0 + count * 1.0;
  return str.slice(0, index) + (add || '') + str.slice(loc2);
}

function taskSort(x: Task, y: Task) {
  if (y && x && y.loclen && x.loclen) {
    let lVal = parseInt(y.loclen.split(':')[0]);
    let rVal = parseInt(x.loclen.split(':')[0]);
    return lVal - rVal;
  }
  return 0;
}

export function replaceAllMD(text: string, tasks: Task[]) {
  let newtxt = text;

  try {
    tasks = tasks.sort(taskSort);
  } catch (e) {
    console.log(e);
    process.exit();
  }
  for (const t in tasks) {
    const task = tasks[t];
    const loclen = task.loclen;
    if (loclen) {
      const ldata: string[] = loclen.split(':');
      const ldIdx = parseInt(ldata[0]);
      const ldLen = parseInt(ldata[1]);
      const origtask = text.substr(ldIdx, ldLen);
      const newtask = toMD(task);
      console.log(newtask);
      if (newtask !== origtask) {
        newtxt = spliceSlice(newtxt, ldIdx, ldLen, newtask);
        console.log('full');
        console.log(newtxt);
        console.log('full');
      }
    }
  }
  return newtxt;
}

export function findAll(input: string, source: string) {
  const ret = [];
  let match = todoWithTask.exec(input);
  while (match) {
    const item = fromMatch(match);
    if (source != undefined && source != null) setPath(item, source);
    ret.unshift(item);
    match = todoWithTask.exec(input);
  }
  return ret;
}
interface Indexed {
  index: number;
  length: number;
}
type MatchType = string | Indexed;

function fromMatch(match: MatchType[]): Task {
  const status: string =
    <string>match[1] === 'x'
      ? 'completed'
      : <string>match[1] === '*'
      ? 'deleted'
      : 'pending';
  let rawItem: string = match[4] as string;
  const tags = findTags(rawItem);
  let desc = tags.length === 0 ? rawItem.trim() : rawItem.split('#')[0].trim();
  const marks = findMarks(desc);
  desc = marks.get('str') || desc;
  const uuid = marks.get('id');
  //const indexed = match as unknown;
  const matchIdx = (<Indexed>(match as any)).index;
  const lenTot = (<Indexed>match[0]).length;

  const ret: Task = {
    status: status,
    description: desc,
    loclen: `${matchIdx}:${lenTot}`,
    tags: tags,
  };
  if (uuid) {
    ret.uuid = uuid;
  }
  return ret;
}

export function fromMD(text: string) {
  const all = findAll(text, '');
  if (all.length > 0) {
    return all[0];
  } else return {};
}

export function toMD(task: Task) {
  const chkBox =
    task.status === 'completed'
      ? '- [x] '
      : task.status === 'deleted'
      ? '- [*] '
      : '- [ ] ';
  const desc = task.description && task.description.trim();
  const tags =
    task.tags && task.tags.length > 0 ? ' #' + task.tags.join(' #') : '';
  const lastTouch = moment(task.modified, 'YYYYMMDD[T]HHmmss[Z]');
  /*
    if (task.status === "completed"){
      debugger;
    }
  */
  const doneTag =
    task.status === 'completed' ? ` {ok:${lastTouch.toDate().getTime()}}` : '';
  const stat = ` {id:${task.uuid}}${doneTag}`;
  return chkBox + desc + tags + stat;
}

export function importTasks(json: any) {
  let strVal;
  if (typeof json == 'object') {
    strVal = JSON.stringify(json);
  } else if (typeof json == 'string') {
    strVal = json;
  } else {
    throw 'invalid json';
  }
  const taskparm = ['import'];
  return execFileSync(taskPath, taskparm, { input: strVal }).toString('utf-8');
}

export function exportTasks(id: string) {
  let output: string;
  const taskparm = ['export'];
  if (id) {
    taskparm.push(id);
  }
  output = execFileSync(taskPath, taskparm).toString();
  const json = JSON.parse(output);
  return json;
}

function diffLast(x: Task, y: Task) {
  const fmt = 'YYYYMMDD[T]HHmmss[Z]';
  let ret = moment(y.modified, fmt).diff(moment(x.modified, fmt));
  if (ret === 0 && y.uniq != undefined && x.uniq != undefined) {
    //console.log(`uniq ${y.uniq} ${x.uniq}`);
    ret = y.uniq - x.uniq;
  }
  return ret;
}

export function last(api: any): Task[] {
  const doExport = api ? api.exportTasks : exportTasks;

  const json = doExport();
  if (json instanceof Array && json.length > 0) {
    const sorted = json.sort(diffLast);
    console.log('last.uuid = ' + sorted[0].uuid);
    return sorted[0];
  }
  throw 'no result';
}

/* get all the tasks that obsidian will care about

export function obsidian(){
    const taskparm = ['-DELETED', 'export'];
    const output = execFileSync( taskPath, taskparm ).toString('utf-8');
  const all = JSON.parse(output);
  const mapper = t => {
    const notes = t.annotations;
    if (notes){
    notes.map(n as TaskAnnotation => {
      if (n.description.startsWith("file=")){
        t.page = decodeURIComponent( n.description.substring(5));
      }
    });
    }
    return t;
  }
  return all.map(mapper).filter(t => t.page);
}
*/
/*
export function active(){
    const taskparm = ['-DELETED', 'export'];
    const output = execFileSync( taskPath, taskparm ).toString('utf-8');
  return JSON.parse(output);
}
*/
export function rem(id: string) {
  const taskparm = ['delete'].concat([id]);
  const output = execFileSync(taskPath, taskparm, {
    input: 'yes\n',
  }).toString();
  console.log(output);
  return output;
}

export function note(id: string, val: string) {
  const taskparm = [id, 'annotate'].concat([val]);
  const output = execFileSync(taskPath, taskparm, {
    input: 'yes\n',
  }).toString();
  return output;
}

export function done(id: string) {
  const taskparm = [id, 'done'];
  execFileSync(taskPath, taskparm).toString();
}

function getPath(old: Task) {
  if (old.annotations && old.annotations.length > 0) {
    const hit = old.annotations.filter(f => f.description.startsWith('file='));
    if (hit.length > 0) {
      return hit[0].description.substr(5);
    }
  }
  return null;
}

function setPath(old: Task, relpath: string) {
  if (!(old.annotations && old.annotations.length > 0)) {
    old.annotations = [];
  }
  if (!relpath) {
    old.annotations = old.annotations.filter(
      n => !n.description.startsWith('file=')
    );
    return;
  }
  let hit = false;
  for (const a in old.annotations) {
    const note: TaskAnnotation = old.annotations[a];
    if (note.description.startsWith('file=')) {
      hit = true;
      note.entry = moment().format('YYYYMMDD[T]HHmmss[Z]');
      note.description = `file=${relpath}`;
    }
  }
  if (!hit) {
    old.annotations.push({
      entry: moment().format('YYYYMMDD[T]HHmmss[Z]'),
      description: `file=${relpath}`,
    } as TaskAnnotation);
  }
}

export function upsertAll(tasks: Task[], relPath: string, twApi: any) {
  const doUpsert = twApi != undefined ? twApi.upsert : upsert;

  const ret = [];
  for (const t in tasks) {
    const task: Task = tasks[t];
    task.uniq = parseInt(t);
    ret.unshift(doUpsert(task, relPath, twApi));
    if (
      ret.length > 1 &&
      ret[ret.length - 1].uuid === ret[ret.length - 2].uuid
    ) {
      console.log('debugger');
    }
  }
  return ret;
}
/*
function toMmt (val)  {
  if (val instanceof moment){
    return val;
  }
  if (val instanceof Date) {
    return moment(val);
  }
  if (val instanceof Number){
    return moment(val);
  }

}
*/
export function upsert(task: Task, relPath: string, twApi: any) {
  const doImport = twApi != undefined ? twApi.import : importTasks;
  const getLast = twApi != undefined ? twApi.last : last;
  const getById = twApi != undefined ? twApi.getTask : getTask;
  const jsonIn = [
    {
      description: task.description,
      tags: task.tags ? task.tags : [],
      status: task.status,
      loclen: task.loclen,
      uniq: task.uniq || 0,
    },
  ];
  if (relPath) {
    setPath(jsonIn[0], relPath);
  }
  const old = task.uuid && getById(task.uuid);
  if (old && old[0]) {
    const taskTouch = moment(task.modified, 'YYYYMMDD[T]HHmmss[Z]');
    const oldTouch = moment(old[0].modified, 'YYYYMMDD[T]HHmmss[Z]');
    if (taskTouch.isBefore(oldTouch)) {
      return old[0];
    }

    const oldPath = getPath(old[0]);
    if (oldPath != relPath) {
      setPath(old[0], relPath);
    }
    old[0].tags = jsonIn[0].tags;
    old[0].status = jsonIn[0].status;
    old[0].description = jsonIn[0].description;
    old[0].uniq = task.uniq || 0;
    old[0].loclen = jsonIn[0].loclen;
    doImport(old);
    console.log('updating');
    return getById(task.uuid);
  } else {
    console.log('adding new');
    doImport(jsonIn);
    // return the id
    //
    const ret = getLast(twApi);
    if (task.loclen) {
      ret.loclen = task.loclen;
    }
    return ret;
  }
}

export function entry(id: string, date: unknown) {
  let value = 'entry:';
  if (date instanceof Date) {
    const myDate: Date = date;
    value = `${value}${myDate.getFullYear()}-${myDate.getMonth() +
      1}-${myDate.getDate()}`;
  }
  if (date instanceof moment) {
    const myMom: Moment = date as Moment;
    const dateVal = myMom.format('YYY-MM-DD');
    value = `${value}${dateVal}`;
  }
  const taskparm = [id, 'modify'].concat([value]);
  const output = execFileSync(taskPath, taskparm).toString();
  console.log(output);
  return output;
}

