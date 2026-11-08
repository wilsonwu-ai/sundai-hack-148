// Prototype of SPEC §3 habit model + frozen call order, to calibrate A2 thresholds.
const VIBES=['cozy','adventure','tech','luxe','wellness','indulgent']
const CIRCLE=['cozy','indulgent','luxe','tech','adventure','wellness']
const TONES=['warm','cool','neutral']
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeCatalog(r){const items=[];for(const v of VIBES)for(let i=0;i<16;i++)items.push({id:`${v}-${i}`,vibe:v,price:1+Math.floor(r()*4),tone:TONES[Math.floor(r()*3)]});return items}
const CAT=makeCatalog(mulberry32(7)); const BY=new Map(CAT.map(x=>[x.id,x]))
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function dealTurn(r,used){const vibes=shuffle([...VIBES],r).slice(0,4);const ids=vibes.map(v=>{const pool=CAT.filter(x=>x.vibe===v&&!used.has(x.id));return pool[Math.floor(r()*pool.length)].id});ids.forEach(i=>used.add(i));return ids}
function vdist(a,b){const i=CIRCLE.indexOf(a),j=CIRCLE.indexOf(b);const d=Math.abs(i-j);return Math.min(d,6-d)/3}
const NF=6+1+3+4+1+1+1+1
function feats(item,pos,last,shownItem){const x=new Array(NF).fill(0);x[VIBES.indexOf(item.vibe)]=1;x[6]=(item.price-2.5)/1.5;x[7+TONES.indexOf(item.tone)]=1;x[10+pos]=1;if(last){x[14]=pos===last.pos?1:0;x[15]=item.vibe===last.vibe?1:0}if(shownItem){x[16]=item.id===shownItem.id?1:0;x[17]=vdist(item.vibe,shownItem.vibe)}return x}
class Habit{constructor(o={}){this.lr=o.lr??0.6;const G=o.g||{};this.lrv=[...Array(6).fill(G.vibe??this.lr),G.price??this.lr,...Array(3).fill(G.tone??this.lr),...Array(4).fill(G.pos??this.lr),G.sp??this.lr,G.sv??this.lr,G.shown??this.lr,G.dist??this.lr];this.l2=o.l2??0.01;this.w=new Array(NF).fill(0);this.w[10]=o.tl??0.2;this.w[16]=o.shownPrior??-2.5;this.last=null}
 probs(cards,shown){const S=shown?BY.get(shown):null;const X=cards.map((id,p)=>feats(BY.get(id),p,this.last,S));const z=X.map(x=>x.reduce((s,xi,i)=>s+xi*this.w[i],0));const m=Math.max(...z);const e=z.map(v=>Math.exp(v-m));const s=e.reduce((a,b)=>a+b,0);return{X,p:e.map(v=>v/s)}}
 predict(cards,shown){const {p}=this.probs(cards,shown);let top=0;for(let i=1;i<4;i++)if(p[i]>p[top])top=i;let def;if(shown){let b=-1;for(let i=0;i<4;i++){if(cards[i]===shown)continue;if(b<0||p[i]>p[b])b=i}def=cards[b]}return{probs:p,top:cards[top],defiance:def}}
 observe(t){const {X,p}=this.probs(t.cards,t.shown);const k=t.cards.indexOf(t.pick);for(let i=0;i<NF;i++){let g=X[k][i];for(let j=0;j<4;j++)g-=p[j]*X[j][i];this.w[i]+=this.lrv[i]*g-this.lrv[i]*this.l2*this.w[i]}this.last={pos:k,vibe:BY.get(t.pick).vibe}}}
function play(seed,player,o){const r=mulberry32(seed*9973+1);const used=new Set();const m=new Habit(o);const rp=mulberry32(seed*31+5);const rank=shuffle([...VIBES],rp);const log=[]
 for(let round=1;round<=2;round++)for(let i=0;i<6;i++){const cards=dealTurn(r,used);let shown,sealed
  if(round===1){sealed=m.predict(cards).top}else{shown=m.predict(cards).top;const p=m.predict(cards,shown);sealed=p.defiance}
  const pick=player({cards,shown,round,rank,rp,i});const t={round,cards,shown,sealed,pick,position:cards.indexOf(pick)};m.observe(t);log.push(t)}
 return log}
const ranked=({cards,rank})=>{let best=cards[0];for(const c of cards)if(rank.indexOf(BY.get(c).vibe)<rank.indexOf(BY.get(best).vibe))best=c;return best}
const random=({cards,rp})=>cards[Math.floor(rp()*4)]
const defier=(a)=>{if(a.round===1)return ranked(a);const rest=a.cards.filter(c=>c!==a.shown);return ranked({...a,cards:rest})}
const opposite=(a)=>{if(a.round===1)return ranked(a);const S=BY.get(a.shown);const rest=a.cards.filter(c=>c!==a.shown);let b=rest[0];for(const c of rest)if(vdist(BY.get(c).vibe,S.vibe)>vdist(BY.get(b).vibe,S.vibe))b=c;return b}

const posP=({cards})=>cards[3]
const noisy=(a)=> a.rp()<0.7 ? ranked(a) : a.cards[Math.floor(a.rp()*4)]
function rate(player,o,turnFilter,N=200){let h=0,n=0;for(let s=0;s<N;s++){const L=play(s,player,o);L.forEach((t,i)=>{if(!turnFilter(t,i))return;if(t.round===2&&t.pick===t.shown)return;n++;if(t.sealed===t.pick)h++})}return +(100*h/n).toFixed(1)}
const r1late=(t,i)=>i>=2&&i<6, r2=(t,i)=>i>=6
function row(name,o){const out={
 ranked_r1:rate(ranked,o,r1late), noisy_r1:rate(noisy,o,r1late), pos_r1:rate(posP,o,r1late),
 rand_r1:rate(random,o,(t,i)=>i<6), rand_r2def:rate(random,o,r2), defier:rate(defier,o,r2), opposite:rate(opposite,o,r2), noisy_r2def:rate(noisy,o,r2)}
 console.log(name.padEnd(34),JSON.stringify(out))}
row("spec lr .6",{})
row("G vibe1.2 pt.1 pos.5 sp.5 sv.6",{g:{vibe:1.2,price:.1,tone:.1,pos:.5,sp:.5,sv:.6,shown:.6,dist:.6}})
row("G vibe1.2 pt.1 pos.3 sp.3 sv.5",{g:{vibe:1.2,price:.1,tone:.1,pos:.3,sp:.3,sv:.5,shown:.6,dist:.6}})
row("G vibe1.5 pt.1 pos.4 sp.4 sv.5",{g:{vibe:1.5,price:.1,tone:.1,pos:.4,sp:.4,sv:.5,shown:.6,dist:.6}})
row("G vibe1.0 pt.05 pos.4 sp.4 sv.4",{g:{vibe:1.0,price:.05,tone:.05,pos:.4,sp:.4,sv:.4,shown:.6,dist:.6}})
row("G vibe1.2 pt.1 pos.4 sp.6 sv.4",{g:{vibe:1.2,price:.1,tone:.1,pos:.4,sp:.6,sv:.4,shown:.6,dist:.8}})
