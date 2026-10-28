// @ts-nocheck
"use client";
/* The charts are drawn with plain DOM + SVG inside an effect, so the `mount`
   body below is imperative JavaScript and is not worth converting to strict
   TypeScript: this file keeps `@ts-nocheck`. The PUBLIC surface is typed (the
   exported interfaces) and the strict wrapper lives in
   src/components/admin/GrowthBoard.tsx, which is what the app imports.
   No dependencies. */

/* Layout, glass gradients and chart drawing adapted from the "Finance Bento"
   component by vasnev.art (https://vasnev.art). The optional "by vasnev.art"
   badge is kept behind the `credit` prop. Re-mapped for Blueberry: a growth
   board (learners by plan, activation funnel, day-7 return, CAC, exams,
   feedback, flagged lessons, weekday activity). Admin only. */

import * as React from "react";

/* ------------------------------------------------------------------ */
/*  Card mapping (original -> growth board)                           */
/*  Net-worth stream      -> Learners stream by plan                  */
/*  Allocation gauge      -> Activation funnel tick gauge             */
/*  Portfolio return tile -> Day-7 return (solid accent tile)         */
/*  Free-cash runway tile -> Blended CAC with ticks against a target  */
/*  Upcoming payments     -> Next exams                               */
/*  Goals                 -> Open feedback                            */
/*  Cash-flow waves       -> Sign-ups (above) vs inactive (below)     */
/*  Crypto candles        -> Top flagged lessons, 7-day sparklines    */
/*  Stocks capsules       -> Active learners by weekday               */
/*  Currency control      -> Device filter (All / Phone / Desktop)    */
/* ------------------------------------------------------------------ */

export type DeviceKey = "all" | "phone" | "desktop";

export interface PlanPoint {
  /** First day of the month, ISO date ("2026-09-01"). Parsed as UTC. */
  month: string;
  free: number;
  ad: number;
  pro: number;
}

export interface FunnelStage {
  label: string;
  count: number;
}

export interface DeviceSlice {
  /** Month-end learners by plan, oldest first, at least 2 rows. */
  learners: PlanPoint[];
  /** Exactly four stages: signed up, started a lesson, cleared the first node, came back on day 7. */
  funnel: FunnelStage[];
  /** Day-7 return of the previous period (0 to 1), or null when unknown. */
  previousDay7Return: number | null;
  /** Months for the waves; each row of signups/churned has one value per month. Row 0 is the latest year. */
  flow: { months: string[]; seriesLabels: string[]; signups: number[][]; churned: number[][] };
  /** Active learners per weekday. */
  weekday: { days: string[]; values: number[] };
}

export interface FinanceBentoData {
  /** Short label for the date the numbers are as of, shown beside the title. */
  asOf: string;
  /** True for made-up numbers; the wrapper shows a visible chip. */
  isSample: boolean;
  slices: Record<DeviceKey, DeviceSlice>;
  /** Blended customer acquisition cost in whole US dollars (spend / sign-ups). */
  cac: { current: number | null; target: number; spend: number; signups: number };
  /** Upcoming exams that drive traffic. Three are shown. */
  exams: { name: string; date: string; daysAway: number }[];
  /** Flagged questions awaiting review, by reason. Two are shown. */
  feedback: { label: string; open: number; total: number }[];
  /** Most flagged lessons, busiest first. Three are shown; daily holds 7 values, oldest first. */
  flaggedLessons: { name: string; change: string; daily: number[] }[];
}

