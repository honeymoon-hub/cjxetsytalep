import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const owner='a'.repeat(64),id=owner+'/11111111-1111-4111-8111-111111111111';
const records=new Map([['app/owner',{owner}],['tickets/'+id,{id,title:'Existing ticket',body:'Keep me',status:'open',priority:'normal',created:'2026-11-18T00:00:00Z',token:'private'}]]);
const bucket={get:async key=>records.has(key)?{json:async()=>records.get(key)}:null,put:async(key,value)=>records.set(key,JSON.parse(value)),list:async({prefix})=>({objects:[...records.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false})};
const c=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Request,Response,Headers,URL,File,atob,console});
vm.runInContext((await readFile('worker/index.js','utf8')).replace('export default {','globalThis.worker = {'),c);
const claims={sub:'visitor',email:'visitor@example.com',name:'Open'};
async function reply(cjLink){const body=new FormData();body.set('sku','SKU-123');body.set('stockStatus','In stock');if(cjLink!==undefined)body.set('cjLink',cjLink);const r=new Request('https://test/api/reply?id='+id,{method:'POST',headers:{Origin:'https://honeymoon-hub.github.io'},body});return c.api(r,bucket,new URL(r.url),claims);}
assert.equal((await reply('https://www.cjdropshipping.com/product/test.html?x=1&y=2')).status,201);
assert.equal((await reply()).status,201);
for(const bad of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com','not a url'])await assert.rejects(()=>reply(bad),e=>e.status===400);
const request=new Request('https://test/api/detail?id='+id);
const result=await (await c.api(request,bucket,new URL(request.url),claims)).json();
assert.equal(result.ticket.body,'Keep me');assert.equal(result.ticket.token,undefined);assert.equal(result.replies.length,2);assert.equal(result.replies[0].cjLink,'https://www.cjdropshipping.com/product/test.html?x=1&y=2');
assert.equal((await c.worker.fetch(new Request('https://test/api/list'),{GOOGLE_CLIENT_ID:'configured'})).status,401);
console.log('PASS: optional CJ URL, persistence, unsafe URL rejection, old ticket compatibility, authentication');
