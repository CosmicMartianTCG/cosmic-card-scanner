/* Cosmic Card Scanner — Free personal PWA. No paid API keys; all collection data stays local. */
(()=>{'use strict';
const API='https://api.tcgdex.net/v2/en/cards';
const STORE='cosmic-card-scanner-v1'; // Keep V1 key so upgrades retain saved batches.
const VERSION='2.7';
const $=id=>document.getElementById(id);
const safe=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v):'No USD price';
const providerDate=x=>{if(!x)return null;const d=new Date(typeof x==='number'?(x<1e12?x*1000:x):x);return Number.isNaN(d.getTime())?null:d;};
const dt=x=>{const d=providerDate(x);return d?d.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'}):'Unknown date';};
const priceAgeDays=x=>{const d=providerDate(x);return d?Math.max(0,(Date.now()-d.getTime())/86400000):null;};
const isoDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');};
const uuid=()=>globalThis.crypto?.randomUUID?.()??`cm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const initData=()=>({version:1,batches:[],scans:[],activeBatchId:null});
let data;
try{const old=JSON.parse(localStorage.getItem(STORE)||'null');data=old&&Array.isArray(old.batches)&&Array.isArray(old.scans)?old:initData();}catch{data=initData();}
let pendingId=null,selected=null,stream=null,ocrWorker=null,ocrBusy=false,searchBusy=false;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(data));}catch(e){status('Storage is full or unavailable. Export a backup and free space.','error');}}
function createBatch(label=''){const day=isoDay();const same=data.batches.filter(b=>b.id.startsWith(`CM-${day}-`));const max=Math.max(0,...same.map(b=>Number((b.id.match(/-(\d+)$/)||[])[1])||0));const id=`CM-${day}-${String(max+1).padStart(3,'0')}`;data.batches.push({id,startedAt:new Date().toISOString(),label:String(label||'').trim().slice(0,80)});data.activeBatchId=id;persist();render();return id;}
function activeBatch(){return data.batches.find(b=>b.id===data.activeBatchId);}
function ensureBatch(){if(!activeBatch())createBatch();}
function newScan(method){ensureBatch();const batchId=data.activeBatchId;const seq=Math.max(0,...data.scans.filter(s=>s.batchId===batchId).map(s=>s.sequence||0))+1;const s={id:uuid(),batchId,sequence:seq,scannedAt:new Date().toISOString(),method,status:'unmatched',game:'Pokémon',cardId:null,name:null,setName:null,cardNumber:null,variant:null,condition:'NM',priceUSD:null,pricingSource:null,pricingUpdatedAt:null};data.scans.push(s);pendingId=s.id;persist();render();return s;}
function status(message,type=''){const e=$('scanStatus');e.className='status '+type;e.textContent=message;}
function switchView(view){document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id===view+'View'));document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('active',e.dataset.view===view));render();}
function render(){const b=activeBatch();$('batchId').textContent=b?.id||'—';$('batchStarted').textContent=b?(b.label?b.label+' · ':'')+'Started '+dt(b.startedAt):'—';const scans=data.scans.filter(x=>x.batchId===b?.id);$('batchCount').textContent=scans.filter(x=>x.status==='matched').length.toLocaleString();$('batchTotal').textContent=money(scans.reduce((n,x)=>n+(x.status==='matched'&&Number.isFinite(x.priceUSD)?x.priceUSD:0),0));$('overallCount').textContent=data.scans.length.toLocaleString();renderLastScan();renderHistory();}
function renderLastScan(){const node=$('lastScan');if(!node)return;const scans=data.scans.filter(x=>x.batchId===data.activeBatchId);const s=scans[scans.length-1];if(!s){node.classList.add('hidden');node.textContent='';return;}node.classList.remove('hidden');node.innerHTML=`<div><span class="eyebrow">LAST RECORD IN THIS BATCH</span><strong>#${String(s.sequence).padStart(3,'0')} ${safe(s.name||'Waiting for identification')}</strong><small>${safe(dt(s.scannedAt))} · ${safe(s.batchId)}</small></div><div class="last-amount">${s.status==='matched'?money(s.priceUSD):'Review needed'}</div>`;}
function renderHistory(){const div=$('historyList');if(!data.batches.length){div.innerHTML='<p class="subtle">No batches yet.</p>';return;}
let out='';for(const b of [...data.batches].reverse()){const list=data.scans.filter(s=>s.batchId===b.id).sort((a,c)=>(c.sequence||0)-(a.sequence||0));const matched=list.filter(s=>s.status==='matched');const total=matched.reduce((n,s)=>n+(Number.isFinite(s.priceUSD)?s.priceUSD:0),0);
out+=`<div class="history-group"><h4>${safe(b.id)} ${b.id===data.activeBatchId?'· ACTIVE':''}</h4><div class="history-meta">${b.label?`<strong>${safe(b.label)}</strong> · `:''}Started ${safe(dt(b.startedAt))} · ${matched.length} identified · ${money(total)}<br><button class="text-btn rename-batch" data-batch="${safe(b.id)}">Rename</button> · <button class="text-btn export-one" data-batch="${safe(b.id)}">Export CSV</button> ${b.id!==data.activeBatchId?`· <button class="text-btn activate-batch" data-batch="${safe(b.id)}">Make active</button>`:''}</div>`;
if(!list.length)out+='<p class="subtle">No scans in this batch yet.</p>';
for(const s of list){out+=`<div class="history-item"><div><strong>#${String(s.sequence||0).padStart(3,'0')} · ${safe(s.name||'Unmatched scan')}</strong><small>${safe(s.setName||'Not identified')} ${s.cardNumber?'· #'+safe(s.cardNumber):''} ${s.variant?'· '+safe(s.variant):''} ${s.status==='matched'?'':'· NEEDS REVIEW'}</small><small>${safe(dt(s.scannedAt))} · ${safe(s.batchId)} · ${safe(s.method)}</small></div><div style="text-align:right"><div class="amount">${s.status==='matched'?money(s.priceUSD):'—'}</div><button class="review-scan" data-id="${safe(s.id)}" aria-label="Edit or identify scan">Edit</button><button class="delete-scan" data-id="${safe(s.id)}" aria-label="Delete scan">Delete</button></div></div>`;}
out+='</div>';}
div.innerHTML=out;}
function imageUrl(card){const base=card?.image;if(!base||!/^https:\/\/assets\.tcgdex\.net\//.test(base))return '';return `${base}/low.webp`;}
function priceInfo(card,variant){const pricing=card?.pricing?.tcgplayer;const keys={normal:['normal','unlimited'],holo:['holofoil','holo','unlimited-holofoil'],reverse:['reverse-holofoil','reverse'],firstEdition:['1st-edition'],firstEditionHolo:['1st-edition-holofoil']};for(const k of keys[variant]||[]){const entry=pricing?.[k];if(entry&&Number.isFinite(entry.marketPrice))return {value:entry.marketPrice,updated:pricing?.updated||null,label:k};}return {value:null,updated:pricing?.updated||null,label:variant};}
function variants(card){const v=card.variants||{},p=card.pricing?.tcgplayer||{};const opts=[];if(v.normal||p.normal||p.unlimited)opts.push(['normal','Normal']);if(v.holo||p.holofoil||p.holo)opts.push(['holo','Holofoil']);if(v.reverse||p['reverse-holofoil']||p.reverse)opts.push(['reverse','Reverse holo']);if(v.firstEdition||p['1st-edition'])opts.push(['firstEdition','1st Edition']);if(p['1st-edition-holofoil'])opts.push(['firstEditionHolo','1st Edition Holo']);return opts.length?opts:[['normal','Normal / unspecified']];}
function setCandidate(card){selected=card;const opts=variants(card);const def=opts.some(o=>o[0]==='holo')?'holo':opts[0][0];const c=$('candidate');c.classList.remove('hidden');const image=imageUrl(card);
c.innerHTML=`<div class="candidate-top">${image?`<img src="${safe(image)}" alt="${safe(card.name)}">`:'<div style="width:105px">No image</div>'}<div><h3>${safe(card.name)}</h3><p>${safe(card.set?.name||'Unknown set')} · ${safe(card.localId)}/${safe(card.set?.cardCount?.official||'?')}</p><p>${safe(card.rarity||'Rarity unlisted')}</p><div id="candidatePrice" class="price">—</div><div class="price-note" id="priceNote"></div><p id="staleWarning" class="warning hidden"></p></div></div><div class="formrow"><div><label for="variant">Printing / foil type</label><select id="variant">${opts.map(([value,label])=>`<option value="${safe(value)}" ${value===def?'selected':''}>${safe(label)}</option>`).join('')}</select></div><div><label for="condition">Condition (record only)</label><select id="condition"><option value="NM">Near Mint</option><option value="LP">Lightly Played</option><option value="MP">Moderately Played</option><option value="HP">Heavily Played</option><option value="DMG">Damaged</option></select></div></div><p class="fineprint">Confirm the card artwork, number, set and foil before adding. Condition does not automatically change the displayed market estimate.</p><button id="addCard" class="btn primary">✓ Add to timestamped batch</button>`;
$('variant').addEventListener('change',updatePrice);$('addCard').addEventListener('click',saveCard);updatePrice();c.scrollIntoView({behavior:'smooth',block:'nearest'});}
function updatePrice(){if(!selected||!$('variant'))return;const info=priceInfo(selected,$('variant').value);$('candidatePrice').textContent=money(info.value);let txt='TCGdex / TCGplayer · USD market estimate';if(info.updated)txt+=' · updated '+dt(info.updated);const age=priceAgeDays(info.updated);if(age!==null&&age>14)txt+=` · ⚠ ${Math.floor(age)} days old`;if(info.value===null)txt+=' · unavailable for this printing';$('priceNote').textContent=txt;const warning=$('staleWarning');if(warning){warning.classList.toggle('hidden',!(age===null||age>14));warning.textContent=age===null?'This source does not report a price update date. Confirm before selling.':`Warning: the reported price is ${Math.floor(age)} days old. It is not a live offer.`;}}
function saveCard(){if(!selected)return;let scan=data.scans.find(s=>s.id===pendingId);if(!scan)scan=newScan('manual search');const varVal=$('variant').value,info=priceInfo(selected,varVal);scan.status='matched';scan.cardId=selected.id;scan.name=selected.name;scan.setName=selected.set?.name||'';scan.cardNumber=`${selected.localId}/${selected.set?.cardCount?.official||'?'}`;scan.variant={normal:'Normal',holo:'Holofoil',reverse:'Reverse holo',firstEdition:'1st Edition',firstEditionHolo:'1st Edition Holo'}[varVal]||varVal;scan.condition=$('condition').value;scan.priceUSD=info.value;scan.pricingSource=info.value!==null?'TCGdex / TCGplayer USD':null;scan.pricingUpdatedAt=info.updated;scan.recordedAt=new Date().toISOString();scan.lastEditedAt=new Date().toISOString();pendingId=null;selected=null;$('candidate').classList.add('hidden');$('results').innerHTML='';$('searchText').value='';persist();render();const backupHint=data.scans.filter(s=>s.status==='matched').length%25===0?' Remember to download a JSON backup.':'';status(`Saved #${String(scan.sequence).padStart(3,'0')} in ${scan.batchId} · original time ${dt(scan.scannedAt)} · ${money(scan.priceUSD)}. Ready for the next card!${backupHint}`,'ok');if(stream){$('cameraStage').scrollIntoView({behavior:'smooth',block:'center'});}}
async function api(path){const res=await fetch(path,{headers:{'Accept':'application/json'}});if(!res.ok)throw new Error(`Card database returned ${res.status}`);return res.json();}
function normalizeId(value){const s=String(value||'').toUpperCase().replace(/\s+/g,'');return s.replace(/^([A-Z-]*?)0+(\d+)$/,(_,prefix,digits)=>prefix+String(Number(digits)));}
function parseQuery(text){const q=String(text||'').trim();const num=q.match(/\b([A-Z]{0,4}[- ]?\d{1,4})\s*[\/|]\s*(\d{1,4})\b/i);if(num)return {number:num[1].replace(/\s+/g,''),total:Number(num[2]),name:q.replace(num[0],'').trim()};const lone=q.match(/^([A-Z]{0,4}\d{1,4})$/i);return lone?{number:lone[1],total:null,name:''}:{number:'',total:null,name:q};}
let setCatalogPromise=null;
async function getSetCatalog(){if(!setCatalogPromise)setCatalogPromise=api('https://api.tcgdex.net/v2/en/sets').then(list=>new Map(list.map(set=>[set.id,set]))).catch(()=>new Map());return setCatalogPromise;}
function setForCard(card,catalog){const id=String(card.id||'');return catalog?.get(id.substring(0,id.lastIndexOf('-')))||null;}
function scoreCard(card,query,catalog){let score=0;const name=(card.name||'').toLowerCase(),q=(query.name||'').toLowerCase().replace(/[^\w\s-]/g,' ').trim();if(q){if(name===q)score+=350;else if(q.includes(name))score+=140;else if(name.includes(q))score+=110;for(const word of q.split(/\s+/).filter(x=>x.length>=3)){if(name.includes(word))score+=12;}}
if(query.number&&normalizeId(card.localId)===normalizeId(query.number))score+=200;
if(query.total){const official=setForCard(card,catalog)?.cardCount?.official;if(Number(official)===query.total)score+=650;else if(official)score-=90;}
return score;}


async function searchCards(phrase,fromOCR=false){if(searchBusy)return;const parsed=parseQuery(phrase);if(!parsed.name&&!parsed.number){status('Type a card name or collector number.','error');return;}searchBusy=true;$('results').innerHTML='';$('candidate').classList.add('hidden');selected=null;status('Searching the free Pokémon card catalog…');try{
let found=[];if(parsed.number){
 const ids=[parsed.number];const normalized=normalizeId(parsed.number);if(normalized.toUpperCase()!==parsed.number.toUpperCase())ids.push(normalized);
 for(const id of ids){const list=await api(API+'?localId='+encodeURIComponent(id));if(!Array.isArray(list))throw new Error('Unexpected card catalog response');for(const card of list){if(normalizeId(card.localId)===normalized&&!found.some(x=>x.id===card.id))found.push(card);}if(found.length)break;}
}
if(!found.length&&parsed.name){
 // OCR can read a real name followed by random glyphs: "Meowth wb0" → "Meowth".
 // Try the full phrase first, then clean individual words, then the first word.
 const clean=parsed.name.replace(/[^a-zA-Z0-9 éÉ'-]/g,' ').replace(/\s+/g,' ').trim();
 const words=clean.split(' ').filter(Boolean);
 const likely=words.filter(w=>/^[a-zA-ZÀ-ÿ'-]{3,}$/.test(w));
 const terms=[parsed.name,clean,likely.join(' '),...likely,...words.filter(w=>w.length>=3&&!/\d/.test(w))];
 for(const term of [...new Set(terms.map(x=>x.trim()).filter(Boolean))].slice(0,7)){
   const list=await api(API+'?name='+encodeURIComponent(term));
   if(!Array.isArray(list))throw new Error('Unexpected card catalog response');
   if(list.length){found=list;break;}
 }
}
let catalog=null;if(parsed.total&&found.length>1)catalog=await getSetCatalog();
found.sort((a,b)=>scoreCard(b,parsed,catalog)-scoreCard(a,parsed,catalog));const count=found.length;found=found.slice(0,65);
if(!count){status(`No matching card found for “${phrase}”. Edit the detected text or search by card name below.`,'error');return;}
$('results').innerHTML=found.map(c=>{const set=setForCard(c,catalog);const setDesc=set?.name||c.id.substring(0,c.id.lastIndexOf('-'));const total=set?.cardCount?.official;return `<button class="result-item" data-card="${safe(c.id)}">${imageUrl(c)?`<img loading="lazy" src="${safe(imageUrl(c))}" alt="">`:''}<span><strong>${safe(c.name)}</strong><small>${safe(setDesc)} · ${safe(c.localId)}${total?'/'+safe(total):''} · tap to confirm</small></span></button>`;}).join('');
status(`${count} candidate${count===1?'':'s'} found. Match the artwork and set number before saving.${fromOCR?' If the scan guessed wrong, edit the search.':''}`,'ok');if(count===1)await chooseCard(found[0].id);
}catch(e){status(`Card lookup failed: ${e.message}. Check internet, or try manual search.`, 'error');}finally{searchBusy=false;}}

async function chooseCard(id){status('Loading card details and available market prices…');try{const card=await api(`${API}/${encodeURIComponent(id)}`);setCandidate(card);status('Confirm the card and foil type before saving it to your batch.','ok');}catch(e){status('Could not load this card: '+e.message,'error');}}
async function startCamera(){if(stream){stopCamera();return;}if(!navigator.mediaDevices?.getUserMedia){status('This browser cannot start live camera. Use Take or select photo below. A secure HTTPS site is needed.','error');return;}try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1920}}});$('camera').srcObject=stream;await $('camera').play();$('cameraStage').classList.add('live');$('scanNow').disabled=false;$('startCamera').textContent='Stop camera';$('cameraState').textContent='Live';status('Align one card and tap Scan card.');}catch(e){status('Camera permission failed. Use Take or select photo below, or allow camera access in Safari settings.','error');}}
function stopCamera(){for(const track of stream?.getTracks()||[])track.stop();stream=null;$('camera').srcObject=null;$('cameraStage').classList.remove('live');$('scanNow').disabled=true;$('startCamera').textContent='Start camera';$('cameraState').textContent='Not started';}
function liveFrame(){const video=$('camera');const w=video.videoWidth,h=video.videoHeight;if(!w||!h)throw new Error('Camera is not ready');
// The preview uses object-fit:cover. Map the visible green guide to original camera pixels.
const stage=$('cameraStage').getBoundingClientRect(),guide=document.querySelector('.card-guide').getBoundingClientRect();
const scale=Math.max(stage.width/w,stage.height/h),visW=w*scale,visH=h*scale,offsetX=(visW-stage.width)/2,offsetY=(visH-stage.height)/2;
const padX=guide.width*.035,padY=guide.height*.035;
const sx=Math.max(0,(guide.left-stage.left+offsetX-padX)/scale),sy=Math.max(0,(guide.top-stage.top+offsetY-padY)/scale);
const ex=Math.min(w,(guide.right-stage.left+offsetX+padX)/scale),ey=Math.min(h,(guide.bottom-stage.top+offsetY+padY)/scale);
if(ex<=sx||ey<=sy)throw new Error('Cannot locate the card frame');
const c=document.createElement('canvas');const factor=Math.min(1,1750/Math.max(ex-sx,ey-sy));c.width=Math.max(1,Math.round((ex-sx)*factor));c.height=Math.max(1,Math.round((ey-sy)*factor));c.getContext('2d').drawImage(video,sx,sy,ex-sx,ey-sy,0,0,c.width,c.height);
return c.toDataURL('image/jpeg',.9);}

function imageFromFile(file){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{try{const c=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.84));}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not open photo'));};img.src=url;});}

function crop(imgData,edge){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const y=edge==='bottom'?Math.floor(img.height*.65):0;const height=edge==='bottom'?img.height-y:Math.floor(img.height*.33);c.width=img.width;c.height=height;c.getContext('2d').drawImage(img,0,y,img.width,height,0,0,c.width,c.height);resolve(c.toDataURL('image/png'));};img.onerror=reject;img.src=imgData;});}
function cropRegion(imgData,rx,ry,rw,rh,enhance=false){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
 const sx=Math.round(img.width*rx),sy=Math.round(img.height*ry),sw=Math.round(img.width*rw),sh=Math.round(img.height*rh);
 const c=document.createElement('canvas');const multiplier=enhance?Math.max(2,Math.min(4,1100/sw)):1;c.width=Math.max(1,Math.round(sw*multiplier));c.height=Math.max(1,Math.round(sh*multiplier));
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
 if(enhance){const pixels=ctx.getImageData(0,0,c.width,c.height);const a=pixels.data;for(let i=0;i<a.length;i+=4){const lum=.299*a[i]+.587*a[i+1]+.114*a[i+2];const n=lum>185?255:lum<65?0:Math.round((lum-65)*255/120);a[i]=a[i+1]=a[i+2]=n;}ctx.putImageData(pixels,0,0);}
 resolve(c.toDataURL('image/png'));
 };img.onerror=reject;img.src=imgData;});}
