/* Embedded minimal wmi-query (original project archived) - trimmed comments */
// NOTE: Adapted for internal use inside n8n-nodes-wmi. Executes WMIC commands locally.
// Must run on Windows host. Provides simplified get/listAlias/call.
const util = require('util');
const fs = require('fs');
const cp_exec = require('child_process').exec;

const Query = function(options) {
  this.timeout = options?.timeout || 5000;
  this._node = null;
  this._user = null;
  this._password = null;
  this._verb = null;
  this._alias = null;
  this._where = null;
  this._field = null;
  this._action = null;
  this._format = null;
  this._cmd = null;
  this._parser = null;
  this._help = false;
  if (options && typeof options === 'object') {
    if (options.verb) this.verb = options.verb;
    if (options.help) this._help = options.help;
    if (options.node) this.node = options.node;
    if (options.user && options.password) { this.user = options.user; this.password = options.password; }
    if (options.alias) this._alias = options.alias;
    if (options.where) this.where = options.where;
    if (options.field) this.field = options.field;
    if (options.action) this._action = options.action;
    if (options.format) this.format = options.format;
    if (options.cmd) this.cmd = options.cmd;
    if (options.parser) this.parser = options.parser;
  }
};
Object.defineProperties(Query.prototype, {
  node: { set(n){ if (Array.isArray(n)) this._node = n.join(','); else if (typeof n==='string') this._node=n; }, get(){ return this._node; } },
  user: { set(u){ if (typeof u==='string') this._user=u; }, get(){ return this._user; } },
  password: { set(p){ if (typeof p==='string') this._password=p; }, get(){ return this._password; } },
  where: { set(w){ if (Array.isArray(w)) this._where=w.join(' and '); else if (typeof w==='string') this._where=w; else this._where=null; }, get(){ return this._where; } },
  field: { set(f){ if (Array.isArray(f)) this._field=f.join(','); else if (typeof f==='string') this._field=f; else this._field=null; }, get(){ return this._field; } },
  format: { set(f){ if (Query.SUPPORTED_FORMATS.includes(f)) this._format=f; else this._format='JSON'; }, get(){ return this._format; } },
  cmd: { set(c){ if (!c.includes('wmic')) c = 'wmic '+c; c = c.replace(/[&|]/g,''); this._cmd=c; if (!this.verb){ if (c.includes(' get ') && this.verb!=='get') this.verb='get'; if (c.includes(' call ') && this.verb!=='call') this.verb='call'; } }, get(){ return this._cmd; } },
  verb: { set(v){ if (Query.SUPPORTED_VERBS.includes(v)) this._verb=v; }, get(){ return this._verb; } },
  parser: { set(p){ if (typeof p==='string' || typeof p==='function') this._parser=p; }, get(){ return this._parser; } },
});
Query.prototype.buildCmd = function(){ let cmd; if (!this.cmd){ cmd='wmic'; if (this._node) cmd+=' /node:'+this._node; if (this._node && this._password){ cmd+=' /user:'+this._user; cmd+=' /password:'+this._password; } if (this._alias) cmd+=' '+this._alias; if (this._where) cmd+=' where ('+this._where+')'; if (this.verb==='get'){ cmd+=' get'; if (this._field) cmd+=' '+this._field; } else if (this.verb==='call'){ cmd+=' call'; if (this._action) cmd+=' '+this._action; } } this.cmd=cmd; this.appendFormat(); return this; };
Query.prototype.checkCmd = function(){ if (this.format){ if (this.cmd.includes('/format')) this.cmd=this.cmd.replace(/\/format.*$/, ''); this.appendFormat(); } };
Query.prototype.appendFormat = function(){ if (this._help){ this._cmd+=' /?'; } else if (this.verb==='call'){ this._cmd=this._cmd.replace(/\/format(.*?)( |$)/,''); } else if (this.verb==='get'){ if (this._format==='JSON'){ this._cmd+=' /format:list'; } } };
Query.prototype.exec = function(callback){ if (!callback) callback=()=>{}; if (!this.cmd) this.buildCmd(); else this.checkCmd(); if (!Query.SUPPORTED_VERBS.includes(this._verb)){ callback({err:"Unsupported "+this.verb, stderr:""}); return; } const q=this; cp_exec(this.cmd,{encoding:'utf8', timeout:this.timeout}, function(err, stdout){ const output={err, stdout}; const result=new WMIResult(output,q); callback({cmd:q.cmd, err:result.error(), data:result.data()}); }); };
Query.SUPPORTED_VERBS=['get','call','NO_VERB'];
Query.SUPPORTED_FORMATS=['JSON'];
Query.listAlias=function(options, callback){ options.verb='NO_VERB'; options.help=true; options.parser='getHelpToJSON'; delete options.alias; delete options.where; new Query(options).exec(callback); };
Query.get=function(options, callback){ options.verb='get'; new Query(options).buildCmd().exec(callback); };
Query.call=function(options, callback){ options.verb='call'; new Query(options).exec(callback); };

