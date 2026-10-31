import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {routeDiagram} from '../playbook-routing.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('../data/playbook.json',import.meta.url),'utf8')).cases;
const failures=[],measurements=[];let edgeCount=0,states=0,labelsOmitted=0;
const eps=1e-6;
function cross(a,b,n){
 const l=n.x-78,r=n.x+78,t=n.y-41,bt=n.y+41;
 if(Math.abs(a.x-b.x)<eps)return a.x>l+eps&&a.x<r-eps&&Math.max(a.y,b.y)>t+eps&&Math.min(a.y,b.y)<bt-eps;
 if(Math.abs(a.y-b.y)<eps)return a.y>t+eps&&a.y<bt-eps&&Math.max(a.x,b.x)>l+eps&&Math.min(a.x,b.x)<r-eps;
 return true;
}
function validate(nodes,edges,context){
 for(const e of edges){
  if(e.error){failures.push({context,edge:e.from+'→'+e.to,error:e.error});continue;}
  edgeCount++;if(!e.labelPoint)labelsOmitted++;
  if(e.points.length<2)failures.push({context,error:'Insufficient points'});
  e.points.forEach(p=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1000||p.y<0||p.y>620)failures.push({context,error:'Point outside viewBox',p});});
  for(let i=1;i<e.points.length;i++){
   const a=e.points[i-1],b=e.points[i];
   if(Math.abs(a.x-b.x)>eps&&Math.abs(a.y-b.y)>eps)failures.push({context,error:'Diagonal segment'});
   for(const n of nodes){
    if((i===1&&n.id===e.from)||(i===e.points.length-1&&n.id===e.to))continue;
    if(cross(a,b,n))failures.push({context,edge:e.from+'→'+e.to,error:'Obstacle intersection',node:n.id,a,b});
   }
  }
  if(e.labelPoint){
   const p=e.labelPoint,w=e.labelMaxWidth;
   for(const n of nodes)if(p.x-w/2<n.x+78&&p.x+w/2>n.x-78&&p.y-14<n.y+41&&p.y+3>n.y-41)failures.push({context,edge:e.from+'→'+e.to,error:'Label intersects node',node:n.id});
  }
 }
}
for(const c of cases){
 for(let step=0;step<10;step++){
  const nodes=c.nodes.filter(n=>n.firstStep<=step),ids=new Set(nodes.map(n=>n.id));
  const edges=c.edges.filter(e=>e.firstStep<=step&&(e.lastStep==null||step<=e.lastStep)&&ids.has(e.from)&&ids.has(e.to));
  const before=JSON.stringify({nodes,edges}),t=performance.now(),r=routeDiagram(nodes,edges),ms=performance.now()-t;
  measurements.push({caseId:c.id,step,nodes:nodes.length,edges:edges.length,ms:Number(ms.toFixed(3))});states++;validate(nodes,r,c.id+':'+step);
  if(before!==JSON.stringify({nodes,edges}))failures.push({context:c.id+':'+step,error:'Input mutated'});
 }
}
// Warm benchmark avoids confusing JS startup compilation with every render.
const finalBench=[];
for(const c of cases){
 const nodes=c.nodes,edges=c.edges.filter(e=>e.lastStep==null||e.lastStep>=9),times=[];
 for(let i=0;i<15;i++){const t=performance.now();routeDiagram(nodes,edges);times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);finalBench.push({caseId:c.id,medianMs:Number(times[7].toFixed(3)),p95Ms:Number(times[14].toFixed(3))});
}
const stressNodes=Array.from({length:12},(_,i)=>({id:'s'+i,x:100+(i%4)*220+Math.floor(i/4)*4,y:90+Math.floor(i/4)*200+(i%4)*5}));
const stressEdges=Array.from({length:15},(_,i)=>({from:'s'+(i%12),to:'s'+((i*5+7)%12),label:'stress '+i}));
const st=performance.now();const stress=routeDiagram(stressNodes,stressEdges);const stressMs=performance.now()-st;validate(stressNodes,stress,'stress12');
const blocked=routeDiagram([{id:'a',x:100,y:100},{id:'b',x:100,y:100}],[{from:'a',to:'b'}]);
if(!blocked[0].error||blocked[0].points.length)failures.push({context:'blocked',error:'Failed route must return error, never unsafe line'});
const missing=routeDiagram([{id:'a',x:100,y:100}],[{from:'a',to:'absent'}]);
if(missing[0].error?.code!=='MISSING_ENDPOINT')failures.push({context:'missing',error:'Missing endpoint not reported'});
const selfNodes=[{id:'a',x:100,y:100}];validate(selfNodes,routeDiagram(selfNodes,[{from:'a',to:'a'}]),'self-loop');
const result={caseCount:cases.length,caseIds:cases.map(c=>c.id),stepStates:states,routedEdgesValidated:edgeCount,labelsOmitted,failures,firstPassMaxMs:Math.max(...measurements.map(x=>x.ms)),finalBench,stress:{nodes:12,edges:15,ms:Number(stressMs.toFixed(3))},measurements,notes:['Margins are tested against expanded 140×66 rectangles plus 8px.','Only the terminal segment may cross its own node clearance; other node clearance is always enforced.','No browser drawing or font measurement is implied by this geometric test.']};

console.log(JSON.stringify({caseCount:cases.length,stepStates:states,routedEdgesValidated:edgeCount,labelsOmitted,failures,status:failures.length?'FAIL':'PASS'},null,2));
if(failures.length)process.exitCode=1;
