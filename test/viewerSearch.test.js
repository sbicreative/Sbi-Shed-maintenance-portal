const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/js/viewer.js'), 'utf8');

function setup() {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', textContent: '', innerHTML: '', disabled: false,
            listeners: {}, children: [], classList: { toggle() {}, add() {}, remove() {} },
            addEventListener(name, fn) { this.listeners[name] = fn; },
            appendChild(child) { this.children.push(child); },
            replaceChildren() { this.children = []; },
            select() {}, focus() {}, click() {}, remove() {}
        });
        return elements.get(id);
    };
    const context = vm.createContext({
        document: { getElementById: element, querySelector: element, createElement: () => element(Symbol()), body: element('body') },
        localStorage: { getItem: () => '{"name":"Viewer"}' },
        window: { addEventListener() {} }, setInterval() {}, setTimeout() {},
        console, alert() {}, Blob, URL
    });
    vm.runInContext(source, context);
    vm.runInContext(`viewerData = [
        {id:1,locoNo:'123',schedule:'IC',component:'TM'},
        {id:2,locoNo:'456',schedule:'IC',component:'TM'},
        {id:3,locoNo:'123',schedule:'IB',component:'Battery'}
    ]; historicalData = [{id:4,locoNo:'123',recordSource:'archive'}];`, context);
    return { context, element, run: code => vm.runInContext(code, context) };
}

test('Schedule and component searches combine with typed loco or all locos', () => {
    const { run, element } = setup();
    element('locoFilter').value = 'Select All Locos';
    run("searchViewerData('schedule', 'IC')");
    assert.equal(run('displayedData.length'), 2);
    element('locoFilter').value = ' 123 ';
    run("searchViewerData('schedule', 'IC')");
    assert.equal(run('displayedData[0].id'), 1);
    assert.equal(run('displayedData.length'), 1);
    run("searchViewerData('component', 'TM')");
    assert.equal(run('displayedData.length'), 1);
    element('locoFilter').value = '999';
    run("searchViewerData('component', 'TM')");
    assert.equal(run('displayedData.length'), 0);
    assert.equal(element('downloadResultsBtn').disabled, true);
    run("searchViewerData('loco', '123')");
    assert.equal(run('displayedData.length'), 2);
    run("searchViewerData('archive', '123')");
    assert.equal(run('displayedData[0].id'), 4);
    run('clearResult()');
    assert.equal(run('displayedData.length'), 0);
    assert.equal(element('downloadResultsBtn').disabled, true);
});

test('CSV quotes commas, quotes and newlines and neutralizes formulas', () => {
    const { context } = setup();
    assert.equal(context.csvCell('a,"b"\nc'), '"a,""b""\nc"');
    assert.equal(context.csvCell('=1+1'), '"\'=1+1"');
    assert.equal(context.csvCell(null), '""');
});
