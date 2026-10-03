"""Integration regressions found during the full repository/design review."""
import importlib.util
import json
import subprocess
from pathlib import Path

import pytest
from test_regressions import ROOT, run_game_action_smoke


def node(script, *args):
    result = subprocess.run(["node", "-e", script, *args], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def test_future_save_survives_boot_tick_manual_save_and_slot_import():
    original = {"schemaVersion": 99, "money": 987654, "totalMoney": 987654}
    result = run_game_action_smoke(original, """
window.__testApi.tick(); window.__testApi.saveGame();
window.__testApi.importSaveText(JSON.stringify({schemaVersion:3, money:1}), true);
window.__testApi.loadFromSlot('1', true);
""")
    assert result['save'] == original


def test_future_save_runtime_blocks_writes_without_using_an_older_backup():
    result = node("""
const fs=require('fs'),vm=require('vm'),window={};
vm.runInNewContext(fs.readFileSync('js/runtime/save.js','utf8'),{window,console});
const runtime=window.AIBS_CREATE_SAVE_RUNTIME({saveKey:'save',schemaVersion:3});
const original=JSON.stringify({schemaVersion:99,money:999});
const values={save:original,save_backup:JSON.stringify({schemaVersion:3,money:5})};
const storage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};
const loaded=runtime.load(storage);let blocked=false;
try{runtime.save(storage,{money:0});}catch(e){blocked=e.code==='UNSUPPORTED_SCHEMA';}
console.log(JSON.stringify({readOnly:loaded.readOnly,source:loaded.source,blocked,unchanged:values.save===original,corrupt:values.save_corrupt||null}));
""")
    assert result == dict(readOnly=True, source='unsupported', blocked=True, unchanged=True, corrupt=None)


def test_import_checkpoint_survives_repeated_autosaves_and_restores_original():
    result = run_game_action_smoke({'schemaVersion':3,'money':1234,'totalMoney':1234}, """
window.__testApi.importSaveText(JSON.stringify({schemaVersion:3,money:987,totalMoney:987}), true);
for(let i=0;i<15;i++) window.__testApi.saveGame();
window.__testResult={checkpoint:JSON.parse(window.__testApi.STORAGE.getItem('ai_black_startup_save_v1_checkpoint')).money};
""")
    assert result['testResult']['checkpoint'] == 1234
    assert result['save']['money'] == 987


def test_syntax_checker_propagates_nested_file_failure(tmp_path):
    spec=importlib.util.spec_from_file_location('syntax',ROOT/'scripts/check_javascript.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    (tmp_path/'main.js').write_text('"use strict";')
    (tmp_path/'sw.js').write_text('"use strict";')
    nested=tmp_path/'js'/'nested';nested.mkdir(parents=True)
    (nested/'invalid.js').write_text('const broken = ;')
    with pytest.raises(subprocess.CalledProcessError):
        module.check(tmp_path)


def test_pending_service_worker_fetch_cannot_recreate_deleted_cache():
    result=node("""
const fs=require('fs'),vm=require('vm');
(async()=>{
const events={},store=new Set(),deleted=[],opens=[];let finish;
const network=new Promise(resolve=>finish=resolve);
const self={location:{origin:'https://example.test'},addEventListener:(t,f)=>events[t]=f,skipWaiting:()=>Promise.resolve(),clients:{claim:()=>Promise.resolve()}};
const caches={open:async key=>{opens.push(key);store.add(key);return{addAll:async()=>{}};},keys:async()=>[...store],delete:async key=>{deleted.push(key);return store.delete(key);},match:async()=>undefined};
vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,caches,fetch:()=>network,URL,console});
let installation;events.install({waitUntil:p=>installation=p});await installation;
const retired=[...store][0];let response;
events.fetch({request:{method:'GET',url:'https://example.test/uncached.js',mode:'same-origin'},respondWith:p=>response=p});
await Promise.resolve();await Promise.resolve();store.delete(retired);
finish({status:200,clone(){return this;}});await response;
console.log(JSON.stringify({recreated:store.has(retired),opens:opens.length}));
})().catch(e=>{console.error(e);process.exit(1);});
""")
    assert result == dict(recreated=False, opens=1)


@pytest.mark.parametrize('scenario',['mature','end','crisis'])
def test_extracted_simulation_matches_merged_baseline_for_600_ticks(scenario):
    spec=importlib.util.spec_from_file_location('ui_fixture',ROOT/'scripts/ui_experience_check.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    save=getattr(module,scenario.upper()+'_SAVE')
    expected=json.loads((ROOT/'tests/fixtures/simulation_24823d9.json').read_text())[scenario]
    action="""
Date.now = function () { return 2000000000000; };
let seed=12345; Math.random=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<600;i++) window.__testApi.tick(); window.__testApi.saveGame();
"""
    actual=run_game_action_smoke(save,action)['save']
    assert {key:actual[key] for key in expected} == expected


def test_recovery_prefers_checkpoint_and_falls_back_if_checkpoint_is_corrupt():
    result=node("""
const fs=require('fs'),vm=require('vm'),window={};
vm.runInNewContext(fs.readFileSync('js/runtime/save.js','utf8'),{window,console});
const r=window.AIBS_CREATE_SAVE_RUNTIME({saveKey:'s',schemaVersion:3});
const values={s:JSON.stringify({schemaVersion:3,money:123})};
const store={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};
r.checkpointCurrent(store);r.save(store,{money:999});r.save(store,{money:1000});
const checkpoint=r.restoreBackup(store).data.money;
values.s_checkpoint='{broken';values.s_backup=JSON.stringify({schemaVersion:3,money:777});
const available=r.hasBackup(store),fallback=r.restoreBackup(store).data.money;
console.log(JSON.stringify({checkpoint,available,fallback}));
""")
    assert result == dict(checkpoint=123,available=True,fallback=777)