export interface FinanceBentoProps {
  data: FinanceBentoData;
  title?: string;
  subtitle?: string;
  /** The "by vasnev.art" badge under the grid. */
  credit?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CSS = `.fpb{font-family:var(--font-display),ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;width:100%}
.fpb *{box-sizing:border-box}
.fpb .fpb-c{border-radius:28px}
.fpb .vbrow{display:flex;justify-content:flex-end;margin-top:16px}
.fpb{--acc:#E8FF1F;--t1:#fff;--t2:rgba(255,255,255,.56);--t3:rgba(255,255,255,.38);--hair:rgba(255,255,255,.14);--ease:cubic-bezier(.32,.72,0,1);
    }
.fpb *{box-sizing:border-box}
.fpb .fpb-c{position:relative;padding:20px 22px 22px;background:#000;color:#fff}
.fpb .top{display:flex;align-items:center;gap:14px;height:44px;margin-bottom:16px}
.fpb .top h1{margin:0;font-size:28px;font-weight:700;letter-spacing:-.03em;flex:1}
.fpb .top h1 span{font-weight:500;color:var(--t3);font-size:15px;letter-spacing:-.01em;margin-left:12px}
.fpb .seg{display:flex;padding:3px;gap:2px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.fpb .seg button{border:0;height:28px;min-width:44px;padding:0 12px;border-radius:11px;background:transparent;color:var(--t2);font:700 12.5px var(--font-display),ui-sans-serif,system-ui,sans-serif;cursor:pointer;transition:background .25s,color .25s}
.fpb .seg button[aria-pressed="true"]{background:#fff;color:#0b0b0c}
.fpb .seg button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.fpb .ctrls{display:flex;gap:10px}
.fpb .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
.fpb .h1{height:376px}
.fpb .h2{height:168px}
.fpb .h3{height:330px}
.fpb #nw{grid-column:span 8}
.fpb #alloc{grid-column:span 4}
.fpb .kpi{grid-column:span 3}
.fpb #flow{grid-column:span 5}
.fpb #crypto{grid-column:span 4}
.fpb #stocks{grid-column:span 3}
@media (max-width:1199px){.fpb #nw{grid-column:span 12}
.fpb #alloc{grid-column:span 6;grid-row:span 2;height:auto}
.fpb .kpi{grid-column:span 6}
.fpb #flow{grid-column:span 12}
.fpb #crypto,.fpb #stocks{grid-column:span 6}}
@media (max-width:767px){.fpb .fpb-c{padding:16px 14px}
.fpb .top{flex-wrap:wrap;height:auto;gap:12px}
.fpb .top h1{flex:1;font-size:24px}
.fpb .top h1 span{display:block;margin:4px 0 0}
.fpb .ctrls{order:3;flex:1 0 100%;justify-content:space-between}
.fpb #nw{height:420px}
.fpb #nw .legend{flex:1 0 100%;order:3;margin-top:8px}
.fpb #nw .hrow{flex-wrap:wrap}
.fpb #nw .nrow{flex-wrap:wrap;gap:6px 16px}
.fpb #alloc{grid-column:span 12;grid-row:auto;height:376px}
.fpb .kpi{grid-column:span 6}
.fpb #crypto,.fpb #stocks{grid-column:span 12}
.fpb .grid{gap:12px}}
@media (max-width:520px){.fpb .kpi{grid-column:span 12}}
.fpb .card{position:relative;border-radius:28px;overflow:hidden;opacity:0;transform:translateY(14px) scale(.985);transition:opacity .7s ease,transform .9s var(--ease)}
.fpb .in .card{opacity:1;transform:none}
.fpb .card .rim{position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px rgba(255,255,255,.06);pointer-events:none;z-index:9}
.fpb .g{position:absolute;inset:0}
.fpb .core{position:absolute;left:10%;right:10%;top:16%;bottom:-6%;border-radius:90px;filter:blur(60px)}
.fpb .glass{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(20px)}
.fpb .glass .rim{display:none}
.fpb .solid{background:var(--acc);color:#0b0b0c}
.fpb .solid .rim{box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
.fpb .in-c{position:absolute;inset:0;padding:22px 24px;z-index:2}
.fpb .ttl{font-size:18px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
.fpb .cap{font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}
.fpb .solid .cap{color:rgba(0,0,0,.55)}
.fpb .big{font-size:40px;font-weight:300;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.fpb .delta{font:600 12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--acc);letter-spacing:-.02em}
.fpb .muted{font-size:12.5px;color:var(--t3);font-weight:500;letter-spacing:-.01em}
.fpb .chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:11px;background:rgba(0,0,0,.85);color:#fff;font:600 11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:-.02em}
.fpb .legend{display:flex;gap:16px;font-size:12px;font-weight:500;color:var(--t2)}
.fpb .legend span{display:inline-flex;align-items:center;gap:6px}
.fpb .legend i{width:8px;height:8px;border-radius:50%}
.fpb .row{display:flex;align-items:center;gap:12px}
.fpb .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.fpb .dots circle{transition:opacity .26s,transform .26s;transform-box:fill-box;transform-origin:center}
.fpb .tip{position:fixed;z-index:50;pointer-events:none;background:rgba(14,14,16,.92);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:9px 11px;font-size:12px;
    backdrop-filter:blur(16px);box-shadow:0 12px 30px -10px rgba(0,0,0,.6);opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;white-space:nowrap;min-width:150px}
.fpb .tip.on{opacity:1;transform:none}
.fpb .tip .t{color:var(--t2);margin-bottom:5px;font-weight:500}
.fpb .tip .r{display:flex;justify-content:space-between;gap:14px;align-items:center;line-height:19px}
.fpb .tip .r span{display:inline-flex;align-items:center;gap:6px;color:var(--t2)}
.fpb .tip i{width:7px;height:7px;border-radius:50%}
.fpb .tip b{font:500 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fpb .vb-badge{--vb-on:#6a5cff;display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 12px 0 11px;border-radius:17px;background:#111113;border:1px solid rgba(255,255,255,.1);color:#fff;text-decoration:none;font:600 13px/1 var(--font-display),ui-sans-serif,system-ui,sans-serif;letter-spacing:-.02em;box-shadow:0 8px 24px -14px rgba(0,0,0,.25);transition:border-color .25s}
.fpb .vb-badge:hover{border-color:color-mix(in oklab,var(--vb-on) 45%,transparent)}
.fpb .vb-mark{display:grid;grid-template-columns:repeat(5,3px);grid-template-rows:repeat(3,3px);gap:2px}
.fpb .vb-mark i{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.16);transition:background .3s}
.fpb .vb-mark i.on{background:var(--vb-on)}
.fpb .vb-badge:hover .vb-mark i.on{animation:vbw .9s cubic-bezier(.3,1.4,.4,1) calc(var(--x)*60ms) 1}
.fpb .vb-badge:hover .vb-mark i:not(.on){background:color-mix(in oklab,var(--vb-on) 22%,transparent)}
@keyframes vbw{0%,100%{transform:none}40%{transform:translateY(-2px) scale(1.35)}}
.fpb .vb-by{color:rgba(255,255,255,.5)}
.fpb .vb-arr{height:12px;width:0;margin-left:-9px;opacity:0;transform:translate(-4px,4px);transition:all .3s cubic-bezier(.2,.9,.25,1)}
.fpb .vb-badge:hover .vb-arr{width:12px;margin-left:0;opacity:1;transform:none}
.fpb .seg{flex-wrap:wrap}
.fpb text.m{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fpb .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fpb #alloc .alg{width:100%;max-width:300px;height:auto}
@media (pointer:coarse),(max-width:767px){.fpb .seg button{height:44px;min-width:44px}.fpb .seg{border-radius:18px}}
@media (prefers-reduced-motion: reduce){.fpb .card,.fpb .seg button,.fpb .tip,.fpb .dots circle,.fpb .crs,.fpb .sb{transition:none!important}
.fpb .alg line,.fpb .gl line,.fpb .cst line{animation:none!important;opacity:1!important}
.fpb .vb-badge:hover .vb-mark i.on{animation:none}}`;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/* Every string that comes from `data` goes through esc() before it reaches
   innerHTML: titles, names, labels, dates, change strings, month and day
   labels. Numbers go through num()/compact()/finite() so NaN never prints. */
const markup = (o) => `<div class="fpb-c canvas">
      <div class="top">
        <h1>${esc(o.title)}<span id="asof">${esc(o.subtitle)}</span></h1>
        <div class="ctrls"><div class="seg" id="period" role="group" aria-label="Period"></div>
        <div class="seg" id="dev" role="group" aria-label="Device"></div></div>
      </div>
      <div class="grid" id="grid">
        <!-- learners stream -->
        <section class="card h1" id="nw" aria-label="Learners by plan"></section>
        <!-- activation funnel -->
        <section class="card h1" id="alloc" aria-label="Activation funnel"></section>
        <!-- KPI row -->
        <section class="card h2 kpi" id="ret" aria-label="Day-7 return"></section>
        <section class="card glass h2 kpi" id="cash" aria-label="Customer acquisition cost"></section>
        <section class="card glass h2 kpi" id="pay" aria-label="Next exams"></section>
        <section class="card glass h2 kpi" id="goals" aria-label="Open feedback"></section>
        <!-- bottom row -->
        <section class="card h3" id="flow" aria-label="Sign-ups and inactive learners"></section>
        <section class="card h3" id="crypto" aria-label="Top flagged lessons"></section>
        <section class="card h3" id="stocks" aria-label="Active learners by weekday"></section>
      </div>
    </div>
${o.credit?`<div class="vbrow"><a class="vb-badge" href="https://vasnev.art" target="_blank" rel="noopener" aria-label="Made by vasnev.art"><span class="vb-mark" id="vbm" aria-hidden="true"></span><span><span class="vb-by">by</span> vasnev.art</span><svg class="vb-arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>`:""}
<div class="tip" id="tip" role="presentation"></div>`;

function mount(root, data) {
  let alive = true;
  const frames = new Set();
  const RAF = (cb) => { if (!alive) return 0; const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) cb(t); }); frames.add(id); return id; };
  const $id = (id) => root.querySelector("#" + id);

const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACC='#E8FF1F',T2='rgba(255,255,255,.56)',T3='rgba(255,255,255,.38)',HAIR='rgba(255,255,255,.14)';
const COL={free:'#FFFFFF',ad:'#A9B2FF',pro:'#FFB37A'};
const FC=['#FFFFFF','#A9B2FF','#FFB37A',ACC];
const ease=t=>1-Math.pow(1-t,3);
const NS='http://www.w3.org/2000/svg';
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};

/* ---------- state ---------- */
const S={period:'1Y',dev:'All'};
const DEV={All:'all',Phone:'phone',Desktop:'desktop'};
const sl=()=>data.slices[DEV[S.dev]]||data.slices.all;
const finite=v=>Number.isFinite(+v)?+v:0;
const num=v=>Math.round(finite(v)).toLocaleString('en-US');
const compact=v=>{v=finite(v);return Math.abs(v)>=1000?(v/1000).toFixed(Math.abs(v)>=10000?0:1)+'K':String(Math.round(v))};
/* real dollars: CAC and spend */
const usd=(v,{dec=0,compact:c=false}={})=>{v=finite(v);
  if(c&&Math.abs(v)>=1000)return '$'+(v/1000).toFixed(Math.abs(v)>=10000?0:1)+'K';
  return (v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})};
const pctOf=(a,b)=>b>0?Math.round(finite(a)/b*100):0;
const niceMax=v=>{v=Math.max(1,finite(v));const m=Math.pow(10,Math.floor(Math.log10(v)))/2;return Math.ceil(v/m)*m};

/* ---------- data ---------- */
function series(){
  const all=sl().learners.map(h=>({d:new Date(h.month),free:finite(h.free),ad:finite(h.ad),pro:finite(h.pro)}));
  const n=S.period==='6M'?6:S.period==='1Y'?12:all.length;
  const src=all.slice(-Math.max(2,n));
  const wide=S.period==='All'&&src.length>12;
  return src.map(h=>({...h,l:h.d.toLocaleDateString('en-US',wide?{month:'short',year:'2-digit',timeZone:'UTC'}:{month:'short',timeZone:'UTC'})}));
}
const total=p=>p.free+p.ad+p.pro;

/* ---------- helpers ---------- */
function bg({top,base,bottom,core}){return `<div class="g" style="background:linear-gradient(180deg,${top} 0%,${base} 36%,${base} 74%,${bottom} 100%)"></div><div class="core" style="background:${core}"></div>`}
const GR={
  blue:{top:'#b9a6ff',base:'#2e43ff',bottom:'#6d7dff',core:'#05082a'},
  graph:{top:'#9a9aa8',base:'#3a3a44',bottom:'#55555f',core:'#060608'},
  pink:{top:'#ffb3d6',base:'#ff2a85',bottom:'#ff6aa8',core:'#3a031c'},
  copper:{top:'#f6bf96',base:'#c2683a',bottom:'#dc8a5c',core:'#1d0b05'},
  green:{top:'#a6e8c8',base:'#36956f',bottom:'#58b58c',core:'#061d15'},
  lime:{top:'#f4ffb8',base:'#a3c400',bottom:'#c9e03a',core:'#121700'},
};
function smoothPath(P,move=true){let d=(move?'M':'L')+`${P[0][0]},${P[0][1]}`;for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2,k=.17;
  d+=`C${p1[0]+(p2[0]-p0[0])*k},${p1[1]+(p2[1]-p0[1])*k} ${p2[0]-(p3[0]-p1[0])*k},${p2[1]-(p3[1]-p1[1])*k} ${p2[0]},${p2[1]}`}return d}
const P2=(r,a)=>[r*Math.cos(a*Math.PI/180),r*Math.sin(a*Math.PI/180)];
const F={'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11111','00010','00100','00010','00001','10001','01110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','11110','00001','00001','10001','01110'],'6':['00110','01000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00010','01100'],',':['0','0','0','0','0','1','1'],' ':['00','00','00','00','00','00','00']};
function DotNumber(host,pitch){
  const cols=48,svg=el('svg',{class:'dots','aria-hidden':'true'},host),cells=[];
  for(let c=0;c<cols;c++)for(let r=0;r<7;r++){const ci=el('circle',{cx:c*pitch+pitch/2,cy:r*pitch+pitch/2,r:pitch*.36,fill:'#fff',opacity:0},svg);ci.style.transitionDelay=(c*7)+'ms';cells.push([c,r,ci])}
  const set=t=>{const on=new Set();let x=0;for(const ch of t){const g=F[ch]||F[' '];const w=g[0].length;for(let r=0;r<7;r++)for(let k=0;k<w;k++)if(g[r][k]==='1')on.add((x+k)*8+r);x+=w+1}
    const used=Math.max(1,x-1);for(const [c,r,ci] of cells){const v=on.has(c*8+r);ci.setAttribute('opacity',v?1:(c<used?.08:0));ci.style.transform=v?'none':'scale(.55)'}
    svg.setAttribute('width',used*pitch);svg.setAttribute('height',7*pitch);svg.setAttribute('viewBox',`0 0 ${used*pitch} ${7*pitch}`)};
  let raf=0,cur=0;
  return {count(to,dur=900){cancelAnimationFrame(raf);const from=cur,t0=performance.now();let last='';
    const f=now=>{const t=reduce?1:Math.min(1,(now-t0)/dur);cur=from+(to-from)*ease(t);const s=Math.round(cur).toLocaleString('en-US');if(s!==last){set(s);last=s}if(t<1)raf=RAF(f)};raf=RAF(f)}};
}
function tween(node,to,fmt,dur=900){const from=+node.dataset.v||0,t0=performance.now();node.dataset.v=to;
  (function f(now){const t=reduce?1:Math.min(1,(now-t0)/dur);node.textContent=fmt(from+(to-from)*ease(t));if(t<1)RAF(f)})(t0)}
const tip=$id('tip');
function showTip(x,y,title,rows){tip.innerHTML=`<div class="t">${esc(title)}</div>`+rows.map(([k,v,c])=>`<div class="r"><span>${c?`<i style="background:${esc(c)}"></i>`:''}${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  tip.classList.add('on');const r=tip.getBoundingClientRect();let L=x+16,T=y-r.height-14;if(L+r.width>innerWidth-8)L=x-r.width-16;if(T<8)T=y+16;tip.style.left=Math.max(8,L)+'px';tip.style.top=T+'px'}
const hideTip=()=>tip.classList.remove('on');

/* ================= cards ================= */

/* ---- Learners: a stream of the three plans ---- */
const nw=$id('nw');
nw.innerHTML=`${bg(GR.blue)}<div class="in-c">
  <div class="row hrow" style="justify-content:space-between"><div class="ttl">Learners</div>
    <div class="legend"><span><i style="background:${COL.free}"></i>Free</span><span><i style="background:${COL.ad}"></i>Ad-supported</span><span><i style="background:${COL.pro}"></i>Pro</span></div></div>
  <div class="row nrow" style="margin-top:16px;align-items:flex-end;gap:16px"><div class="nwn" role="img" aria-label="Total learners"></div>
    <div style="padding-bottom:6px"><div class="delta nwd"></div><div class="muted nwc" style="margin-top:3px"></div></div></div>
  <svg class="nws" style="position:absolute;left:0;right:0;bottom:0;display:block" aria-hidden="true"></svg></div><div class="rim"></div>`;
const nwNum=DotNumber(nw.querySelector('.nwn'),innerWidth<520?5.4:7);
let nwGrow=0,nwRaf=0,nwData=null;
function drawNW(){
  const svg=nw.querySelector('.nws'),W=nw.clientWidth,Hh=226,top=26,bot=26,mid=top+(Hh-top-bot)/2;
  svg.setAttribute('width',W);svg.setAttribute('height',Hh);svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`);
  const D=nwData,n=D.length,tots=D.map(total),mx=Math.max(...tots),mn=Math.min(...tots),floor=mn-(mx-mn)*.9,half=(Hh-top-bot)/2;
  const k=p=>total(p)>0&&mx>floor?((total(p)-floor)/(mx-floor))*half*2/total(p):0;
  const X=i=>-20+i/(n-1)*(W+40);
  // grow from the centre line
  const g=ease(nwGrow);
  const lay=D.map(p=>{const q=k(p)*g/2,f=p.free*q,s=p.ad*q,c=p.pro*q;return {f,fs:f+s,fsc:f+s+c}});
  const band=k=>{const T=D.map((p,i)=>[X(i),mid-lay[i][k]]),B=D.map((p,i)=>[X(i),mid+lay[i][k]]).reverse();return smoothPath(T)+smoothPath(B,false)+'Z'};
  const marks=[...new Set([Math.round((n-1)*.18),Math.round((n-1)*.55),n-1])];
  svg.innerHTML=`
    <defs><linearGradient id="nwf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".25" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="nwm"><rect width="${W}" height="${Hh}" fill="url(#nwf)"/></mask></defs>
    <g mask="url(#nwm)"><path d="${band('fsc')}" fill="${COL.pro}" opacity=".95"/><path d="${band('fs')}" fill="${COL.ad}"/><path d="${band('f')}" fill="${COL.free}" opacity=".95"/></g>
    ${marks.map((i,k)=>{const x=Math.min(W-36,Math.max(36,X(i)));const t=total(D[i]);return `<g style="opacity:${g>.6?1:0};transition:opacity .4s ${k*.08}s">
      <line x1="${x}" x2="${x}" y1="${top-4}" y2="${Hh-bot+4}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>
      <rect x="${x-34}" y="${top-14}" width="68" height="22" rx="11" fill="#000"/><text class="m" x="${x}" y="${top+1}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff">${esc(compact(t))}</text>
      <rect x="${x-30}" y="${Hh-bot-8}" width="60" height="22" rx="11" fill="#000"/><text class="m" x="${x}" y="${Hh-bot+7}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.7)">${esc(D[i].l)}</text></g>`}).join('')}
    <line class="hl" y1="${top}" y2="${Hh-bot}" stroke="#fff" stroke-width="1.5" opacity="0"/>
    <rect width="${W}" height="${Hh}" fill="transparent" class="hit"/>`;
  const hit=svg.querySelector('.hit'),hl=svg.querySelector('.hl');
  hit.onpointermove=e=>{const r=svg.getBoundingClientRect(),z=r.width/W,x=(e.clientX-r.left)/z;const i=Math.max(0,Math.min(n-1,Math.round((x+20)/(W+40)*(n-1))));const p=D[i];
    hl.setAttribute('x1',X(i));hl.setAttribute('x2',X(i));hl.setAttribute('opacity',1);
    showTip(r.left+X(i)*z,r.top+(mid-lay[i].fsc)*z,p.l,[['Pro',num(p.pro),COL.pro],['Ad-supported',num(p.ad),COL.ad],['Free',num(p.free),COL.free],['Total',num(total(p))]])};
  hit.onpointerleave=()=>{hl.setAttribute('opacity',0);hideTip()};
}
function updateNW(){
  nwData=series();const D=nwData,a=total(D[0]),b=total(D[D.length-1]);
  nwNum.count(b);
  nw.querySelector('.nwn').setAttribute('aria-label','Total learners: '+num(b));
  nw.querySelector('.nwd').textContent=a>0?(b>=a?'↑ ':'↓ ')+Math.abs((b-a)/a*100).toFixed(1)+'%':'new';
  nw.querySelector('.nwc').textContent=(b>=a?'+':'−')+num(Math.abs(b-a))+' learners over '+(D.length-1)+' months';
  cancelAnimationFrame(nwRaf);const t0=performance.now();nwGrow=0;
  const f=now=>{nwGrow=reduce?1:Math.min(1,(now-t0)/1100);drawNW();if(nwGrow<1)nwRaf=RAF(f)};nwRaf=RAF(f);
}

/* ---- Activation funnel: a half gauge of tick marks ---- */
const al=$id('alloc');
al.innerHTML=`${bg(GR.graph)}<div class="in-c">
  <div class="row" style="justify-content:space-between"><div class="ttl">Activation</div><span class="chip" style="background:rgba(255,255,255,.12)">Sign-up to day 7</span></div>
  <svg class="alg" width="300" height="168" viewBox="-150 -150 300 168" style="position:absolute;left:50%;transform:translateX(-50%);top:70px" aria-hidden="true"></svg>
  <div class="all" style="position:absolute;left:24px;right:24px;bottom:20px"></div></div><div class="rim"></div>`;
function updateAlloc(){
  const fn=sl().funnel,c0=Math.max(1,finite(fn[0].count)),r=fn.map(s=>Math.min(1,finite(s.count)/c0));
  const n=56,svg=al.querySelector('.alg');let s='';
  for(let i=0;i<=n;i++){const f=i/n,a=180+f*180;let st=0;for(let j=fn.length-1;j>0;j--)if(f<=r[j]){st=j;break}
    const [x1,y1]=P2(136,a),[x2,y2]=P2(i%7===0?112:118,a);
    s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${FC[st]||FC[0]}" stroke-opacity="${st===0?.35:1}" stroke-width="3.2" stroke-linecap="round" style="opacity:0;animation:tk .4s ${i*12}ms forwards"/>`}
  const back=Math.round(r[fn.length-1]*100);
  s+=`<text y="-22" text-anchor="middle" font-weight="300" font-size="52" fill="#fff" letter-spacing="-2">${back}<tspan font-size="17" dy="-24" fill="${T2}">%</tspan></text><text y="0" text-anchor="middle" font-size="12" font-weight="600" fill="${T3}">${esc(fn[fn.length-1].label)}</text>`;
  svg.innerHTML=`<style>@keyframes tk{to{opacity:1}}</style>`+s;
  al.querySelector('.all').innerHTML=fn.map((st,i)=>
    `<div class="row" style="height:28px;${i?'border-top:1px solid rgba(255,255,255,.1)':''}"><i style="width:8px;height:8px;border-radius:50%;background:${FC[i]||FC[0]}"></i><span class="nm" style="flex:1;min-width:0;font-size:13px;font-weight:600">${esc(st.label)}</span><span class="mono muted" style="width:44px;text-align:right">${Math.round(r[i]*100)}%</span><span class="mono" style="width:64px;text-align:right;font-size:13px">${num(st.count)}</span></div>`).join('');
}

/* ---- KPI: day-7 return (solid accent tile) ---- */
const ret=$id('ret');
ret.innerHTML=`${bg(GR.lime)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Day-7 return</div><span class="chip rtc">no prior</span></div>
  <div style="position:absolute;left:22px;bottom:32px;display:flex;align-items:center;gap:8px"><svg class="rta" width="30" height="36" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 37V5M5 17L17 5l12 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="big rtv" style="font-size:52px">0%</span></div>
  <div class="muted rtp" style="position:absolute;left:24px;bottom:14px;font-size:11.5px">Of sign-ups, back on day 7</div></div><div class="rim"></div>`;
function updateRet(){const s=sl(),fn=s.funnel,r=Math.min(1,finite(fn[fn.length-1].count)/Math.max(1,finite(fn[0].count)))*100;
  const prev=s.previousDay7Return==null?null:finite(s.previousDay7Return)*100;
  tween(ret.querySelector('.rtv'),r,v=>v.toFixed(1)+'%');
  ret.querySelector('.rtc').textContent=prev==null?'no prior':(r>=prev?'+':'−')+Math.abs(r-prev).toFixed(1)+' pts';
  ret.querySelector('.rta').style.transform=prev!=null&&r<prev?'rotate(180deg)':'none'}

/* ---- KPI: CAC with ticks against a target ---- */
const cash=$id('cash');
cash.innerHTML=`<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Blended CAC</div><span class="muted cct"></span></div>
  <div class="row" style="margin-top:14px;align-items:baseline;justify-content:space-between"><span class="big csv" style="font-size:38px">0</span><span class="mono" style="font-size:20px;font-weight:500"><span class="crw">0</span><span class="muted" style="font-size:12px"> spent</span></span></div>
  <svg class="cst" width="100%" height="22" style="position:absolute;left:24px;right:24px;bottom:22px;width:calc(100% - 48px)" aria-hidden="true"></svg></div>`;
function updateCash(){const c=data.cac,cur=c.current==null?null:finite(c.current),tg=Math.max(.01,finite(c.target));
  cash.querySelector('.cct').textContent='Target '+usd(tg,{dec:2});
  if(cur==null)cash.querySelector('.csv').textContent='n/a';else tween(cash.querySelector('.csv'),cur,x=>usd(x,{dec:2}));
  tween(cash.querySelector('.crw'),finite(c.spend),x=>usd(x,{compact:true}));
  const svg=cash.querySelector('.cst'),W=svg.getBoundingClientRect().width||220,n=36,scale=Math.max(tg*2,(cur||0)*1.1),ti=Math.round(tg/scale*(n-1));let s='';
  const over=cur!=null&&cur>tg;
  for(let i=0;i<n;i++){const x=1+i*(W-2)/(n-1),on=cur!=null&&i/(n-1)<=cur/scale,isT=i===ti;
    s+=`<line x1="${x}" x2="${x}" y1="${isT?0:i%6===0?2:8}" y2="20" stroke="${isT?'#fff':on?(over?'#FFB37A':ACC):'rgba(255,255,255,.28)'}" stroke-width="${isT?2.2:1.6}" stroke-linecap="round" style="transition:stroke .2s ${i*14}ms"/>`}
  svg.innerHTML=s+`<text class="m" x="${W}" y="0" dy="-4" text-anchor="end" font-size="10" fill="${T3}">${esc(usd(scale,{dec:2}))}</text>`}

/* ---- KPI: next exams ---- */
const pay=$id('pay');
function updatePay(){const X=data.exams.slice(0,3);
  pay.innerHTML=`<div class="in-c" style="padding-bottom:14px"><div class="row" style="justify-content:space-between"><div class="cap">Next exams</div><span class="mono muted">${X.length} upcoming</span></div>
  <div style="margin-top:10px">${X.map((p,i)=>`<div class="row" style="height:34px;${i?'border-top:1px solid rgba(255,255,255,.08)':''}"><i style="width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,.1);display:grid;place-items:center;font:700 11px var(--font-display),sans-serif;font-style:normal">${esc(String(p.name).charAt(0))}</i><span class="nm" style="flex:1;min-width:0;font-size:13px;font-weight:600">${esc(p.name)}</span><span class="muted mono" style="font-size:11.5px">${esc(p.date)}</span><span class="mono" style="width:40px;text-align:right;font-size:13px">${num(p.daysAway)}d</span></div>`).join('')}</div></div>`}

/* ---- KPI: open feedback ---- */
const goals=$id('goals');
function updateGoals(){const G=data.feedback.slice(0,2),open=data.feedback.reduce((a,g)=>a+finite(g.open),0);
  goals.innerHTML=`<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Open feedback</div><span class="muted">${num(open)} open</span></div>
  ${G.map((g,k)=>{const t=finite(g.total),f=t>0?Math.max(0,Math.min(1,1-finite(g.open)/t)):1;return `<div style="margin-top:${k?14:16}px"><div class="row" style="justify-content:space-between;font-size:13px;font-weight:600"><span class="nm" style="min-width:0">${esc(g.label)}</span><span class="mono" style="font-weight:500;white-space:nowrap">${num(g.open)}<span class="muted"> of ${num(t)}</span></span></div>
    <svg width="100%" height="12" style="margin-top:8px;display:block" class="gl" data-f="${f}" aria-hidden="true"></svg></div>`}).join('')}</div>`;
  RAF(()=>goals.querySelectorAll('.gl').forEach((svg,k)=>{const W=svg.getBoundingClientRect().width,n=40,f=+svg.dataset.f;let s='';
    for(let i=0;i<n;i++){const x=1+i*(W-2)/(n-1),on=i/(n-1)<=f;s+=`<line x1="${x}" x2="${x}" y1="${i%8===0?0:4}" y2="12" stroke="${on?ACC:'rgba(255,255,255,.28)'}" stroke-width="1.6" stroke-linecap="round" style="opacity:0;animation:tk2 .3s ${300+k*150+i*12}ms forwards"/>`}
    svg.innerHTML='<style>@keyframes tk2{to{opacity:1}}</style>'+s}))}

/* ---- Flow: mirrored waves, sign-ups above, inactive below ---- */
const flow=$id('flow');
flow.innerHTML=`${bg(GR.pink)}<div class="in-c">
  <div class="row" style="justify-content:space-between"><div><div class="ttl">Sign-ups and churn</div><div class="muted flnet" style="margin-top:4px"></div></div>
    <div class="legend" style="flex-direction:column;gap:4px;align-items:flex-end"><span><i style="background:#fff"></i>Sign-ups</span><span><i style="background:#FFD0E6"></i>Inactive</span></div></div>
  <svg class="fls" style="position:absolute;left:0;bottom:12px" aria-hidden="true"></svg></div><div class="rim"></div>`;
let flowRaf=0;
function updateFlow(instant){
  const FL=sl().flow,MLAB=FL.months,INC=FL.signups,SPN=FL.churned,nm=MLAB.length;
  const avg=INC[0].reduce((a,v,i)=>a+finite(v)-finite(SPN[0][i]),0)/nm;
  flow.querySelector('.flnet').innerHTML=`Net <span class="mono" style="color:${ACC}">${esc((avg>=0?'+':'−')+num(Math.abs(avg)))}</span> a month`;
  const svg=flow.querySelector('.fls'),W=flow.clientWidth,Hh=246,L=44,R=W-36,mid=Hh/2,lab=16,amp=mid-lab-8;
  const max=niceMax(Math.max(...INC.flat().map(finite),...SPN.flat().map(finite)));
  svg.setAttribute('width',W);svg.setAttribute('height',Hh);svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`);
  const X=i=>L+i/(nm-1)*(R-L);
  cancelAnimationFrame(flowRaf);const t0=instant?-1e6:performance.now();
  const frame=now=>{const g=ease(reduce?1:Math.min(1,(now-t0)/1200));
    const path=(arr,dir)=>smoothPath(arr.map((v,i)=>[X(i),mid+dir*(lab+finite(v)/max*amp*g)]));
    let s='';
    [0,max/2,max].forEach(u=>{const yT=mid-lab-u/max*amp,yB=mid+lab+u/max*amp,t=u?esc(compact(u)):'0';
      s+=`<line x1="${L}" x2="${R}" y1="${yT}" y2="${yT}" stroke="${HAIR}"/><line x1="${L}" x2="${R}" y1="${yB}" y2="${yB}" stroke="${HAIR}"/>
        <text class="m" x="${L-12}" y="${yT+3.5}" text-anchor="end" font-size="10" fill="${T3}">${t}</text><text class="m" x="${L-12}" y="${yB+3.5}" text-anchor="end" font-size="10" fill="${T3}">${t}</text>
        <line x1="${R+8}" x2="${R+14}" y1="${yT}" y2="${yT}" stroke="${T3}"/><line x1="${R+8}" x2="${R+14}" y1="${yB}" y2="${yB}" stroke="${T3}"/>`});
    MLAB.forEach((m,i)=>s+=`<text class="m" x="${X(i)}" y="${mid+4}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.75)">${esc(m)}</text>`);
    const OP=[1,.55,.3];
    for(let j=INC.length-1;j>=0;j--)s+=`<path d="${path(INC[j],-1)}" fill="none" stroke="#fff" stroke-opacity="${OP[j]||.3}" stroke-width="${j?1.6:2.4}" stroke-linecap="round"/>`;
    for(let j=SPN.length-1;j>=0;j--)s+=`<path d="${path(SPN[j],1)}" fill="none" stroke="#FFD0E6" stroke-opacity="${OP[j]||.3}" stroke-width="${j?1.6:2.4}" stroke-linecap="round"/>`;
    s+=`<line class="hl" y1="10" y2="${Hh-10}" stroke="#fff" stroke-opacity=".5" opacity="0"/><rect class="hit" x="${L-10}" width="${R-L+20}" height="${Hh}" fill="transparent"/>`;
    svg.innerHTML=s;
    const hit=svg.querySelector('.hit'),hl=svg.querySelector('.hl');
    hit.onpointermove=e=>{const r=svg.getBoundingClientRect(),z=r.width/W,x=(e.clientX-r.left)/z,i=Math.max(0,Math.min(nm-1,Math.round((x-L)/(R-L)*(nm-1))));
      hl.setAttribute('x1',X(i));hl.setAttribute('x2',X(i));hl.setAttribute('opacity',1);
      showTip(r.left+X(i)*z,r.top+(mid-lab-finite(INC[0][i])/max*amp)*z,MLAB[i]+(FL.seriesLabels[0]?' '+FL.seriesLabels[0]:''),[['Sign-ups',num(INC[0][i]),'#fff'],['Inactive',num(SPN[0][i]),'#FFD0E6'],['Net',num(finite(INC[0][i])-finite(SPN[0][i]))]])};
    hit.onpointerleave=()=>{hl.setAttribute('opacity',0);hideTip()};
    if(g<1)flowRaf=RAF(frame)};
  flowRaf=RAF(frame);
}

/* ---- Flagged lessons: shares of the week's flags with 7-day sparklines ---- */
const cr=$id('crypto');
cr.innerHTML=`${bg(GR.copper)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="ttl">Top flagged lessons</div><span class="muted">7 days</span></div>
  <div class="row" style="margin-top:14px;align-items:flex-end;justify-content:space-between"><span class="big crv">0</span><span style="padding-bottom:4px"><span class="delta crd"></span><span class="muted"> vs yesterday</span></span></div>
  <div class="crb" style="margin-top:16px"></div>
  <div class="crl" style="position:absolute;left:24px;right:24px;bottom:14px"></div></div><div class="rim"></div>`;
/* 7-day line with a soft wash; each lesson keeps its own shape */
function spark(d,gid){const W=96,H=30,lo=Math.min(...d),hi=Math.max(...d),pad=(hi-lo)*.15||1,Y=v=>H-3-(v-lo+pad)/(hi-lo+2*pad)*(H-6);
  const P=d.map((v,i)=>[2+i/(d.length-1)*(W-6),Y(v)]),e=P[P.length-1],down=d[d.length-1]<=d[0];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="flex:0 0 auto"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="${smoothPath(P)}L${e[0]},${H}L${P[0][0]},${H}Z" fill="url(#${gid})"/><path d="${smoothPath(P)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${e[0]}" cy="${e[1]}" r="3" fill="${down?ACC:'#fff'}" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>`}
function updateCrypto(){const L=data.flaggedLessons.slice(0,3).map(l=>({name:l.name,change:String(l.change??''),daily:l.daily.map(finite)}));
  const sum=l=>l.daily.reduce((x,y)=>x+y,0);
  const tot=L.reduce((a,l)=>a+sum(l),0),last=L.reduce((a,l)=>a+l.daily[l.daily.length-1],0),prev=L.reduce((a,l)=>a+l.daily[l.daily.length-2],0);
  tween(cr.querySelector('.crv'),tot,x=>num(x));cr.querySelector('.crd').textContent=(last>=prev?'↑ ':'↓ ')+num(Math.abs(last-prev));
  const sh=L.map(l=>sum(l)/Math.max(1,tot));
  /* one thin segmented bar shows the split; tones of white, no colour dots */
  cr.querySelector('.crb').innerHTML=`<div style="display:flex;gap:3px;height:6px">${sh.map((f,i)=>`<div style="flex:0 0 calc(${(f*100).toFixed(2)}% - 2px);border-radius:3px;background:rgba(255,255,255,${[.95,.6,.32][i]||.32});transform-origin:left;transform:scaleX(0);transition:transform .8s var(--ease) ${.1+i*.1}s" class="crs"></div>`).join('')}</div>
    <div style="display:flex;gap:3px;margin-top:7px">${sh.map(f=>`<span class="mono muted" style="flex:0 0 calc(${(f*100).toFixed(2)}% - 2px);font-size:11px;white-space:nowrap;overflow:hidden">${Math.round(f*100)}%</span>`).join('')}</div>`;
  RAF(()=>RAF(()=>cr.querySelectorAll('.crs').forEach(b=>b.style.transform='scaleX(1)')));
  cr.querySelector('.crl').innerHTML=L.map((l,i)=>`<div class="row" style="height:50px;${i?'border-top:1px solid rgba(255,255,255,.1)':''}">
    <div style="flex:1;min-width:0"><div class="nm" style="font-size:13.5px;font-weight:600">${esc(l.name)}</div><div class="mono muted" style="font-size:11px">flags · 7d</div></div>${spark(l.daily,'sg'+i)}
    <div style="width:64px;text-align:right"><div class="mono" style="font-size:13px">${num(sum(l))}</div><div class="mono" style="font-size:11px;color:${/^[−-]/.test(l.change)?ACC:T3}">${esc(l.change)}</div></div></div>`).join('')}

/* ---- Weekday: capsule columns of active learners ---- */
const st=$id('stocks');
st.innerHTML=`${bg(GR.green)}<div class="in-c"><div class="ttl">Active by weekday</div>
  <div style="margin-top:14px"><span class="big stv" style="font-size:34px">0</span></div><div class="row" style="margin-top:6px;gap:8px"><span class="delta stp"></span><span class="muted">busiest day</span></div>
  <svg class="sts" style="position:absolute;left:18px;bottom:14px" aria-hidden="true"></svg></div><div class="rim"></div>`;
function updateStocks(instant){const WK=sl().weekday.days,WV=sl().weekday.values.map(finite),N=WV.length,sum=WV.reduce((a,b)=>a+b,0),pk=WV.indexOf(Math.max(...WV));
  if(!instant)tween(st.querySelector('.stv'),sum,x=>num(x));
  st.querySelector('.stp').textContent=WK[pk]||'';
  const svg=st.querySelector('.sts'),W=Math.max(120,st.clientWidth-36),Hh=160,pb=18,bw=Math.max(10,Math.min(22,(W-24)/(N*1.6))),max=niceMax(Math.max(...WV)),gap=N>1?(W-24-bw*N)/(N-1):0;svg.setAttribute('width',W);svg.setAttribute('height',Hh);
  const Y=x=>(Hh-pb)*(1-x/max);let s='';
  [0,max/2,max].forEach(t=>s+=`<text class="m" x="0" y="${Y(t)+3.5}" font-size="9.5" fill="${T3}">${t?esc(compact(t)):'0'}</text>`);
  WV.forEach((x,i)=>{const X=24+i*(bw+gap);const today=i===pk;
    s+=`<rect x="${X}" y="${Y(max)}" width="${bw}" height="${Hh-pb-Y(max)}" rx="${bw/2}" fill="rgba(0,0,0,.28)"/>
      <rect class="sb" x="${X}" y="${Hh-pb}" width="${bw}" height="0" rx="${bw/2}" fill="${today?ACC:'#fff'}" data-y="${Y(x)}" data-h="${Hh-pb-Y(x)}" style="transition:y .8s var(--ease) ${i*70}ms,height .8s var(--ease) ${i*70}ms"/>
      <text class="m" x="${X+bw/2}" y="${Hh-3}" text-anchor="middle" font-size="10" fill="${today?'#fff':T3}">${esc(WK[i])}</text>
      <rect class="hit" x="${X-4}" y="0" width="${bw+8}" height="${Hh}" fill="transparent" data-i="${i}"/>`});
  svg.innerHTML=s;
  RAF(()=>RAF(()=>svg.querySelectorAll('.sb').forEach(b=>{b.setAttribute('y',b.dataset.y);b.setAttribute('height',b.dataset.h)})));
  svg.querySelectorAll('.hit').forEach(h=>{h.onpointermove=e=>{const i=+h.dataset.i;showTip(e.clientX,e.clientY,WK[i]+' · active learners',[['Active',num(WV[i]),'#fff'],['Share of week',pctOf(WV[i],sum)+'%']])};h.onpointerleave=hideTip});
}

/* ---------- controls ---------- */
function seg(host,items,key){host.innerHTML=items.map(k=>`<button type="button" aria-pressed="${S[key]===k}">${esc(k)}</button>`).join('');
  host.querySelectorAll('button').forEach(b=>b.onclick=()=>{S[key]=b.textContent;host.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));updateAll()})}