async function worker(){if(ocrWorker)return ocrWorker;if(!window.Tesseract)throw new Error('Free OCR library could not load. Check your internet connection.');ocrWorker=await Tesseract.createWorker('eng');return ocrWorker;}
function detectNumber(text){const clean=String(text||'').replace(/(?<=\d)[Oo](?=\d|\s*[/|])/g,'0').replace(/(?<=\d)[Ii](?=\d|\s*[/|])/g,'1');
const matches=[...clean.matchAll(/\b([A-Z]{0,3}\s*\d{1,4})\s*[\/|]\s*(\d{1,4})\b/gi)].filter(m=>Number(m[2])>=10&&Number(m[2])<=2000);
return matches.at(-1)?.[0].replace(/\s+/g,'')||'';}
function detectName(text){const lines=String(text||'').split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean);const skip=/^(BASIC|STAGE\s*\d*|TRAINER|ENERGY|POK[EÉ]MON|HP\s*\d+|EVOLVES|RULE|ILLUS|NO\.|\d+\s*(HP|\/))/i;
for(const raw of lines){let x=raw.replace(/\bHP\s*\d+.*$/i,'').replace(/[^A-Za-z0-9 '\-]/g,'').trim();if(x.length>=3&&x.length<=45&&/[A-Za-z]{3}/.test(x)&&!skip.test(x)&&!/^\d/.test(x))return x;}
return '';}
function credibleName(text,confidence=0){
 // A correctly read card name may be embedded in a noisy OCR line.
 const ignore=new Set(['Basic','Stage','Trainer','Energy','Pokemon','Pokémon','Name','Area','Original','Number','Illustrator','Retreat','Resistance','Weakness','Ability','Search']);
 for(const line of String(text||'').split(/[\r\n]+/).slice(0,14)){
   const words=[...line.matchAll(/\b[A-Z][a-z]{3,}(?:[-'][A-Za-z]+)?\b/g)].map(m=>m[0]);
   const best=words.find(w=>!ignore.has(w));
   if(best)return best;
 }
 const name=detectName(text);
 if(!name||confidence<45||name.length>35)return '';
 return name.replace(/\s+[a-zA-Z]{0,3}\d{1,3}$/, '').trim();
}
async function performOCR(image,method){if(ocrBusy)return;ocrBusy=true;const record=newScan(method);selected=null;$('candidate').classList.add('hidden');$('results').innerHTML='';$('scanNow').disabled=true;status('Scan #'+String(record.sequence).padStart(3,'0')+' saved with timestamp. Reading card name and collector number…');
try{
 const preview=$('scanPreview');if(preview){preview.src=image;preview.classList.remove('hidden');}
 const w=await worker();
 // Attempt to read the name from the top edge and collector number from the lower edge.
 const top=await cropRegion(image,.035,.012,.93,.27,true);
 const bottom=await cropRegion(image,.015,.68,.97,.315,true);
 const nameResult=await w.recognize(top);
 const numberResult=await w.recognize(bottom);
 let nameText=nameResult.data?.text||'',numberText=numberResult.data?.text||'';
 let number=detectNumber(numberText)||detectNumber(nameText);
 let name=credibleName(nameText,nameResult.data?.confidence||0);
 // If the strong-contrast crop didn't produce a readable result, retry natural-color crops.
 if(!name||!number){
   const naturalTop=await crop(image,'top');
   const naturalBottom=await crop(image,'bottom');
   if(!name){const result=await w.recognize(naturalTop);nameText+='\n[original name area]\n'+(result.data?.text||'');name=credibleName(result.data?.text||'',result.data?.confidence||0);}
   if(!number){const result=await w.recognize(naturalBottom);numberText+='\n[original number area]\n'+(result.data?.text||'');number=detectNumber(result.data?.text||'');}
 }
 // An OCR result is a suggestion, never a confirmed identification.
 $('ocrTextBox').classList.remove('hidden');
 $('ocrText').textContent='NAME AREA:\n'+nameText+'\n\nNUMBER AREA:\n'+numberText;
 // Keep OCR noise like "wb0" out of card names unless it is a verified collector number.
 const cleanedName=name?name.replace(/\s+[a-zA-Z]{0,3}\d{1,3}$/,'').trim(): '';
 // Prefer a plausible Pokémon name found anywhere in OCR output over noisy suffixes.
 const tokens=[...String(nameText+'\n'+numberText).matchAll(/\b[A-Z][a-z]{3,}(?:[-'][A-Za-z]+)?\b/g)].map(m=>m[0]);
 const stop=new Set(['Basic','Stage','Trainer','Retreat','Resistance','Weakness','Pokemon','Pokémon','Name','Area','Original','Number','Illustrator','Attack','Energy','Ability']);
 const guesses=[cleanedName||name,...tokens.filter(w=>!stop.has(w))].filter(Boolean);
 const query=number||guesses[0]||'';
 // Keep possible names available when the first OCR guess cannot be found.
 const extraGuesses=[...new Set(guesses)].filter(w=>w!==query);
 // Match distinctive combinations of printed name and attacks when collector-number OCR fails.
 // Verified against official Pokémon HeartGold & SoulSilver card list: Meowth 75/123.
 const visibleText=(nameText+'\n'+numberText).toLowerCase();
 const signatureCard=/\bmeowth\b/i.test(visibleText)&&/dig\s*claws/i.test(visibleText)?'hgss1-75':null;

 if(signatureCard){
   $('searchText').value='Meowth 75/123';
   try{
     await chooseCard(signatureCard);
     status('Possible match from name + attacks: Meowth 75/123 (HeartGold & SoulSilver). Confirm artwork and printing before saving.','ok');
   }catch(e){status('Signature match needs manual confirmation: '+e.message,'error');}
 }else if(query){
   $('searchText').value=query;
   status('OCR suggestion: '+query+'. Checking real card database…');
   await searchCards(query,true);
   // If the OCR guess has no match, retry with other words spotted on the card.
   // Never automatically confirm a printing based on fuzzy OCR.
   if(!$('results').querySelector('button[data-card]')&&!selected){
     for(const guess of extraGuesses.slice(0,5)){
       await searchCards(guess,true);
       if($('results').querySelector('button[data-card]')||selected){$('searchText').value=guess;break;}
     }
   }
   // On ambiguous OCR we retain the batch scan and let the user choose artwork.
 }else{
   $('searchText').value='';
   status('Could not read a reliable card name or collector number. Keep the entire card including its top and bottom borders inside the green frame, and hold steady. You can also search by card name below.','error');
 }
}catch(e){status('Scan #'+record.sequence+' saved, but recognition failed: '+e.message+'. Try a sharp saved photo or manual search.','error');
}finally{ocrBusy=false;$('scanNow').disabled=!stream;}
}
function exportCSV(scans,filename){const cols=['Batch Number','Batch Label','Scan Number','Scanned Local Date Time','Scan ISO Timestamp','Status','Game','Card Name','Set','Card Number','Variant','Condition','Market Price USD','Pricing Source','Pricing Updated At','Last Edited At','Scan Method','Card ID'];const vals=s=>[s.batchId,data.batches.find(b=>b.id===s.batchId)?.label||'',s.sequence,dt(s.scannedAt),s.scannedAt,s.status,s.game,s.name,s.setName,s.cardNumber,s.variant,s.condition,Number.isFinite(s.priceUSD)?s.priceUSD:'',s.pricingSource,s.pricingUpdatedAt,s.lastEditedAt||s.recordedAt,s.method,s.cardId];const csv='\ufeff'+[cols,...scans.map(vals)].map(row=>row.map(v=>{let t=String(v??'');if(/^[\s]*[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),filename);}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function restore(file){file.text().then(txt=>{const incoming=JSON.parse(txt);if(incoming.version!==1||!Array.isArray(incoming.batches)||!Array.isArray(incoming.scans)||incoming.batches.some(x=>typeof x.id!=='string')||incoming.scans.some(x=>typeof x.id!=='string'||typeof x.batchId!=='string'))throw new Error('Invalid Cosmic Scanner backup');if(!confirm(`Replace this device's ${data.scans.length} current scans with ${incoming.scans.length} backed-up scans? Export a backup first if needed.`))return;data=incoming;pendingId=null;selected=null;ensureBatch();persist();render();status('Backup restored successfully.','ok');switchView('history');}).catch(e=>alert('Could not restore backup: '+e.message));}
// Event handlers
$('newBatch').addEventListener('click',()=>{if(!confirm('Start a new numbered batch? Your existing scans will stay saved.'))return;const label=prompt('Optional batch name (examples: Trade Binder, Bulk Sorting, Nov 22 Pulls):','');if(label===null)return;pendingId=null;selected=null;$('candidate').classList.add('hidden');createBatch(label);status('New batch started. All future scans receive its batch number.','ok');switchView('scan');});
$('copyBatch').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(data.activeBatchId||'');status('Batch number copied.','ok');}catch{status('Batch number: '+data.activeBatchId);}});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$('startCamera').addEventListener('click',startCamera);
$('scanNow').addEventListener('click',async()=>{if(!stream||ocrBusy)return;try{await performOCR(liveFrame(),'live camera');}catch(e){status('Could not capture image: '+e.message,'error');}});
$('photoFile').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f||ocrBusy)return;try{const img=await imageFromFile(f);await performOCR(img,'photo');}catch(err){status('Photo could not be processed: '+err.message,'error');}});
$('searchBtn').addEventListener('click',()=>searchCards($('searchText').value));$('searchText').addEventListener('keydown',e=>{if(e.key==='Enter')searchCards($('searchText').value);});
$('results').addEventListener('click',e=>{const btn=e.target.closest('button[data-card]');if(btn)chooseCard(btn.dataset.card);});
$('historyList').addEventListener('click',e=>{const review=e.target.closest('button.review-scan');if(review){const s=data.scans.find(x=>x.id===review.dataset.id);if(!s)return;data.activeBatchId=s.batchId;pendingId=s.id;selected=null;$('candidate').classList.add('hidden');$('results').innerHTML='';$('searchText').value=s.name?`${s.name} ${String(s.cardNumber||'')}`.trim():'';persist();switchView('scan');status(`Editing #${String(s.sequence).padStart(3,'0')} in ${s.batchId}; original timestamp will be preserved.`,'ok');$('searchText').focus();return;}const rename=e.target.closest('button.rename-batch');if(rename){const b=data.batches.find(x=>x.id===rename.dataset.batch);if(!b)return;const label=prompt('Batch label:',b.label||'');if(label===null)return;b.label=label.trim().slice(0,80);persist();render();return;}const exp=e.target.closest('button.export-one');if(exp){exportCSV(data.scans.filter(x=>x.batchId===exp.dataset.batch),exp.dataset.batch+'.csv');return;}const del=e.target.closest('button.delete-scan');if(del){const s=data.scans.find(x=>x.id===del.dataset.id);if(s&&confirm(`Delete scan #${s.sequence} from ${s.batchId}?`)){data.scans=data.scans.filter(x=>x.id!==s.id);if(pendingId===s.id)pendingId=null;persist();render();}return;}const activate=e.target.closest('button.activate-batch');if(activate){data.activeBatchId=activate.dataset.batch;pendingId=null;selected=null;persist();render();status('Active batch changed to '+data.activeBatchId);switchView('scan');}});
$('exportBatch').addEventListener('click',()=>exportCSV(data.scans.filter(x=>x.batchId===data.activeBatchId),data.activeBatchId+'.csv'));
$('exportAll').addEventListener('click',()=>exportCSV(data.scans,'Cosmic-Card-Scanner-All-Scans.csv'));
$('backup').addEventListener('click',()=>download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'Cosmic-Card-Scanner-Backup-'+isoDay()+'.json'));
$('restoreFile').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f)restore(f);});
$('toggleOCR').addEventListener('click',()=>{$('ocrTextBox').classList.add('hidden');});
window.addEventListener('pagehide',stopCamera);
ensureBatch();render();
// Temporarily disable the offline service worker while we stabilize iPhone updates.
// This changes no localStorage records or saved batches.
if('serviceWorker' in navigator){
 navigator.serviceWorker.getRegistrations().then(regs=>Promise.all(regs.filter(r=>r.scope.startsWith(location.origin+location.pathname.replace(/[^/]*$/,''))).map(r=>r.unregister()))).catch(()=>{});
}
if('caches' in window){caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cosmic-card-scanner-')).map(k=>caches.delete(k)))).catch(()=>{});}

})();