const WMIResult=function(output, query){ this.parser=null; this.err=output.err; this.output=output.stdout; this.findParserFor(query); };
WMIResult.prototype.data=function(){ if (this.err) return null; return this.parser(this.output); };
WMIResult.prototype.error=function(){ if (this.err) return this.errorToJSON(this.err); return null; };
WMIResult.prototype.findParserFor=function(query){ if (typeof query.parser==='string' && typeof this[query.parser]==='function') this.parser=this[query.parser]; else if (typeof query.parser==='function') this.parser=query.parser; else if (query.verb==='get' && query.format==='JSON') this.parser=this.getToJSON; else if (query.verb==='call' && query.format==='JSON') this.parser=this.callToJSON; else this.parser=this.raw; };
WMIResult.prototype.errorToJSON=function(err){ return { message: err.message, code: err.code }; };
WMIResult.LINESEP='###SEP###';
WMIResult.splitOutput=function(output){ return output.replace(/(\r?\n|\r){4,}/g, '£'+WMIResult.LINESEP+'£').replace(/(\r?\n|\r)+/g,'£').split('£'); };
WMIResult.prototype.getToJSON=function(output){ const temp=WMIResult.splitOutput(output); const result=[]; let r={}; let emptyR=true; for (let i=0;i<temp.length;i++){ if (temp[i]==WMIResult.LINESEP){ if(!emptyR){ result.push(r); r={}; emptyR=true; } } const found=temp[i].match(/^(.*?)=(.*?)$/); if (found && found.length===3){ r[found[1]]=found[2]; emptyR=false; } } if(!emptyR) result.push(r); return result; };
WMIResult.prototype.callToJSON=function(output){ const temp=WMIResult.splitOutput(output); let returnValue=null; for (let i=0;i<temp.length;i++){ if (temp[i].includes('ReturnValue')){ const m=temp[i].match(/= +(\d+)/); if (m && m.length===2) returnValue=m[1]; break; } } return { returnValue }; };
WMIResult.prototype.getHelpToJSON=function(output){ const FIRST_ALIAS='ALIAS'; const LAST_ALIAS='WMISET'; const temp=WMIResult.splitOutput(output); const list=[]; let foundStart=false; for (let i=0;i<temp.length;i++){ if (temp[i]==WMIResult.LINESEP) continue; if (temp[i].indexOf(FIRST_ALIAS)===0) foundStart=true; if (foundStart){ const content=temp[i].match(/([A-Z]*)\s*\-\s*(.*)$/); if (content && content.length===3) list.push({alias:content[1], caption:content[2]}); if (temp[i].indexOf(LAST_ALIAS)===0) break; } } return list; };
WMIResult.prototype.raw=function(output){ return output; };

module.exports = { Query };