seg($id('period'),['6M','1Y','All'],'period');
seg($id('dev'),['All','Phone','Desktop'],'dev');
function updateAll(){updateNW();updateAlloc();updateRet();updateCash();updatePay();updateGoals();updateFlow();updateCrypto();updateStocks()}

let rz;const ro=new ResizeObserver(()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!nwData)return;cancelAnimationFrame(nwRaf);nwGrow=1;drawNW();updateFlow(true);updateStocks(true);updateCash();updateGoals()},120)});
['nw','flow','stocks','cash'].forEach(id=>ro.observe($id(id)));
const vbm=$id('vbm');const ON=new Set(['0,0','4,0','1,1','3,1','2,2']);
if(vbm)for(let i=0;i<15;i++){const x=i%5,y=Math.floor(i/5),e=document.createElement('i');if(ON.has(x+','+y))e.className='on';e.style.setProperty('--x',x);vbm.appendChild(e)}
const ready=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
ready.then(()=>{if(!alive)return;$id('grid').classList.add('in');
  root.querySelectorAll('.card').forEach((c,i)=>c.style.transitionDelay=(i*60)+'ms');updateAll()});

  return () => { alive = false; frames.forEach((f) => cancelAnimationFrame(f)); ro.disconnect(); clearTimeout(rz); };
}

export function FinanceBento({ data, title = "Growth", subtitle = "", credit = false, className = "", style }: FinanceBentoProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = markup({ title, subtitle, credit });
    const stop = mount(el, data);
    return () => { stop(); el.innerHTML = ""; };
  }, [data, title, subtitle, credit]);
  return (
    <>
      <style>{CSS}</style>
      <div ref={ref} className={`fpb ${className}`} style={style} />
    </>
  );
}

export default FinanceBento;
