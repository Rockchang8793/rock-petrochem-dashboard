const titles={overview:'产业决策总览',aromatics:'芳烃产业链',c4:'C4 Pool 产业链',olefins:'LPG · 烯烃产业链'};
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));document.getElementById('pageTitle').textContent=titles[id];scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.jump)));
document.getElementById('theme').addEventListener('click',()=>document.body.classList.toggle('light'));
const c4=[['PO/TBA联产',4999,'强'],['气分法MTBE',1622,'强'],['1-丁烯分离',760,'强'],['MTO高烯烃溢价',400,'强'],['TBA转MTBE边际',152,'优'],['正丁烷→民用气',80,'弱平衡'],['异丁烷脱氢MTBE',-64,'弱'],['正丁烷异构→MTBE',-192,'弱'],['高烯烃C4制MTBE',-1047,'弱'],['MEK/SBA',-1158,'弱'],['烷基化消化',-1596,'弱'],['正丁烷制顺酐',-1887,'弱'],['顺酐制BDO',-2038,'弱']];
const c4max=Math.max(...c4.map(x=>Math.abs(x[1])));document.getElementById('c4Bars').innerHTML=c4.map(([n,v,s])=>`<div class="bar-row"><span title="${n}">${n}</span><div class="bar-track"><i class="${v<0?'neg':''}" style="--w:${Math.abs(v)/c4max*100}"></i></div><strong class="${v<0?'negative':'positive'}">${v>0?'+':''}${v.toLocaleString()}</strong><em>${s}</em></div>`).join('');
const chains={c2:[['石脑油裂解',-3161],['LLDPE',90],['HDPE',778],['LDPE',2219],['MEG',-120],['苯乙烯',-775],['PVC',-1875]],c3:[['PDH',-235],['PP',8790],['丙烯腈',7704],['HPPO',8799],['丙烯酸',6590],['正丁醇',7100],['辛醇',7375],['丙烯酸丁酯',-2518],['酚酮联产',3508],['MMA',246],['DOTP',-3],['DOP',-1756]]};
function renderMargins(chain){const rows=chains[chain],max=Math.max(...rows.map(x=>Math.abs(x[1])));document.getElementById('marginBars').innerHTML=rows.map(([n,v])=>`<div class="margin-row"><span>${n}</span><div class="margin-track"><i class="${v<0?'neg':''}" style="--w:${Math.abs(v)/max*100}"></i></div><strong class="${v<0?'negative':'positive'}">${v>0?'+':''}${v.toLocaleString()}</strong></div>`).join('')}
renderMargins('c2');document.querySelectorAll('[data-chain]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-chain]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderMargins(btn.dataset.chain)}));

async function loadTencentSyncState(){
  const state=document.getElementById('syncState');
  const source=document.getElementById('syncSource');
  const latest=document.getElementById('lastSync');
  try{
    const response=await fetch('data/tencent-docs.json?v='+Date.now(),{cache:'no-store'});
    if(!response.ok) throw new Error('sync status unavailable');
    const data=await response.json();
    if(!data.generatedAt||data.status==='pending'){
      state.textContent='等待首次同步';
      source.textContent='腾讯文档 Open API';
      return;
    }
    const timestamp=new Date(data.generatedAt);
    const formatted=new Intl.DateTimeFormat('zh-CN',{
      timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hour12:false
    }).format(timestamp);
    latest.textContent=formatted;
    state.textContent=data.status==='connected'?'数据连接正常':'同步状态异常';
    source.textContent='腾讯文档 Open API';
    for(const [key,document] of Object.entries(data.documents||{})){
      const target=document.getElementById(key+'Sync');
      if(target) target.textContent=`API 已连接 · ${document.rowCount} 行 × ${document.columnCount} 列`;
    }
  }catch(error){
    state.textContent='同步数据暂不可用';
    source.textContent='保留已审核快照';
    latest.textContent='连接检查失败';
  }
}
loadTencentSyncState();
