// ── FOOD MASTER DATA ──────────────────────────────────────────────
const STAGE_CONFIG = [
  { key:'gokkon',   label:'ゴックン期', icon:'🌸', months:5,  range:'生後5〜6ヶ月',  bg:'var(--peach)', color:'#8B4B4B' },
  { key:'mogumogu', label:'モグモグ期', icon:'🌿', months:7,  range:'生後7〜8ヶ月',  bg:'var(--mint)',  color:'var(--mint3)' },
  { key:'kamikami', label:'カミカミ期', icon:'🍎', months:9,  range:'生後9〜11ヶ月', bg:'#FFE0D0',      color:'#C05030' },
  { key:'pakupaku', label:'パクパク期', icon:'🍚', months:12, range:'生後12ヶ月〜',  bg:'var(--lav)',   color:'#6A50C0' },
];
const STAGE_FOODS = {
  gokkon: {
    '穀物・炭水化物': ['10倍粥','じゃがいも','さつまいも'],
    '野菜':           ['にんじん','かぼちゃ','大根','ほうれん草','キャベツ','コーン'],
    '果物':           ['バナナ','りんご','みかん'],
    '魚介':           ['白身魚','しらす（水煮）'],
    '大豆・卵・乳製品':['豆腐（絹）','ヨーグルト'],
  },
  mogumogu: {
    '穀物・炭水化物': ['7倍粥','パン','うどん'],
    '野菜':           ['小松菜','ブロッコリー','玉ねぎ','なす','白菜','チンゲン菜','ズッキーニ','レタス'],
    '果物':           ['もも','なし','ぶどう','メロン'],
    '魚介':           ['鮭','まぐろ','鱈'],
    '肉類':           ['鶏ひき肉'],
    '大豆・卵・乳製品':['豆腐（木綿）','納豆','卵黄'],
  },
  kamikami: {
    '穀物・炭水化物': ['軟飯','オートミール','パスタ','そら豆'],
    '野菜':           ['オクラ','アスパラ','れんこん','セロリ','ビーツ'],
    '果物':           ['いちご','キウイ'],
    '魚介':           ['しじみ','あさり'],
    '肉類':           ['鶏むね肉','鶏もも肉','豚ひれ肉'],
    '大豆・卵・乳製品':['全卵','カッテージチーズ','高野豆腐','油揚げ'],
  },
  pakupaku: {
    '穀物・炭水化物': ['ロールパン'],
    '野菜':           ['ごぼう'],
    '魚介':           ['えび'],
    '肉類':           ['牛ひれ肉','豚挽き肉','牛挽き肉'],
    '大豆・卵・乳製品':['クリームチーズ','牛乳'],
    'アレルギー注意': ['小麦（パン）','そば','ピーナッツ','くるみ','ごま','カニ','タコ','イカ'],
  },
};
const FOOD_CAT={}, FOOD_STAGE={};
STAGE_CONFIG.forEach(({key})=>{
  Object.entries(STAGE_FOODS[key]).forEach(([cat,arr])=>{
    arr.forEach(f=>{ FOOD_CAT[f]=cat; FOOD_STAGE[f]=key; });
  });
});
let ALL_FOODS=STAGE_CONFIG.flatMap(({key})=>Object.values(STAGE_FOODS[key]).flat());

// ── STATE ──────────────────────────────────────────────────────────
let S = {
  babyName:'', babyBirth:'',
  records:{},     // records[dateKey] = [{food, status:'done'|'ng'|'skipped', note}]
  plans:{},       // plans[dateKey]   = [{food, note}]
  foodStatus:{},  // foodStatus[food] = {firstDate, lastStatus, count}
  customFoods:[], // user-added food names
};
let curYear  = new Date().getFullYear();
let curMonth = new Date().getMonth();
let selDate  = null;
let activeTab = 'plan';
let curView   = 'cal';
let foodSelectMode = true;
let selectedFoods  = new Set();

function load(){
  try{ const s=localStorage.getItem('bfc-v1'); if(s) S={...S,...JSON.parse(s)}; }catch(e){}
}
function save(){ localStorage.setItem('bfc-v1', JSON.stringify(S)); }
function rebuildAllFoods(){
  ALL_FOODS=[...STAGE_CONFIG.flatMap(({key})=>Object.values(STAGE_FOODS[key]).flat()),...(S.customFoods||[])];
}

