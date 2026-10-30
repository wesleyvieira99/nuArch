// Educational calculations. They deliberately do not emulate a database/broker.
const nonnegative=(v,name)=>{if(!Number.isFinite(v)||v<0)throw new RangeError(name);return v};
const positive=(v,name)=>{nonnegative(v,name);if(v===0)throw new RangeError(name);return v};
export function quorumModel(n,r,w,reachable){
  if(![n,r,w,reachable].every(Number.isInteger)||n<1||r<1||w<1||r>n||w>n||reachable<0||reachable>n)throw new RangeError('Invalid quorum');
  return {read:reachable>=r,write:reachable>=w,readWriteIntersection:Math.max(0,r+w-n),writeWriteIntersection:Math.max(0,2*w-n),readFailures:n-r,writeFailures:n-w};
}
export function queueModel(arrival,workers,serviceMs,capacity,seconds){
  nonnegative(arrival,'arrival');nonnegative(workers,'workers');positive(serviceMs,'serviceMs');nonnegative(capacity,'capacity');positive(seconds,'seconds');
  const serviceRate=workers*1000/serviceMs,excess=Math.max(0,(arrival-serviceRate)*seconds),queued=Math.min(capacity,excess),rejected=Math.max(0,excess-capacity),processed=Math.min(arrival,serviceRate)*seconds;
  return {serviceRate,queued,rejected,processed,arrived:arrival*seconds,stable:arrival<serviceRate,fillSeconds:arrival>serviceRate?capacity/(arrival-serviceRate):Infinity,drainSeconds:serviceRate?queued/serviceRate:(queued?Infinity:0)};
}
export function cacheBurstModel(requests,instances,mode){
  if(!Number.isInteger(requests)||requests<1||!Number.isInteger(instances)||instances<1||!['none','local','coordinated'].includes(mode))throw new RangeError('Invalid cache model');
  const fetches=mode==='none'?requests:mode==='local'?Math.min(requests,instances):1;
  return {fetches,followers:requests-fetches,reduction:1-fetches/requests};
}
export function poolModel(arrival,serviceMs,size){
  nonnegative(arrival,'arrival');positive(serviceMs,'serviceMs');positive(size,'size');
  const offered=arrival*serviceMs/1000,capacity=size*1000/serviceMs;
  return {offered,capacity,utilization:offered/size,stable:arrival<capacity};
}
export function tokenBucketModel(rate,capacity,burst,steady,seconds=10){
  [rate,capacity,burst,steady].forEach((v,i)=>nonnegative(v,['rate','capacity','burst','steady'][i]));
  if(!Number.isInteger(seconds)||seconds<1)throw new RangeError('seconds');
  let tokens=capacity;const rows=[];
  for(let t=0;t<=seconds;t++){if(t)tokens=Math.min(capacity,tokens+rate);const incoming=t?steady:burst,accepted=Math.min(tokens,incoming);tokens-=accepted;rows.push({t,incoming,accepted,rejected:incoming-accepted,tokens})}
  return rows;
}
