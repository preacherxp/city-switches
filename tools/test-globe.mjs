import assert from 'node:assert/strict';
import { projectCoordinates, clusterPoints } from '../globe.mjs';
for(const [lat,lon] of [[0,0],[50.32492,18.78576],[38.72509,-9.1498],[90,0],[-90,180]]){
  const p=projectCoordinates(lat,lon,-lon*Math.PI/180,lat*Math.PI/180);
  assert.ok(Math.abs(p.x)<1e-10&&Math.abs(p.y)<1e-10&&Math.abs(p.z-1)<1e-10);
}
assert.equal(projectCoordinates(0,180,0,0).z,-1);
assert.deepEqual(clusterPoints([{x:0,y:0},{x:20,y:0},{x:40,y:0},{x:100,y:0}],25).map(g=>g.length),[3,1]);
assert.deepEqual(clusterPoints([],25),[]);
console.log('Globe projection, poles, back hemisphere and transitive clustering passed.');