function dk(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function today(){ const n=new Date(); return dk(n.getFullYear(),n.getMonth(),n.getDate()); }

// ── BABY ──────────────────────────────────────────────────────────
function getBabyMonths(){
  if(!S.babyBirth) return null;
  const birth=new Date(S.babyBirth), now=new Date();
  return (now.getFullYear()-birth.getFullYear())*12+(now.getMonth()-birth.getMonth());
}
function saveBaby(){
  S.babyName  = document.getElementById('babyName').value;
  S.babyBirth = document.getElementById('babyBirth').value;
  save(); updateAgeBadge();
  if(curView==='foods') renderFoodMaster();
}
function updateAgeBadge(){
  const b=document.getElementById('ageBadge');
  const months=getBabyMonths();
  if(months===null){ b.style.display='none'; return; }
  const stage=months<7?'🌸ゴックン期':months<9?'🌿モグモグ期':months<12?'🍎カミカミ期':'🍚パクパク期';
  b.style.display='block';
  b.textContent=`生後${months}ヶ月 ${stage}`;
}

// ── CALENDAR ──────────────────────────────────────────────────────
function changeMonth(d){
  curMonth+=d;
  if(curMonth<0){curMonth=11;curYear--;}
  if(curMonth>11){curMonth=0;curYear++;}
  renderCalendar();
}

function renderCalendar(){
  document.getElementById('monthTitle').textContent=`${curYear}年${curMonth+1}月`;

  const firstDay = new Date(curYear,curMonth,1).getDay();
  const lastDate  = new Date(curYear,curMonth+1,0).getDate();
  const prevLast  = new Date(curYear,curMonth,0).getDate();
  const todayStr  = today();

  const grid=document.getElementById('calGrid');
  grid.innerHTML='';
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push({d:prevLast-firstDay+1+i,cur:false,y:curYear,m:curMonth-1});
  for(let d=1;d<=lastDate;d++) cells.push({d,cur:true,y:curYear,m:curMonth});
  const remain=42-cells.length;
  for(let d=1;d<=remain;d++) cells.push({d,cur:false,y:curYear,m:curMonth+1});

  cells.forEach(({d,cur,y,m},i)=>{
    const mm = m<0?11:m>11?0:m;
    const yy = m<0?y-1:m>11?y+1:y;
    const key=dk(yy,mm,d);
    const recs=S.records[key]||[];
    const pls =S.plans[key]||[];
    const doneCnt    = recs.filter(r=>r.status==='done').length;
    const ngCnt      = recs.filter(r=>r.status==='ng').length;
    const skippedCnt = recs.filter(r=>r.status==='skipped').length;
    const planCnt    = pls.length;
    const isToday = key===todayStr;
    const isSel   = key===selDate;
    const dow = i%7;

    const cell=document.createElement('div');
    cell.className='cal-day'+(cur?'':' other-month')+(isToday?' today':'')+(isSel?' selected':'')+(dow===0?' sun':dow===6?' sat':'');
    cell.onclick=()=>selectDay(key);

    const numEl=document.createElement('div');
    numEl.className='day-num';
    numEl.textContent=d;
    cell.appendChild(numEl);

    if(doneCnt||ngCnt||planCnt||skippedCnt){
      const dots=document.createElement('div');
      dots.className='day-dots';
      for(let x=0;x<Math.min(doneCnt,3);x++){const dt=document.createElement('div');dt.className='dot dot-done';dots.appendChild(dt);}
      for(let x=0;x<Math.min(ngCnt,2);x++){const dt=document.createElement('div');dt.className='dot dot-ng';dots.appendChild(dt);}
      for(let x=0;x<Math.min(skippedCnt,2);x++){const dt=document.createElement('div');dt.className='dot dot-skipped';dots.appendChild(dt);}
      for(let x=0;x<Math.min(planCnt,3);x++){const dt=document.createElement('div');dt.className='dot dot-plan';dots.appendChild(dt);}
      cell.appendChild(dots);
      if(doneCnt+planCnt>6){
        const cnt=document.createElement('div');
        cnt.className='day-count';
        cnt.textContent=`+${doneCnt+planCnt-6}`;
        cell.appendChild(cnt);
      }
    }
    grid.appendChild(cell);
  });
}


// ── DAY DETAIL ────────────────────────────────────────────────────
function selectDay(key){
  selDate=key;
  renderCalendar();
  renderDetail();
  document.getElementById('detailPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function switchTab(tab){
  activeTab=tab;
  document.getElementById('tabPlan').className='dtab plan'+(tab==='plan'?' active':'');
  document.getElementById('tabRecord').className='dtab record'+(tab==='record'?' active':'');
  renderDetail();
}

function renderDetail(){
  if(!selDate){
    document.getElementById('detailDate').textContent='日付を選んでね 🌸';
    document.getElementById('detailBody').innerHTML='<p class="empty-msg">カレンダーの日付をタップしてください</p>';
    return;
  }
  const [y,m,d]=selDate.split('-');
  const dow=['日','月','火','水','木','金','土'][new Date(selDate).getDay()];
  document.getElementById('detailDate').textContent=`${parseInt(m)}月${parseInt(d)}日（${dow}）`;

  const body=document.getElementById('detailBody');

  if(activeTab==='record'){
    const recs=S.records[selDate]||[];
    let html=`
      <div class="add-row">
        <input class="food-search" id="recInput" placeholder="食材を入力（例：にんじん）" oninput="showSuggest('rec')" autocomplete="off">
        <button class="add-btn record" onclick="addEntry('record')">＋記録</button>
      </div>
      <div class="suggest-list" id="suggestRec"></div>
      <div class="status-toggle">
        <button class="stgl stgl-c-done" id="stgl-done" onclick="setNewStatus('done')">食べた</button>
        <button class="stgl stgl-c-skip" id="stgl-skip" onclick="setNewStatus('skipped')">食べなかった</button>
        <button class="stgl stgl-c-ng"   id="stgl-ng"   onclick="setNewStatus('ng')">アレルギー</button>
      </div>
    `;
    if(recs.length===0){
      html+='<p class="empty-msg">まだ記録がありません。<br>上から食材を追加してね🥕</p>';
    } else {
      html+='<div class="entry-list">';
      recs.forEach((r,i)=>{
        const icon = r.status==='done'?'✅':r.status==='skipped'?'<span style="font-size:14px;font-weight:700;color:#333;">✕</span>':'⚠️';
        const hasNote=!!r.note;
        const noteSafe=(r.note||'').replace(/"/g,'&quot;');
        html+=`<div class="swipe-wrap" id="swrap-rec-${i}">
          <div class="swipe-del" id="sdel-rec-${i}" onclick="removeEntry('record',${i})">🗑 削除</div>
          <div class="entry-item ${r.status}" data-swipe-type="rec" data-swipe-idx="${i}">
            <span class="entry-status">${icon}</span>
            <div style="flex:1;min-width:0;">
              <div class="entry-name">${r.food}</div>
              ${r.status==='done'?`<div class="amt-ctrl">
                <input type="number" class="amt-input" min="0" step="5" data-idx="${i}"
                  value="${r.amount||''}" placeholder="0"
                  onchange="setAmount(${i},this.value)">
                <span class="amt-unit">g</span>
              </div>`:''}
              ${hasNote?`<div class="entry-note" id="note-text-rec-${i}">📝 ${r.note}</div>`:''}
              <div id="memo-rec-${i}" style="display:none;margin-top:6px;">
                <input type="text" id="memo-input-rec-${i}" placeholder="メモを追記…"
                  style="width:100%;padding:5px 8px;border:1.5px solid #EDD8CC;border-radius:8px;font-family:inherit;font-size:16px;background:var(--cream);outline:none;touch-action:manipulation;"
                  onkeydown="if(event.key==='Enter')saveNote('record',${i},this.value,false)">
                <div style="display:flex;gap:4px;margin-top:4px;">
                  <button onclick="saveNote('record',${i},document.getElementById('memo-input-rec-${i}').value,false)"
                    style="flex:1;padding:5px;border-radius:8px;border:none;background:var(--mint2);color:var(--white);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">追記する</button>
                </div>
              </div>
              <div id="edit-rec-${i}" style="display:none;margin-top:6px;">
                <input type="text" id="edit-input-rec-${i}" value="${noteSafe}" placeholder="メモを編集…"
                  style="width:100%;padding:5px 8px;border:1.5px solid #EDD8CC;border-radius:8px;font-family:inherit;font-size:16px;background:var(--cream);outline:none;touch-action:manipulation;"
                  onkeydown="if(event.key==='Enter')saveNote('record',${i},this.value,true)">
                <div style="display:flex;gap:4px;margin-top:4px;">
                  <button onclick="saveNote('record',${i},document.getElementById('edit-input-rec-${i}').value,true)"
                    style="flex:1;padding:5px;border-radius:8px;border:none;background:var(--sky2);color:var(--white);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">保存する</button>
                </div>
              </div>
            </div>
            <div class="entry-actions" style="flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;gap:3px;">
              <button class="e-btn" onclick="toggleMemo('rec',${i},'add')" style="color:#7A5C30;">📝 ${hasNote?'追記':'メモ'}</button>
              ${hasNote?`<button class="e-btn" onclick="toggleMemo('rec',${i},'edit')" style="color:#5070D0;">✏️ 編集</button>`:''}
            </div>
          </div>
        </div>`;
      });
      html+='</div>';
    }
    body.innerHTML=html;
    setNewStatus('done');
    bindSwipe();
  } else {
    // PLAN TAB
    const plans=S.plans[selDate]||[];
    let html=`
      <div class="add-row">
        <input class="food-search" id="planInput" placeholder="食材を入力（例：白身魚）" oninput="showSuggest('plan')" autocomplete="off">
        <button class="add-btn plan" onclick="addEntry('plan')">＋予定</button>
      </div>
      <div class="suggest-list" id="suggestPlan"></div>
    `;
    if(plans.length===0){
      html+='<p class="empty-msg">この日の予定はまだありません。<br>試したい食材を登録してね📅</p>';
    } else {
      html+='<div class="entry-list">';
      plans.forEach((p,i)=>{
        const memoVal=(p.note||'').replace(/"/g,'&quot;');
        html+=`<div class="swipe-wrap" id="swrap-plan-${i}">
          <div class="swipe-del" id="sdel-plan-${i}" onclick="removeEntry('plan',${i})">🗑 削除</div>
          <div class="entry-item plan" data-swipe-type="plan" data-swipe-idx="${i}">
            <div class="plan-top">
              <span class="entry-status">📅</span>
              <div class="plan-name-wrap">
                <div class="entry-name">${p.food}</div>
                ${p.note?`<div class="entry-note">📝 ${p.note}</div>`:''}
              </div>
            </div>
            <div class="plan-actions">
              <button class="pa-btn pa-done" onclick="markDone('plan',${i})">✅ 食べた</button>
              <button class="pa-btn pa-skip" onclick="markSkipped(${i})"><span style="font-weight:700;margin-right:3px;">✕</span>食べなかった</button>
              <button class="pa-btn pa-ng" onclick="markNG(${i})">⚠️ アレルギー</button>
              <button class="pa-btn pa-cancel" onclick="cancelPlan(${i})">🚫 あげなかった</button>
              <button class="pa-btn pa-reschedule" onclick="toggleReschedule(${i})">📆 日付変更</button>
              <button class="pa-btn pa-memo" onclick="toggleMemo('plan',${i})">📝 メモ</button>
            </div>
            <div id="memo-plan-${i}" style="display:none;margin-top:8px;">
              <input type="text" id="memo-input-plan-${i}" value="${memoVal}" placeholder="メモを入力…"
                style="width:100%;padding:5px 8px;border:1.5px solid #EDD8CC;border-radius:8px;font-family:inherit;font-size:16px;background:var(--cream);outline:none;touch-action:manipulation;"
                onkeydown="if(event.key==='Enter')saveNote('plan',${i},this.value,true)">
              <button onclick="saveNote('plan',${i},document.getElementById('memo-input-plan-${i}').value,true)"
                style="margin-top:4px;width:100%;padding:7px;border-radius:8px;border:none;background:var(--honey2);color:#4A3000;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;min-height:44px;touch-action:manipulation;">保存</button>
            </div>
          </div>
        </div>`;
      });
      html+='</div>';
    }
    body.innerHTML=html;
    bindSwipe();
  }
}

// ── SWIPE TO DELETE ───────────────────────────────────────────────
function bindSwipe(){
  document.querySelectorAll('.entry-item[data-swipe-type]').forEach(el=>{
    let startX=0,startY=0;
    const type=el.dataset.swipeType;
    const wrap=el.closest('.swipe-wrap');
    const delEl=wrap?.querySelector('.swipe-del');

    function resetOthers(){
      document.querySelectorAll('.entry-item.swiped').forEach(other=>{
        if(other!==el){
          other.classList.remove('swiped');
          other.closest('.swipe-wrap')?.querySelector('.swipe-del')?.classList.remove('show');
        }
      });
    }
    el.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
    el.addEventListener('touchmove',e=>{
      const dx=e.touches[0].clientX-startX;
      const dy=Math.abs(e.touches[0].clientY-startY);
      if(dy>20) return;
      if(dx<-30){resetOthers();el.classList.add('swiped');delEl?.classList.add('show');}
      else if(dx>10){el.classList.remove('swiped');delEl?.classList.remove('show');}
    },{passive:true});
    el.addEventListener('mousedown',e=>{startX=e.clientX;});
    el.addEventListener('mouseup',e=>{
      const dx=e.clientX-startX;
      if(dx<-40){resetOthers();el.classList.add('swiped');delEl?.classList.add('show');}
      else if(dx>10){el.classList.remove('swiped');delEl?.classList.remove('show');}
    });
  });
  document.getElementById('detailBody').addEventListener('touchstart',e=>{
    if(!e.target.closest('.entry-item')&&!e.target.closest('.swipe-del')){
      document.querySelectorAll('.entry-item.swiped').forEach(el=>{
        el.classList.remove('swiped');
        el.closest('.swipe-wrap')?.querySelector('.swipe-del')?.classList.remove('show');
      });
    }
  },{passive:true});
}

let rescheduleIdx=null;

function toggleReschedule(idx){
  rescheduleIdx=idx;
  const plan=S.plans[selDate]?.[idx];
  if(!plan) return;
  document.getElementById('rescheduleModalTitle').textContent=`📆 日付変更（${plan.food}）`;
  mc.year=new Date().getFullYear(); mc.month=new Date().getMonth();
  mc.rangeStart=selDate; mc.rangeEnd=null; mc.dragging=false;
  mcMode='reschedule';
  renderMiniCal();
  document.getElementById('rescheduleModal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeRescheduleModal(){
  document.getElementById('rescheduleModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  mcMode='modal';
}
function confirmReschedule(){ rescheduleEntry(rescheduleIdx); closeRescheduleModal(); }

function rescheduleEntry(idx){
  if(!selDate) return;
  const plan=S.plans[selDate]?.[idx];
  if(!plan) return;
  const dates=getSelectedDates();
  if(!dates.length) return;
  dates.forEach(newDate=>{
    if(newDate===selDate) return;
    if(!S.plans[newDate]) S.plans[newDate]=[];
    if(!S.plans[newDate].some(p=>p.food===plan.food))
      S.plans[newDate].push({...plan});
  });
  S.plans[selDate].splice(idx,1);
  save(); renderCalendar(); renderDetail();
}

function toggleMemo(type,idx,mode){
  if(type==='rec'){
    const addEl=document.getElementById(`memo-rec-${idx}`);
    const editEl=document.getElementById(`edit-rec-${idx}`);
    if(mode==='add'){
      const open=addEl.style.display==='none'||addEl.style.display==='';
      addEl.style.display=open?'block':'none';
      if(editEl) editEl.style.display='none';
      if(open){ const inp=document.getElementById(`memo-input-rec-${idx}`); if(inp){inp.value='';inp.focus();} }
    } else if(mode==='edit'){
      const open=editEl.style.display==='none'||editEl.style.display==='';
      editEl.style.display=open?'block':'none';
      if(addEl) addEl.style.display='none';
      if(open){ const inp=document.getElementById(`edit-input-rec-${idx}`); if(inp) inp.focus(); }
    }
  } else {
    const el=document.getElementById(`memo-plan-${idx}`);
    if(!el) return;
    const open=el.style.display==='none'||el.style.display==='';
    el.style.display=open?'block':'none';
    if(open) el.querySelector('input').focus();
  }
}

function saveNote(type,idx,val,overwrite){
  if(!selDate) return;
  const text=val.trim();
  if(type==='record'&&S.records[selDate]?.[idx]!==undefined){
    if(overwrite){ S.records[selDate][idx].note=text; }
    else{
      if(!text) return;
      const existing=S.records[selDate][idx].note;
      S.records[selDate][idx].note=existing?existing+'・'+text:text;
    }
  } else if(type==='plan'&&S.plans[selDate]?.[idx]!==undefined){
    S.plans[selDate][idx].note=text;
  }
  save(); renderDetail();
}

let newStatus='done';
function setNewStatus(s){
  newStatus=s;
  const bd=document.getElementById('stgl-done');
  const bs=document.getElementById('stgl-skip');
  const bn=document.getElementById('stgl-ng');
  if(!bd||!bs||!bn) return;
  bd.className='stgl stgl-c-done'+(s==='done'?' active-done':'');
  bs.className='stgl stgl-c-skip'+(s==='skipped'?' active-skip':'');
  bn.className='stgl stgl-c-ng'+(s==='ng'?' active-ng':'');
}

function showSuggest(type){
  const inputId=type==='rec'?'recInput':'planInput';
  const listId =type==='rec'?'suggestRec':'suggestPlan';
  const val=(document.getElementById(inputId)||{}).value||'';
  const list=document.getElementById(listId);
  if(!list) return;
  if(!val){list.classList.remove('open');return;}
  const matches=ALL_FOODS.filter(f=>f.includes(val)).slice(0,8);
  if(!matches.length){list.classList.remove('open');return;}
  list.innerHTML=matches.map(f=>{
    const cat=FOOD_CAT[f]||'';
    return `<div class="suggest-item" onclick="selectSuggest('${type}','${f.replace(/'/g,"\\'")}')">
      ${f}<span class="suggest-cat">${cat}</span></div>`;
  }).join('');
  list.classList.add('open');
}
function selectSuggest(type,food){
  const inputId=type==='rec'?'recInput':'planInput';
  const listId =type==='rec'?'suggestRec':'suggestPlan';
  document.getElementById(inputId).value=food;
  document.getElementById(listId).classList.remove('open');
}

function getLastAmount(food){
  const dates=Object.keys(S.records).sort().reverse();
  for(const d of dates){
    const entries=S.records[d]||[];
    const match=entries.find(r=>r.food===food&&r.status==='done'&&r.amount>0);
    if(match) return match.amount;
  }
  return 0;
}

function addEntry(type){
  if(!selDate) return;
  if(type==='record'){
    const food=(document.getElementById('recInput')||{}).value||'';
    if(!food.trim()) return;
    if(!S.records[selDate]) S.records[selDate]=[];
    const amount=newStatus==='done'?getLastAmount(food.trim()):0;
    S.records[selDate].push({food:food.trim(),status:newStatus,note:'',amount});
    updateFoodStatus(food.trim(),newStatus,selDate);
  } else {
    const food=(document.getElementById('planInput')||{}).value||'';
    if(!food.trim()) return;
    if(!S.plans[selDate]) S.plans[selDate]=[];
    S.plans[selDate].push({food:food.trim(),note:''});
  }
  save(); renderCalendar(); renderDetail();
}

function setAmount(idx,val){
  const recs=S.records[selDate];
  if(!recs||!recs[idx]) return;
  const n=parseInt(val)||0;
  recs[idx].amount=Math.max(0,Math.round(n/5)*5);
  save();
  const inp=document.querySelector(`.amt-input[data-idx="${idx}"]`);
  if(inp) inp.value=recs[idx].amount||'';
}

function removeEntry(type,idx){
  if(!selDate) return;
  if(type==='record') S.records[selDate].splice(idx,1);
  else S.plans[selDate].splice(idx,1);
  save(); renderCalendar(); renderDetail();
}

function markDone(type,idx){
  if(!selDate) return;
  const plan=S.plans[selDate][idx];
  if(!S.records[selDate]) S.records[selDate]=[];
  const amount=getLastAmount(plan.food);
  S.records[selDate].push({food:plan.food,status:'done',note:plan.note,amount});
  S.plans[selDate].splice(idx,1);
  updateFoodStatus(plan.food,'done',selDate);
  save(); renderCalendar(); renderDetail();
}
function markSkipped(idx){
  if(!selDate) return;
  const plan=S.plans[selDate][idx];
  if(!S.records[selDate]) S.records[selDate]=[];
  S.records[selDate].push({food:plan.food,status:'skipped',note:plan.note});
  S.plans[selDate].splice(idx,1);
  updateFoodStatus(plan.food,'skipped',selDate);
  save(); renderCalendar(); renderDetail();
}
function markNG(idx){
  if(!selDate) return;
  const plan=S.plans[selDate][idx];
  if(!S.records[selDate]) S.records[selDate]=[];
  S.records[selDate].push({food:plan.food,status:'ng',note:plan.note});
  S.plans[selDate].splice(idx,1);
  updateFoodStatus(plan.food,'ng',selDate);
  save(); renderCalendar(); renderDetail();
}
function cancelPlan(idx){
  if(!selDate) return;
  S.plans[selDate].splice(idx,1);
  save(); renderCalendar(); renderDetail();
}

function updateFoodStatus(food,status,date){
  if(!S.foodStatus[food]) S.foodStatus[food]={count:0,firstDate:date,lastStatus:status};
  const fs=S.foodStatus[food];
  if(status==='done') fs.count=(fs.count||0)+1;
  fs.lastStatus=status;
  if(!fs.firstDate||date<fs.firstDate) fs.firstDate=date;
}

// ── FOOD MASTER VIEW ──────────────────────────────────────────────
function renderFoodMaster(){
  const q=(document.getElementById('foodSearch')||{}).value||'';
  const list=document.getElementById('foodMasterList');
  list.innerHTML='';

  // カスタム食材セクション
  const customAll=S.customFoods||[];
  const customFiltered=customAll.filter(f=>!q||f.includes(q));
  if(customFiltered.length>0){
    const sec=document.createElement('div');
    sec.style.marginBottom='14px';
    sec.innerHTML=`<div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;padding:4px 10px;background:var(--honey);border-radius:var(--rs);">✨ 追加した食材</div>`;
    const chips=document.createElement('div');
    chips.style.cssText='display:flex;flex-wrap:wrap;gap:4px;';
    customFiltered.forEach(f=>{
      const fs=S.foodStatus[f];
      const st=fs?fs.lastStatus:'none';
      const isSel=selectedFoods.has(f);
      const cls=isSel?'chip-selected':({done:'chip-done',ng:'chip-ng',none:'chip-none'}[st]||'chip-none');
      const icon=isSel?'☑':({done:'✅',ng:'⚠️',none:'○'}[st]||'○');
      const wrap=document.createElement('span');
      wrap.style.cssText='display:inline-flex;align-items:center;gap:2px;';
      const btn=document.createElement('button');
      btn.className=`food-chip ${cls}`;
      btn.innerHTML=`${icon} ${f}${fs&&fs.count>1?` <span style="font-size:9px;opacity:.7">×${fs.count}</span>`:''}`;
      btn.onclick=foodSelectMode?()=>toggleFoodSelect(f):()=>openFoodModal(f);
      const delBtn=document.createElement('button');
      delBtn.style.cssText='width:20px;height:20px;border-radius:50%;border:1.5px solid #EDD8CC;background:var(--white);color:#B07070;font-size:11px;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;';
      delBtn.textContent='×';
      delBtn.onclick=(e)=>{e.stopPropagation();removeCustomFood(f);};
      wrap.appendChild(btn);
      wrap.appendChild(delBtn);
      chips.appendChild(wrap);
    });
    sec.appendChild(chips);
    list.appendChild(sec);
  }

  // ステージ別食材セクション
  const babyMonths=getBabyMonths();
  STAGE_CONFIG.forEach((stage,si)=>{
    const isLocked=babyMonths!==null&&babyMonths<stage.months;
    const nextMonths=STAGE_CONFIG[si+1]?.months;
    const isCurrent=!isLocked&&babyMonths!==null&&(nextMonths===undefined||babyMonths<nextMonths);
    const remaining=isLocked?stage.months-babyMonths:0;

    // 検索フィルター：このステージに一致する食材がなければスキップ
    const stageFoodsAll=Object.values(STAGE_FOODS[stage.key]).flat();
    if(q&&!stageFoodsAll.some(f=>f.includes(q))) return;

    const sec=document.createElement('div');
    sec.style.marginBottom='16px';

    // ステージヘッダー
    const hBg=isLocked?'#F0ECEB':stage.bg;
    const hColor=isLocked?'#B09898':stage.color;
    let badge='';
    if(babyMonths!==null){
      if(isCurrent) badge=`<span style="background:var(--rose);color:var(--white);font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px;">今の時期</span>`;
      else if(isLocked) badge=`<span style="background:#E0E0E0;color:#888;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px;">🔒 あと${remaining}ヶ月</span>`;
    }
    const hdr=document.createElement('div');
    hdr.style.cssText=`font-size:13px;font-weight:700;color:${hColor};margin-bottom:8px;padding:7px 12px;background:${hBg};border-radius:var(--rs);display:flex;align-items:center;`;
    hdr.innerHTML=`${stage.icon} ${stage.label}<span style="font-size:10px;font-weight:400;margin-left:6px;opacity:.8;">${stage.range}</span>${badge}`;
    sec.appendChild(hdr);

    // カテゴリ別チップ
    const catsWrap=document.createElement('div');
    catsWrap.style.cssText=`opacity:${isLocked?'0.5':'1'};`;
    Object.entries(STAGE_FOODS[stage.key]).forEach(([cat,foods])=>{
      const filtered=foods.filter(f=>!q||f.includes(q));
      if(!filtered.length) return;
      const catEl=document.createElement('div');
      catEl.style.marginBottom='8px';
      if(!q){
        const catLabel=document.createElement('div');
        catLabel.style.cssText='font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px;margin-left:2px;';
        catLabel.textContent=cat;
        catEl.appendChild(catLabel);
      }
      const chips=document.createElement('div');
      chips.style.cssText='display:flex;flex-wrap:wrap;gap:4px;';
      filtered.forEach(f=>{
        const fs=S.foodStatus[f];
        const st=fs?fs.lastStatus:'none';
        const isSel=selectedFoods.has(f);
        const cls=isSel?'chip-selected':({done:'chip-done',ng:'chip-ng',none:'chip-none'}[st]||'chip-none');
        const icon=isSel?'☑':({done:'✅',ng:'⚠️',none:'○'}[st]||'○');
        const btn=document.createElement('button');
        btn.className=`food-chip ${cls}`;
        btn.innerHTML=`${icon} ${f}${fs&&fs.count>1?` <span style="font-size:9px;opacity:.7">×${fs.count}</span>`:''}`;
        btn.onclick=foodSelectMode?()=>toggleFoodSelect(f):()=>openFoodModal(f);
        chips.appendChild(btn);
      });
      catEl.appendChild(chips);
      catsWrap.appendChild(catEl);
    });
    sec.appendChild(catsWrap);
    list.appendChild(sec);
  });
}
function filterFoods(){ renderFoodMaster(); }

function addCustomFood(){
  const inp=document.getElementById('customFoodInput');
  if(!inp) return;
  const name=inp.value.trim();
  if(!name){ showToast('⚠️ 食材名を入力してください',true); return; }
  if(ALL_FOODS.includes(name)){ showToast('⚠️ その食材はすでに登録されています',true); return; }
  if(!S.customFoods) S.customFoods=[];
  S.customFoods.push(name);
  rebuildAllFoods();
  save();
  inp.value='';
  renderFoodMaster();
  showToast(`✅ 「${name}」を追加しました`);
}
function removeCustomFood(name){
  if(!S.customFoods) return;
  S.customFoods=S.customFoods.filter(f=>f!==name);
  rebuildAllFoods();
  save();
  renderFoodMaster();
  showToast(`🗑 「${name}」を削除しました`);
}

function toggleFoodSelectMode(){ /* no-op: multi-select is always on */ }
function toggleFoodSelect(food){
  if(selectedFoods.has(food)) selectedFoods.delete(food);
  else selectedFoods.add(food);
  const bar=document.getElementById('foodSelectBar');
  const cnt=document.getElementById('foodSelectCount');
  bar.classList.toggle('show',selectedFoods.size>0);
  if(cnt) cnt.textContent=`${selectedFoods.size}品目選択中`;
  renderFoodMaster();
}
function clearFoodSelect(){
  selectedFoods.clear();
  document.getElementById('foodSelectBar').classList.remove('show');
  renderFoodMaster();
}
function openMultiPlanModal(){
  if(!selectedFoods.size) return;
  const listEl=document.getElementById('multiPlanFoodList');
  listEl.innerHTML=[...selectedFoods].map(f=>
    `<span style="display:inline-flex;align-items:center;padding:4px 10px;background:var(--honey);border-radius:99px;font-size:12px;font-weight:500;color:#7A5800;">${f}</span>`
  ).join('');
  mc.year=new Date().getFullYear(); mc.month=new Date().getMonth();
  mc.rangeStart=today(); mc.rangeEnd=null; mc.dragging=false;
  mcMode='multiplan';
  renderMiniCal();
  document.getElementById('multiPlanModal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeMultiPlanModal(){
  document.getElementById('multiPlanModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  mcMode='modal';
}
function confirmMultiPlanAdd(){
  const dates=getSelectedDates();
  if(!dates.length) return;
  dates.forEach(dateVal=>{
    if(!S.plans[dateVal]) S.plans[dateVal]=[];
    selectedFoods.forEach(food=>{
      if(!S.plans[dateVal].some(p=>p.food===food))
        S.plans[dateVal].push({food,note:''});
    });
  });
  save();
  const suffix=dates.length>1?`（${dates.length}日分）`:'';
  showToast(`📅 ${selectedFoods.size}品目を予定に追加しました${suffix}`);
  closeMultiPlanModal();
  clearFoodSelect();
  renderCalendar();
}

function openFoodModal(food){
  const recDates=[];
  Object.entries(S.records).forEach(([d,arr])=>{ arr.forEach(r=>{ if(r.food===food) recDates.push({d,status:r.status,note:r.note}); }); });
  recDates.sort((a,b)=>b.d.localeCompare(a.d));
  document.getElementById('modalFoodName').textContent=food;
  let html='';
  if(recDates.length){
    html+=`<div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;">📋 記録履歴</div>`;
    html+=recDates.map(r=>{
      const bg=r.status==='done'?'#F0FAF5':r.status==='skipped'?'#F5F0E8':'#FFF0F0';
      const icon=r.status==='done'?'✅':r.status==='skipped'?'<span style="font-size:14px;font-weight:700;color:#333;">✕</span>':'⚠️';
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:var(--rs);margin-bottom:5px;background:${bg};">
        <span>${icon}</span>
        <span style="font-size:13px;flex:1;">${r.d.replace(/^(\d+)-(\d+)-(\d+)$/,'$2/$3')}</span>
        ${r.note?`<span style="font-size:11px;color:var(--text2);">${r.note}</span>`:''}
      </div>`;
    }).join('');
  }
  const foodSafe=food.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  html+=`
    <div style="margin-top:${recDates.length?'14px':'0'};background:var(--cream);border-radius:var(--rs);padding:12px 14px;">
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;">📆 日付を選んで追加（ドラッグで範囲選択）</div>
      <div id="miniCalWrap"></div>
      <div id="rangeLabel" style="text-align:center;font-size:12px;font-weight:700;color:var(--lav2);min-height:20px;margin:6px 0 8px;"></div>
      <div style="display:flex;gap:6px;">
        <button onclick="jumpToDate('${foodSafe}','plan')"
          style="flex:1;padding:10px;border-radius:var(--rs);border:none;background:var(--honey2);color:#4A3000;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:44px;">📅 予定に追加</button>
        <button onclick="jumpToDate('${foodSafe}','record')"
          style="flex:1;padding:10px;border-radius:var(--rs);border:none;background:var(--mint2);color:var(--white);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:44px;">✅ 記録に追加</button>
      </div>
    </div>`;
  document.getElementById('modalBody').innerHTML=html;
  document.getElementById('foodModal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  initMiniCal();
}

// ── MINI CALENDAR (range select) ──────────────────────────────────
let mc={year:0,month:0,rangeStart:null,rangeEnd:null,dragging:false};
let mcLastTouch=0;
let mcMode='modal';

function initMiniCal(){
  const n=new Date();
  mc.year=n.getFullYear(); mc.month=n.getMonth();
  mc.rangeStart=today(); mc.rangeEnd=null; mc.dragging=false;
  mcMode='modal';
  renderMiniCal();
}

function renderMiniCal(){
  const wrapId=mcMode==='reschedule'?'miniCalWrapR':mcMode==='multiplan'?'miniCalWrapMP':'miniCalWrap';
  const labelId=mcMode==='reschedule'?'rangeLabelR':mcMode==='multiplan'?'rangeLabelMP':'rangeLabel';
  const wrap=document.getElementById(wrapId);
  if(!wrap) return;

  const firstDay=new Date(mc.year,mc.month,1).getDay();
  const lastDate=new Date(mc.year,mc.month+1,0).getDate();
  const prevLast=new Date(mc.year,mc.month,0).getDate();
  const todayStr=today();
  const rs=mc.rangeStart, re=mc.rangeEnd;
  const lo=rs&&re?(rs<re?rs:re):rs;
  const hi=rs&&re?(rs>re?rs:re):rs;

  let html=`<style>
    .mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;user-select:none;-webkit-user-select:none;}
    .mc-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
    .mc-nav button{width:36px;height:36px;border:none;background:var(--white);border-radius:50%;font-size:15px;cursor:pointer;color:var(--text2);touch-action:manipulation;}
    .mc-nav span{font-size:12px;font-weight:700;color:var(--text);}
    .mc-dow{text-align:center;font-size:10px;font-weight:700;color:var(--text3);padding:2px 0;}
    .mc-dow:first-child{color:#D05050;}.mc-dow:last-child{color:#5070D0;}
    .mc-cell{min-height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;cursor:pointer;transition:background .1s;color:var(--text);touch-action:manipulation;}
    .mc-cell.other{color:var(--text3);opacity:.4;}
    .mc-cell.mc-today{color:var(--rose);font-weight:700;}
    .mc-cell.mc-lo,.mc-cell.mc-hi{background:var(--lav2);color:var(--white);font-weight:700;}
    .mc-cell.mc-in{background:var(--lav);}
    .mc-cell.mc-sun{color:#D05050;}.mc-cell.mc-sat{color:#5070D0;}
    .mc-cell.mc-lo.mc-sun,.mc-cell.mc-hi.mc-sun,.mc-cell.mc-lo.mc-sat,.mc-cell.mc-hi.mc-sat{color:var(--white);}
  </style>
  <div class="mc-nav">
    <button onclick="mcChangeMonth(-1)">‹</button>
    <span>${mc.year}年${mc.month+1}月</span>
    <button onclick="mcChangeMonth(1)">›</button>
  </div>
  <div class="mc-grid">
    <div class="mc-dow">日</div><div class="mc-dow">月</div><div class="mc-dow">火</div>
    <div class="mc-dow">水</div><div class="mc-dow">木</div><div class="mc-dow">金</div>
    <div class="mc-dow">土</div>`;

  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push({d:prevLast-firstDay+1+i,cur:false,y:mc.year,m:mc.month-1});
  for(let d=1;d<=lastDate;d++) cells.push({d,cur:true,y:mc.year,m:mc.month});
  const rem=35-cells.length;
  for(let d=1;d<=rem;d++) cells.push({d,cur:false,y:mc.year,m:mc.month+1});

  cells.forEach(({d,cur,y,m},i)=>{
    const mm=m<0?11:(m>11?0:m);
    const yy=m<0?y-1:(m>11?y+1:y);
    const key=dk(yy,mm,d);
    const dow=i%7;
    let cls='mc-cell';
    if(!cur) cls+=' other';
    if(key===todayStr) cls+=' mc-today';
    if(dow===0) cls+=' mc-sun';
    if(dow===6) cls+=' mc-sat';
    if(lo&&hi&&key>=lo&&key<=hi) cls+=' mc-in';
    if(key===lo) cls+=' mc-lo';
    if(key===hi&&hi!==lo) cls+=' mc-hi';
    html+=`<div class="${cls}" data-key="${key}"
      onmousedown="mcOnMouseDown('${key}')" onmouseover="mcOnMouseOver('${key}')" onmouseup="mcOnMouseUp('${key}')"
      ontouchstart="mcOnTouchStart('${key}')" ontouchmove="mcTouchMove(event)" ontouchend="mcOnTouchEnd()"
    >${d}</div>`;
  });
  html+='</div>';
  wrap.innerHTML=html;
  updateRangeLabel(labelId);
}

function mcChangeMonth(d){
  mc.month+=d;
  if(mc.month<0){mc.month=11;mc.year--;}
  if(mc.month>11){mc.month=0;mc.year++;}
  renderMiniCal();
}
function mcDragStart(key){ mc.dragging=true; mc.rangeStart=key; mc.rangeEnd=null; }
function mcDragMove(key){ if(!mc.dragging) return; mc.rangeEnd=key; renderMiniCal(); }
function mcOnTouchStart(key){ mcLastTouch=Date.now(); mcDragStart(key); }
function mcOnTouchEnd(){ mcLastTouch=Date.now(); mcDragEnd(); }
function mcOnMouseDown(key){ if(Date.now()-mcLastTouch<600) return; mcDragStart(key); renderMiniCal(); }
function mcOnMouseOver(key){ if(Date.now()-mcLastTouch<600) return; mcDragMove(key); }
function mcOnMouseUp(key){ if(Date.now()-mcLastTouch<600) return; mcDragEnd(key); }
function mcDragEnd(key){
  if(key) mc.rangeEnd=key;
  mc.dragging=false;
  if(!mc.rangeEnd) mc.rangeEnd=mc.rangeStart;
  renderMiniCal();
}
function updateMiniCalClasses(){
  const wrapId=mcMode==='reschedule'?'miniCalWrapR':mcMode==='multiplan'?'miniCalWrapMP':'miniCalWrap';
  const labelId=mcMode==='reschedule'?'rangeLabelR':mcMode==='multiplan'?'rangeLabelMP':'rangeLabel';
  const wrap=document.getElementById(wrapId);
  if(!wrap) return;
  const rs=mc.rangeStart, re=mc.rangeEnd;
  const lo=rs&&re?(rs<re?rs:re):rs;
  const hi=rs&&re?(rs>re?rs:re):rs;
  wrap.querySelectorAll('.mc-cell').forEach(cell=>{
    const key=cell.dataset.key;
    if(!key) return;
    cell.classList.toggle('mc-in',!!(lo&&hi&&key>=lo&&key<=hi));
    cell.classList.toggle('mc-lo',key===lo);
    cell.classList.toggle('mc-hi',!!(key===hi&&hi!==lo));
  });
  updateRangeLabel(labelId);
}
function mcTouchMove(e){
  if(!mc.dragging) return;
  e.preventDefault();
  const t=e.touches[0];
  const el=document.elementFromPoint(t.clientX,t.clientY);
  if(el&&el.dataset.key){ mc.rangeEnd=el.dataset.key; updateMiniCalClasses(); }
}

function updateRangeLabel(labelId){
  const el=document.getElementById(labelId);
  if(!el) return;
  const lo=mc.rangeStart&&mc.rangeEnd?(mc.rangeStart<mc.rangeEnd?mc.rangeStart:mc.rangeEnd):mc.rangeStart;
  const hi=mc.rangeStart&&mc.rangeEnd?(mc.rangeStart>mc.rangeEnd?mc.rangeStart:mc.rangeEnd):mc.rangeStart;
  if(!lo){ el.textContent='日付をタップ・ドラッグして選択'; return; }
  const fmt=d=>{ const [,m,dd]=d.split('-'); return `${parseInt(m)}/${parseInt(dd)}`; };
  el.textContent=lo===hi?`📅 ${fmt(lo)}`:`📅 ${fmt(lo)} 〜 ${fmt(hi)}`;
}

function getSelectedDates(){
  const lo=mc.rangeStart&&mc.rangeEnd?(mc.rangeStart<mc.rangeEnd?mc.rangeStart:mc.rangeEnd):mc.rangeStart;
  const hi=mc.rangeStart&&mc.rangeEnd?(mc.rangeStart>mc.rangeEnd?mc.rangeStart:mc.rangeEnd):mc.rangeStart;
  if(!lo) return [];
  const dates=[];
  let cur=new Date(lo);
  const end=new Date(hi);
  while(cur<=end){
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function jumpToDate(food,tab){
  const dates=getSelectedDates();
  if(!dates.length) return;
  dates.forEach(dateVal=>{
    if(tab==='record'){
      if(!S.records[dateVal]) S.records[dateVal]=[];
      if(!S.records[dateVal].some(r=>r.food===food)){
        S.records[dateVal].push({food,status:'done',note:''});
        updateFoodStatus(food,'done',dateVal);
      }
    } else {
      if(!S.plans[dateVal]) S.plans[dateVal]=[];
      if(!S.plans[dateVal].some(p=>p.food===food))
        S.plans[dateVal].push({food,note:''});
    }
  });
  save();
  const lo=dates[0].split('-');
  curYear=parseInt(lo[0]); curMonth=parseInt(lo[1])-1;
  selDate=dates[0];
  renderCalendar();
  const label = tab==='record' ? '記録' : '予定';
  const suffix = dates.length>1 ? `（${dates.length}日分）` : '';
  showToast(`✅ ${label}に追加しました${suffix}`);
  openFoodModal(food);
}

function closeModal(){
  document.getElementById('foodModal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// ── STATS VIEW ────────────────────────────────────────────────────
let statsPeriod='all';
let statsActive=null;

function getDateRange(period){
  const n=new Date();
  const pad=v=>String(v).padStart(2,'0');
  const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const t=fmt(n);
  if(period==='today') return {lo:t,hi:t};
  if(period==='week'){
    const dow=n.getDay();
    const mon=new Date(n); mon.setDate(n.getDate()-dow);
    const sun=new Date(mon); sun.setDate(mon.getDate()+6);
    return {lo:fmt(mon),hi:fmt(sun)};
  }
  if(period==='month'){
    const lo=`${n.getFullYear()}-${pad(n.getMonth()+1)}-01`;
    const last=new Date(n.getFullYear(),n.getMonth()+1,0);
    return {lo,hi:fmt(last)};
  }
  return {lo:null,hi:null};
}
function inRange(dateKey,range){ if(!range.lo) return true; return dateKey>=range.lo&&dateKey<=range.hi; }

function renderStats(){
  const el=document.getElementById('statsView');
  const range=getDateRange(statsPeriod);
  const doneFoods=new Set(), ngFoods=new Set(), skippedFoods=new Set();
  const activeDays=new Set();
  Object.entries(S.records).forEach(([d,arr])=>{
    if(!inRange(d,range)) return;
    activeDays.add(d);
    arr.forEach(r=>{
      if(r.status==='done') doneFoods.add(r.food);
      if(r.status==='ng')   ngFoods.add(r.food);
      if(r.status==='skipped') skippedFoods.add(r.food);
    });
  });
  Object.entries(S.plans).forEach(([d,arr])=>{
    if(!inRange(d,range)) return;
    activeDays.add(d);
  });

  const periodLabels={today:'今日',week:'今週',month:'今月',all:'全期間'};
  const tabs=['today','week','month','all'].map(p=>`
    <button onclick="statsPeriod='${p}';statsActive=null;renderStats()"
      style="flex:1;padding:7px 4px;border-radius:99px;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;min-height:44px;touch-action:manipulation;
      background:${statsPeriod===p?'#F4A7A7':'var(--white)'};
      color:${statsPeriod===p?'#8B3030':'var(--text2)'};
      box-shadow:${statsPeriod===p?'0 2px 6px rgba(244,167,167,.4)':'none'};">
      ${periodLabels[p]}
    </button>`).join('');

  let periodDesc='';
  if(range.lo){
    const fmt=d=>{ const [,m,dd]=d.split('-'); return `${parseInt(m)}/${parseInt(dd)}`; };
    periodDesc=range.lo===range.hi?fmt(range.lo):`${fmt(range.lo)} 〜 ${fmt(range.hi)}`;
  } else { periodDesc='記録開始〜現在'; }

  const cards=[
    {key:'done',   foods:doneFoods,    num:doneFoods.size,    label:'食べた食材',   color:'var(--mint2)', hint:'#D4EDE1'},
    {key:'skipped',foods:skippedFoods, num:skippedFoods.size, label:'食べなかった', color:'#A08060',      hint:'#F5F0E8'},
    {key:'ng',     foods:ngFoods,      num:ngFoods.size,      label:'アレルギー',   color:'var(--rose)',  hint:'#FFE5E5'},
  ];
  const cardHtml=cards.map(c=>{
    const isActive=statsActive===c.key;
    const hasData=c.num>0;
    return `<div id="sc-${c.key}"
      onclick="${hasData?`toggleStatsCard('${c.key}')`:'void(0)'}"
      style="background:${isActive?c.hint:'var(--white)'};border-radius:var(--r);padding:14px;text-align:center;
        box-shadow:${isActive?`0 0 0 2px ${c.color},0 2px 10px ${c.hint}`:'0 1px 6px var(--shadow)'};
        cursor:${hasData?'pointer':'default'};transition:all .2s;position:relative;">
      <div style="font-size:28px;font-weight:700;font-family:'Zen Maru Gothic',sans-serif;color:${c.color}">${c.num}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">${c.label}</div>
      ${hasData?`<div style="position:absolute;bottom:6px;right:8px;font-size:10px;color:${c.color};opacity:.7;">${isActive?'▲':'▼'}</div>`:''}
    </div>`;
  }).join('');

  let html=`
    <div style="display:flex;gap:5px;margin-bottom:12px;background:var(--cream);border-radius:99px;padding:4px;">${tabs}</div>
    <div style="text-align:center;font-size:11px;color:var(--text3);margin-bottom:14px;">${periodDesc}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      ${cardHtml}
      <div style="background:var(--white);border-radius:var(--r);padding:14px;text-align:center;box-shadow:0 1px 6px var(--shadow);">
        <div style="font-size:28px;font-weight:700;font-family:'Zen Maru Gothic',sans-serif;color:var(--text2)">${activeDays.size}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">📆 記録日数</div>
      </div>
    </div>
    <div id="statsDetail"></div>`;

  if(!doneFoods.size&&!ngFoods.size&&!skippedFoods.size){
    html+=`<div style="text-align:center;padding:32px 20px;color:var(--text3);">
      <div style="font-size:40px;margin-bottom:10px;">🌸</div>
      <div style="font-size:13px;">この期間の記録はまだありません</div>
    </div>`;
  }
  el.innerHTML=html;
  if(statsActive) renderStatsDetail(statsActive,{doneFoods,skippedFoods,ngFoods},range);
}

function toggleStatsCard(key){
  statsActive=statsActive===key?null:key;
  renderStats();
  if(statsActive){ setTimeout(()=>{ const det=document.getElementById('statsDetail'); if(det) det.scrollIntoView({behavior:'smooth',block:'start'}); },50); }
}

function renderStatsDetail(key,sets,range){
  const det=document.getElementById('statsDetail');
  if(!det) return;
  const cfg={
    done:    {set:sets.doneFoods,    label:'✅ 食べた食材一覧',    chipBg:'var(--mint)', chipColor:'var(--mint3)', headerColor:'var(--mint3)'},
    skipped: {set:sets.skippedFoods, label:'⏭ 食べなかった食材',  chipBg:'#F5F0E8',     chipColor:'#7A5C30',      headerColor:'#7A5C30'},
    ng:      {set:sets.ngFoods,      label:'⚠️ アレルギー食材',    chipBg:'#FFF0F0',     chipColor:'#C03030',      headerColor:'#C03030'},
  }[key];
  const icon={done:'✅',skipped:'⏭',ng:'⚠️'}[key];
  let chips='';
  cfg.set.forEach(f=>{
    let extra='';
    if(key==='done'){
      let cnt=0;
      Object.entries(S.records).forEach(([d,arr])=>{ if(!inRange(d,range)) return; arr.forEach(r=>{ if(r.food===f&&r.status==='done') cnt++; }); });
      if(cnt>1) extra=` <span style="font-size:9px;opacity:.7;">×${cnt}</span>`;
    }
    chips+=`<div style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;
      background:${cfg.chipBg};border-radius:99px;font-size:13px;font-weight:500;
      color:${cfg.chipColor};margin:3px;cursor:pointer;min-height:44px;touch-action:manipulation;"
      onclick="openFoodModal('${f.replace(/'/g,"\\'")}')">
      ${icon} ${f}${extra}
    </div>`;
  });
  det.innerHTML=`
    <div style="background:var(--white);border-radius:var(--r);padding:16px;box-shadow:0 2px 12px var(--shadow);margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:${cfg.headerColor};margin-bottom:10px;">
        ${cfg.label}
        <span style="font-size:11px;font-weight:400;color:var(--text3);margin-left:6px;">${cfg.set.size}品目</span>
      </div>
      <div style="line-height:2;">${chips}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:10px;text-align:center;">食材をタップすると詳細が見られます</div>
    </div>`;
}

// ── EXPORT / IMPORT ──────────────────────────────────────────────
function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// iOS Safari: キーボード閉じた後にズームをリセット
if(isIOS()){
  document.addEventListener('focusout', function(){
    setTimeout(function(){
      window.scrollTo(window.scrollX, window.scrollY);
    }, 100);
  });
}

function exportData(){
  const date     = new Date().toISOString().slice(0,10);
  const jsonStr  = JSON.stringify(S, null, 2);
  const fileName = `離乳食カレンダー_${date}.json`;

  if(isIOS() && navigator.share){
    const file = new File([jsonStr], fileName, {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      showIOSExportGuide(file);
      return;
    }
  }

  const blob = new Blob([jsonStr], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 エクスポートしました');
}

function showIOSExportGuide(file){
  const overlay = document.createElement('div');
  overlay.className = 'ios-guide-overlay';
  overlay.innerHTML = `
    <div class="ios-guide-sheet">
      <div class="ios-guide-title">📱 iPhoneでの保存手順</div>
      <div class="ios-guide-steps">
        <div class="ios-guide-step">
          <span class="ios-guide-num">1</span>
          <span>「エクスポートする」をタップすると<br>共有シートが開きます</span>
        </div>
        <div class="ios-guide-step">
          <span class="ios-guide-num">2</span>
          <span>シートを下にスクロールして<br><strong>「ファイルに保存」</strong>をタップ</span>
        </div>
        <div class="ios-guide-step">
          <span class="ios-guide-num">3</span>
          <span>iCloud Drive などを選んで<br>「保存」をタップ</span>
        </div>
      </div>
      <button class="ios-guide-btn-go" id="ios-guide-go">📤 エクスポートする</button>
      <button class="ios-guide-btn-cancel" id="ios-guide-cancel">キャンセル</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('ios-guide-go').addEventListener('click', () => {
    overlay.remove();
    navigator.share({files:[file], title:'離乳食バックアップ'})
      .then(()  => showToast('💾 エクスポートしました'))
      .catch(err => { if(err.name !== 'AbortError') showToast('エクスポートに失敗しました', true); });
  });
  document.getElementById('ios-guide-cancel').addEventListener('click', () => overlay.remove());
}

function triggerImport(){
  document.getElementById('importInput').click();
}

function importData(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const parsed = JSON.parse(e.target.result);
      if(typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
      S = {
        babyName:    typeof parsed.babyName  === 'string' ? parsed.babyName  : S.babyName,
        babyBirth:   typeof parsed.babyBirth === 'string' ? parsed.babyBirth : S.babyBirth,
        records:     parsed.records    && typeof parsed.records    === 'object' ? parsed.records    : {},
        plans:       parsed.plans      && typeof parsed.plans      === 'object' ? parsed.plans      : {},
        foodStatus:  parsed.foodStatus && typeof parsed.foodStatus === 'object' ? parsed.foodStatus : {},
        customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      };
      rebuildAllFoods();
      save();
      document.getElementById('babyName').value  = S.babyName  || '';
      document.getElementById('babyBirth').value = S.babyBirth || '';
      updateAgeBadge();
      selDate = today();
      renderCalendar();
      renderDetail();
      showToast('✅ データを読み込みました');
    }catch(_){
      showToast('⚠️ 読み込み失敗：正しいバックアップファイルを選択してください', true);
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

function showToast(msg, isError=false){
  let t = document.getElementById('bfc-toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'bfc-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className   = 'bfc-toast' + (isError ? ' bfc-toast-err' : '');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── VIEW SWITCH ───────────────────────────────────────────────────
function switchView(v){
  curView=v;
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.bn').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('bn-'+v).classList.add('active');
  if(v==='foods') renderFoodMaster();
  if(v==='stats') renderStats();
  if(v==='cal')   renderCalendar();
}

// ── INIT ──────────────────────────────────────────────────────────
load();
rebuildAllFoods();
document.getElementById('babyName').value  = S.babyName  || '';
document.getElementById('babyBirth').value = S.babyBirth || '';
updateAgeBadge();
selDate=today();
renderCalendar();
renderDetail();

// ── DISCLAIMER MODAL ──────────────────────────────────────────────
if (!localStorage.getItem('bfc-disclaimer-v1')) {
  document.getElementById('disclaimerOverlay').style.display = 'block';
  document.getElementById('disclaimerModal').style.display  = 'block';
}
function closeDisclaimerModal() {
  localStorage.setItem('bfc-disclaimer-v1', '1');
  document.getElementById('disclaimerOverlay').style.display = 'none';
  document.getElementById('disclaimerModal').style.display  = 'none';
}
