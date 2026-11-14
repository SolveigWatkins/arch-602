(function () {
  const stage = document.getElementById('stage');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f1e7');
  const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
  let renderer, fallback = false;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (error) {
    fallback = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    renderer = {
      domElement: canvas,
      setPixelRatio: function () {},
      setSize: function (w, h) { canvas.width = Math.max(1, Math.floor(w)); canvas.height = Math.max(1, Math.floor(h)); canvas.style.width = '100%'; canvas.style.height = '100%'; },
      render: function () { drawFallback(ctx, canvas.width, canvas.height); }
    };
  }
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x77756d, 2.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-8, 14, 10);
  key.castShadow = true;
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const grid = new THREE.GridHelper(34, 34, 0xb5b4ad, 0xd3d2cc);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.48;
  scene.add(grid);
  const model = new THREE.Group();
  const markers = new THREE.Group();
  scene.add(model, markers);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const config = {
    museum: { w: 10, d: 8, h: 4.5, name: 'Museum', floors: 1 }
  };
  let state = { building: 'museum', view: 'iso', behaviors: [], points: [], selected: null, selectedFragment: null, selectedBasePanel: null, selectedFragmentPanel: null, foldTargets: [], selectedFoldTarget: null, foldTargetsByPanel: {}, foldSettingsByTarget: {}, fragmentLevels: {}, fragmentLevel: 0, fragmentHinges: {}, dragging: null, intensity: 65, stickiness: 55, foldDirection: 'inward', foldEdge: 'top', centerHinge: false, centerAxis: 'vertical', activeOperation: null };

  function drawFallback(ctx, width, height) {
    if (!ctx || !width || !height) return;
    const sx = Math.min(width / 24, height / 17), b = config[state.building], cx = width * .5, cy = height * .58;
    const iso = state.view !== 'plan';
    function project(x, y, z) { return iso ? [cx + (x - z) * sx * .72, cy + (x + z) * sx * .38 - y * sx * .9] : [cx + x * sx, cy + z * sx]; }
    function polygon(points, fill, stroke, lineWidth) {
      ctx.beginPath(); points.forEach(function (p, i) { const q = project(p[0], p[1], p[2]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
    }
    function line(points, color, width, dash) { ctx.beginPath(); points.forEach(function (p, i) { const q = project(p[0], p[1], p[2]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); }    function transformIntersectPanel(points,key){if(!state.behaviors.includes('intersect'))return points;const type=String(key||''),xs=points.map(function(p){return p[0];}),zs=points.map(function(p){return p[2];}),cx=xs.reduce(function(a,b){return a+b/xs.length;},0),cz=zs.reduce(function(a,b){return a+b/zs.length;},0),axis=(Math.max.apply(null,xs)-Math.min.apply(null,xs))<(Math.max.apply(null,zs)-Math.min.apply(null,zs))?'x':'z',plane=axis==='x'?cx:cz,rate=type.indexOf('fallback-partition')>=0?1:.68,extent=axis==='x'?config[state.building].w/2:config[state.building].d/2,distance=extent*rate*state.intensity/100,direction=plane>=0?-1:1;return points.map(function(p){return axis==='x'?[p[0]+direction*distance,p[1],p[2]]:[p[0],p[1],p[2]+direction*distance];});}
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#f5f1e7'; ctx.fillRect(0, 0, width, height);
    // Fixed drafting grid, projected in the current view.
    for (let i = -18; i <= 18; i++) { line([[-18, 0, i], [18, 0, i]], '#d2ccbf', .65); line([[i, 0, -18], [i, 0, 18]], '#d2ccbf', .65); }
    const x0 = -b.w/2, x1 = b.w/2, z0 = -b.d/2, z1 = b.d/2, h = b.h;
    polygon([[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]], '#f2f0e9', '#343530', 1.5);
    function wall(axis, plane, a0, a1, sign) {
      const base = axis === 'z' ? [[a0,0,plane],[a1,0,plane],[a1,h,plane],[a0,h,plane]] : [[plane,0,a0],[plane,0,a1],[plane,h,a1],[plane,h,a0]];
      const foldPoint=state.points.find(function(p){return p.behavior==='folding';}), fragmentPoint=state.points.find(function(p){return p.behavior==='fragmentation';});
      if(state.behaviors.includes('folding')){
        const width=(a1-a0)/3,entries=[];
        for(let panelIndex=0;panelIndex<3;panelIndex++){const u0=a0+width*panelIndex,u1=u0+width,key=basePanelKey({face:'exterior',axis:axis,plane:plane,panelIndex:panelIndex}),isCurrent=state.selectedBasePanel&&state.selectedBasePanel.axis===axis&&state.selectedBasePanel.plane===plane&&state.selectedBasePanel.panelIndex===panelIndex,level=isCurrent?state.fragmentLevel:(state.fragmentLevels[key]||0),isTarget=level>0,result=isTarget?fragmentPolygons(u0,u1,h,level,axis+':'+plane+':'+panelIndex):{polygons:[[{x:u0,y:-h/2},{x:u1,y:-h/2},{x:u1,y:h/2},{x:u0,y:h/2}]]};result.polygons.forEach(function(poly,pieceIndex){entries.push({poly:poly,panelIndex:panelIndex,pieceIndex:pieceIndex,id:'exterior:'+axis+':'+plane.toFixed(2)+':'+panelIndex+':'+pieceIndex});});}
        let pairHinge=null,pairAmount=0;const chosen=entries.filter(function(entry){return state.foldTargets.includes(entry.id);});if(chosen.length===2&&sharedPanelEdge(chosen[0].poly,chosen[1].poly)){let best=-Infinity;chosen.forEach(function(entry){entries.forEach(function(other){if(state.foldTargets.includes(other.id))return;const edge=sharedPanelEdge(entry.poly,other.poly);if(edge){const size=Math.hypot(edge[1].x-edge[0].x,edge[1].y-edge[0].y);if(size>best){best=size;pairHinge=edge;}}});});const centers=chosen.map(function(entry){return entry.poly.reduce(function(a,p){return [a[0]+p.x/entry.poly.length,a[1]+p.y/entry.poly.length];},[0,0]);}),mid=axis==='z'?new THREE.Vector3((centers[0][0]+centers[1][0])/2,(centers[0][1]+centers[1][1])/2+h/2,plane):new THREE.Vector3(plane,(centers[0][1]+centers[1][1])/2+h/2,(centers[0][0]+centers[1][0])/2);pairAmount=foldAngleAt(foldPoint,mid.x,mid.y,mid.z);}
        entries.forEach(function(entry){let points=entry.poly.map(function(p){return axis==='z'?new THREE.Vector3(p.x,p.y+h/2,plane):new THREE.Vector3(plane,p.y+h/2,p.x);}),shouldFold=state.foldTargets.includes(entry.id);if(shouldFold&&foldPoint){let anchor=pairHinge,best=-Infinity;if(!anchor)entries.forEach(function(other){if(state.foldTargets.includes(other.id))return;const edge=sharedPanelEdge(entry.poly,other.poly);if(edge){const score=Math.hypot(edge[1].x-edge[0].x,edge[1].y-edge[0].y);if(score>best){best=score;anchor=edge;}}});if(anchor){const start=axis==='z'?new THREE.Vector3(anchor[0].x,anchor[0].y+h/2,plane):new THREE.Vector3(plane,anchor[0].y+h/2,anchor[0].x),end=axis==='z'?new THREE.Vector3(anchor[1].x,anchor[1].y+h/2,plane):new THREE.Vector3(plane,anchor[1].y+h/2,anchor[1].x),center=points.reduce(function(sum,q){return sum.add(q.clone().multiplyScalar(1/points.length));},new THREE.Vector3()),amount=pairHinge?pairAmount:foldAngleAt(foldPoint,center.x,center.y,center.z),direction=state.foldDirection==='inward'?(axis==='z'?-Math.sign(plane||1):Math.sign(plane||1)):(axis==='z'?Math.sign(plane||1):-Math.sign(plane||1)),angle=direction*amount;points=points.map(function(q){return rotateAroundEdge(q,start,end,angle);});}}polygon(points.map(function(q){return [q.x,q.y,q.z];}),shouldFold?'rgba(217,50,50,.76)':'rgba(247,246,241,.78)','#292a27',1.2);});
        return;
      }
      if (!fragmentPoint) { if(state.behaviors.includes('intersect')){const segment=(a1-a0)/3;for(let panelIndex=0;panelIndex<3;panelIndex++){const u0=a0+segment*panelIndex,u1=u0+segment,surface={axis:axis,plane:plane,face:'exterior',panelIndex:panelIndex,panelCount:3,len:segment,height:h},pts=axis==='z'?[[u0,0,plane],[u1,0,plane],[u1,h,plane],[u0,h,plane]]:[[plane,0,u0],[plane,0,u1],[plane,h,u1],[plane,h,u0]],transformed=transformIntersectPoints(pts.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}),surface).map(function(p){return [p.x,p.y,p.z];});polygon(transformed,'rgba(247,246,241,.78)','#292a27',1.7);}return;}polygon(transformIntersectPanel(base,'fallback-envelope-'+axis+'-'+plane.toFixed(2)), 'rgba(247,246,241,.78)', '#292a27', 1.7);for(let i=1;i<3;i++){const u=a0+(a1-a0)*i/3,seam=axis==='z'?[[u,0,plane+.012],[u,h,plane+.012]]:[[plane+.012,0,u],[plane+.012,h,u]];line(seam,'rgba(41,42,39,.62)',1.2);}return; }
      const target = 6.2;
      const cols = fragmentPoint ? Math.max(1, Math.min(18, Math.ceil((a1-a0)/target))) : 5;
      const rows = fragmentPoint ? Math.max(1, Math.min(14, Math.ceil(h/target))) : 3;
      const xEdges=Array.from({length:cols+1},function(_,i){return a0+(a1-a0)*i/cols;}), yEdges=Array.from({length:rows+1},function(_,i){return h*i/rows;});
      if(fragmentPoint){for(let i=1;i<cols;i++)xEdges[i]+=(Math.sin(i*12.9898+(axis==='x'?8:3))-.5)*target*.48;for(let i=1;i<rows;i++)yEdges[i]+=(Math.sin(i*7.233+4.7)-.5)*target*.48;}
      for (let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
        const u0=xEdges[c], u1=xEdges[c+1], y0=yEdges[r], y1=yEdges[r+1];
        const center=axis==='z'?[ (u0+u1)/2,(y0+y1)/2,plane ]:[plane,(y0+y1)/2,(u0+u1)/2];
        const amount=foldPoint?influence(foldPoint,center[0],center[1],center[2]):0, fragmentAmount=fragmentPoint?influence(fragmentPoint,center[0],center[1],center[2]):0;
        if (fragmentPoint && fragmentAmount > .1) {
          if (fragmentAmount > .15 && (r+c)%4===0) continue;
          const jitter=(r*3+c*5)%4, inset=(u1-u0)*(.04+jitter*.045), quad=axis==='z'?[[u0+inset,y0,plane],[u1-inset*.5,y0,plane],[u1,y1-(y1-y0)*.08,plane],[u0,y1,plane]]:[[plane,y0,u0+inset],[plane,y0,u1-inset*.5],[plane,y1,u1],[plane,y1-(y1-y0)*.08,u0]];
          if(foldPoint&&amount>.12){const hinge={bottom:0,right:1,top:2,left:3}[state.foldEdge],direction=state.foldDirection==='inward'?(axis==='z'?-Math.sign(plane||1):Math.sign(plane||1)):(axis==='z'?Math.sign(plane||1):-Math.sign(plane||1)),lift=Math.sin(foldAngleAt(foldPoint,center[0],center[1],center[2]))*((y1-y0)*.9+fragmentAmount*.7)*direction,a=(hinge+2)%4,b=(hinge+3)%4;[a,b].forEach(function(i){if(axis==='z')quad[i][2]+=lift;else quad[i][0]+=lift;});if(state.centerHinge){const cx=quad.reduce(function(s,p){return s+p[0]/4;},0),cy=quad.reduce(function(s,p){return s+p[1]/4;},0),cz=quad.reduce(function(s,p){return s+p[2]/4;},0),theta=-foldAngleAt(foldPoint,center[0],center[1],center[2])*direction,cos=Math.cos(theta),sin=Math.sin(theta);quad.forEach(function(p){if(state.centerAxis==='vertical'){const dx=p[0]-cx,dz=p[2]-cz;p[0]=cx+dx*cos+dz*sin;p[2]=cz-dx*sin+dz*cos;}else{const dx=p[0]-cx,dy=p[1]-cy;p[0]=cx+dx*cos-dy*sin;p[1]=cy+dx*sin+dy*cos;}});}}
          polygon(transformIntersectPanel(quad,'fallback-fragment-'+axis+'-'+plane.toFixed(2)+'-'+c+'-'+r), '#e8e4da', '#292a27', 1.1);
        } else {
          const quad=axis==='z'?[[u0,y0,plane],[u1,y0,plane],[u1,y1,plane],[u0,y1,plane]]:[[plane,y0,u0],[plane,y0,u1],[plane,y1,u1],[plane,y1,u0]];
          polygon(transformIntersectPanel(quad,'fallback-panel-'+axis+'-'+plane.toFixed(2)+'-'+c+'-'+r), 'rgba(247,246,241,.76)', '#292a27', 1.1);
        }
      }
    }
    wall('z',z0,x0,x1,-1); wall('x',x0,z0,z1,-1); wall('z',z1,x0,x1,1); wall('x',x1,z0,z1,1);
    const selectedPanel=state.activeOperation==='fragmentation'&&state.selectedBasePanel;if(selectedPanel){const total=selectedPanel.axis==='z'?b.w:b.d,len=total/(selectedPanel.panelCount||3),u0=-total/2+len*selectedPanel.panelIndex,u1=u0+len,plane=selectedPanel.plane,axis=selectedPanel.axis,offset=Math.sign(plane||1)*.035,pts=axis==='z'?[[u0,0,plane+offset],[u1,0,plane+offset],[u1,b.h,plane+offset],[u0,b.h,plane+offset]]:[[plane+offset,0,u0],[plane+offset,0,u1],[plane+offset,b.h,u1],[plane+offset,b.h,u0]];polygon(pts,'rgba(217,50,50,.5)','#252623',1.5);const cuts=fragmentPolygons(u0,u1,b.h,state.fragmentLevel,axis+':'+plane+':'+selectedPanel.panelIndex).cuts;cuts.forEach(function(cut){const seam=axis==='z'?[[cut[0].x,cut[0].y+b.h/2,plane+offset*1.1],[cut[1].x,cut[1].y+b.h/2,plane+offset*1.1]]:[[plane+offset*1.1,cut[0].y+b.h/2,cut[0].x],[plane+offset*1.1,cut[1].y+b.h/2,cut[1].x]];line(seam,'#080807',5);});}
    const w=b.w,d=b.d,walls=[[.13,3.2,d*.56,0,1.6,-.15],[w*.35,2.8,.13,w*.22,1.4,.25]];
    walls.forEach(function(v,index){const x=v[3],y=v[4],z=v[5],ex=v[0]/2,ez=v[2]/2;polygon(transformIntersectPanel([[x-ex,y-v[1]/2,z-ez],[x+ex,y-v[1]/2,z-ez],[x+ex,y+v[1]/2,z+ez],[x-ex,y+v[1]/2,z+ez]],'fallback-partition-'+index),'rgba(190,188,180,.72)','#454640',1.2);});
  }

  function clear(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
      });
    }
  }
  function material(color, opacity, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, transparent: opacity < 1, opacity: opacity, roughness: 0.92, side: THREE.DoubleSide, depthWrite: opacity >= 0.35 }, extra || {}));
  }
  function hingeColor(edge, selected) { const colors={top:['#c84e42','#e36f5f'],right:['#4b8794','#61a9bb'],bottom:['#bd8830','#dfa943'],left:['#75628e','#9a81b7']};return (colors[edge]||['#aaa89f','#d1cfc5'])[selected?1:0]; }
  function seeded(seed) {
    let n = (seed >>> 0) || 1;
    return function () { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
  }
  function hash(value) { let h = 2166136261; for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619); return h >>> 0; }
  function worldPoint(p) { return { x: p.x, y: p.height || 0.25, z: p.z }; }
  function activateFallback() { fallback=true;const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');renderer={domElement:canvas,setPixelRatio:function(){},setSize:function(w,h){canvas.width=Math.max(1,Math.floor(w));canvas.height=Math.max(1,Math.floor(h));canvas.style.width='100%';canvas.style.height='100%';},render:function(){drawFallback(ctx,canvas.width,canvas.height);}};stage.replaceChildren(canvas);renderer.setSize(stage.clientWidth||800,stage.clientHeight||540); }
  function influence(p, x, y, z) {
    if (!p.on) return 0;
    const q = worldPoint(p), r = Math.max(0.6, p.radius || 3.2), d = Math.hypot(x - q.x, y - q.y, z - q.z);
    if (d >= r) return 0;
    const edge = 1 - d / r;
    return edge * edge * (p.intensity || 0) / 100;
  }
  function foldAngleAt(p,x,y,z,intensity){const strength=Math.max(0,Math.min(1,(intensity===undefined?state.intensity:intensity)/100));if(!strength)return 0;const pointStrength=Math.max(.0001,(p&&p.intensity||state.intensity)/100),spatial=Math.max(0,Math.min(1,influence(p,x,y,z)/pointStrength));return (Math.PI*2/3)*strength*spatial;}
  function intersectPanelCenter(surface){const b=config[state.building],count=surface.panelCount||(surface.face==='interior'?1:3),len=surface.len||((surface.axis==='z'?b.w:b.d)/count),u=-len*count/2+len*(surface.panelIndex+.5);return surface.axis==='z'?{x:u,y:b.h/2,z:surface.plane}:{x:surface.plane,y:b.h/2,z:u};}
  function stickyFoldCarry(surface){const result={x:0,z:0};if(surface.face!=='interior'||!state.behaviors.includes('folding')||!state.stickiness)return result;const b=config[state.building],maxAngle=Math.PI*2/3,scale=state.stickiness/100;Object.keys(state.foldSettingsByTarget).forEach(function(key){if(key.indexOf('exterior:')!==0)return;const match=key.match(/^exterior:([xz]):(-?[\d.]+):(\d+):(\d+)$/);if(!match)return;const axis=match[1],plane=+match[2],settings=state.foldSettingsByTarget[key],angle=Math.max(0,Math.min(maxAngle,settings.angle===undefined?maxAngle*(settings.intensity||0)/100:settings.angle));if(!angle)return;const inward=axis==='z'?-Math.sign(plane||1):Math.sign(plane||1),direction=settings.direction==='outward'?-inward:inward,distance=(axis==='x'?b.w:b.d)*.12*Math.sin(angle)*scale;if(surface.axis==='x')result.x+=direction*distance;else result.z+=direction*distance;});const limit=(surface.axis==='x'?b.w:b.d)*.28;if(surface.axis==='x')result.x=Math.max(-limit,Math.min(limit,result.x));else result.z=Math.max(-limit,Math.min(limit,result.z));return result;}
  function intersectTransformFor(surface){const result={x:0,y:0,z:0,yaw:0};if(state.behaviors.includes('intersect')){const b=config[state.building],panelRates=[.52,.68,.84],surfaceRate=surface.face==='interior'?1:panelRates[surface.panelIndex||0],extent=surface.axis==='x'?b.w/2:b.d/2,direction=surface.plane>=0?-1:1,distance=extent*surfaceRate*state.intensity/100;if(surface.axis==='x')result.x=direction*distance;else result.z=direction*distance;}const carry=stickyFoldCarry(surface);result.x+=carry.x;result.z+=carry.z;return result;}
  function addStickyBridge(original,moved,key){if(!original||!moved||original.length!==moved.length||state.stickiness<=0)return;let travel=0;for(let i=0;i<original.length;i++)travel+=original[i].distanceTo(moved[i]);if(travel<.015)return;const positions=[],outlinePositions=[];for(let i=0;i<original.length;i++){const j=(i+1)%original.length;positions.push(original[i].x,original[i].y,original[i].z,original[j].x,original[j].y,original[j].z,moved[j].x,moved[j].y,moved[j].z,original[i].x,original[i].y,original[i].z,moved[j].x,moved[j].y,moved[j].z,moved[i].x,moved[i].y,moved[i].z);outlinePositions.push(original[i].x,original[i].y,original[i].z,original[j].x,original[j].y,original[j].z,original[j].x,original[j].y,original[j].z,moved[j].x,moved[j].y,moved[j].z,moved[j].x,moved[j].y,moved[j].z,moved[i].x,moved[i].y,moved[i].z,moved[i].x,moved[i].y,moved[i].z,original[i].x,original[i].y,original[i].z);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new THREE.MeshBasicMaterial({color:0xc9685f,transparent:true,opacity:.12+.48*state.stickiness/100,side:THREE.DoubleSide,depthWrite:false});const bridge=new THREE.Mesh(geometry,material);bridge.userData.stickyBridge=key||true;bridge.raycast=function(){};model.add(bridge);const outlineGeometry=new THREE.BufferGeometry();outlineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(outlinePositions,3));const outline=new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:0x8f3934,transparent:true,opacity:.12+.48*state.stickiness/100}));outline.raycast=function(){};model.add(outline);}
  function transformIntersectPoints(points,surface){const transform=intersectTransformFor(surface);if(!transform.x&&!transform.y&&!transform.z&&!transform.yaw)return points;const origin=intersectPanelCenter(surface),center=new THREE.Vector3(origin.x,origin.y,origin.z),cos=Math.cos(transform.yaw),sin=Math.sin(transform.yaw);return points.map(function(point){const x=point.x-center.x,z=point.z-center.z;return new THREE.Vector3(center.x+x*cos+z*sin+transform.x,point.y+transform.y,center.z-x*sin+z*cos+transform.z);});}
  function matchedPoints(x, y, z, behavior) { return state.points.filter(function (p) { return p.behavior === behavior && influence(p, x, y, z) > 0.025; }); }
  function cellSeed(p, i, j) { return hash(p.id + ':' + i + ':' + j); }
  function transformPoint(axis, plane, u, v, normal) {
    return axis === 'z' ? new THREE.Vector3(u, v, plane + normal) : new THREE.Vector3(plane + normal, v, u);
  }
  function drawPolygon(group, points, fill, opacity, edge, offsetFn) {
    const center = points.reduce(function (a, b) { return [a[0] + b[0] / points.length, a[1] + b[1] / points.length]; }, [0, 0]);
    const position = [], indices = [], linePoints = [];
    function mapped(i,p){const value=offsetFn?offsetFn(i,p):0;return Array.isArray(value)?value:[p[0]-center[0],p[1]-center[1],value];}
    points.forEach(function (p, i) { const v=mapped(i,p);position.push(v[0],v[1],v[2]);linePoints.push(new THREE.Vector3(v[0],v[1],v[2])); });
    const centerIndex = points.length, centerValue = mapped(-1,center);
    position.push(centerValue[0],centerValue[1],centerValue[2]);
    for (let i = 0; i < points.length; i++) indices.push(i, (i + 1) % points.length, centerIndex);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = material(fill, opacity, { flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    const tile = new THREE.Group();
    tile.position.set(center[0], center[1], 0);
    tile.add(mesh);
    if (edge) {
      linePoints.push(linePoints[0].clone());
      tile.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineBasicMaterial({ color: 0x222320, transparent: true, opacity: 0.94 })));
      if(offsetFn&&offsetFn.centerPivot){const xs=points.map(function(p){return p[0];}),ys=points.map(function(p){return p[1];}),line=offsetFn.centerAxis==='horizontal'?[new THREE.Vector3(Math.min.apply(null,xs),0,0),new THREE.Vector3(Math.max.apply(null,xs),0,0)]:[new THREE.Vector3(0,Math.min.apply(null,ys),0),new THREE.Vector3(0,Math.max.apply(null,ys),0)];tile.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line),new THREE.LineBasicMaterial({color:0x222320,transparent:true,opacity:.8})));}
    }
    group.add(tile);
    return { tile: tile, center: center, points: points };
  }
  function surfaceTile(axis, plane, poly, fill, opacity, edge, offsetFn, shift, fragmentId) {
    const center = poly.reduce(function (a, p) { return [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length]; }, [0, 0]);
    const g = new THREE.Group(), local = poly.map(function (p) { return [p[0] - center[0], p[1] - center[1]]; });
    if(fragmentId){g.userData.fragmentId=fragmentId;g.userData.isFragment=true;}
    shift = shift || { u: 0, v: 0, n: 0 };
    g.position.copy(transformPoint(axis, plane, center[0] + shift.u, center[1] + shift.v, shift.n)); g.position.add(new THREE.Vector3(shift.dx || 0, shift.dy || 0, shift.dz || 0)); g.rotation.set(shift.rx || 0, shift.ry || 0, shift.rz || 0);
    if (axis === 'x') g.rotation.y += -Math.PI / 2;
    drawPolygon(g, local, fill, opacity, edge, offsetFn);
    model.add(g);
    return g;
  }
  function fragmentPolygons(x0,x1,height,level,key){
    const polygons=[[{x:x0,y:-height/2},{x:x1,y:-height/2},{x:x1,y:height/2},{x:x0,y:height/2}]],cuts=[],random=seeded(hash(key));
    function area(poly){let value=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];value+=a.x*b.y-b.x*a.y;}return Math.abs(value/2);}
    function clip(poly,nx,ny,offset,keepLess){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.x*nx+a.y*ny-offset,db=b.x*nx+b.y*ny-offset,insideA=keepLess?da<=1e-7:da>=-1e-7,insideB=keepLess?db<=1e-7:db>=-1e-7;if(insideA)out.push(a);if(insideA!==insideB){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return out;}
    for(let cutIndex=0;cutIndex<level;cutIndex++){
      let target=0;for(let i=1;i<polygons.length;i++)if(area(polygons[i])>area(polygons[target]))target=i;
      const poly=polygons[target],angle=(.12+random()*.76)*Math.PI,nx=Math.cos(angle),ny=Math.sin(angle),values=poly.map(p=>p.x*nx+p.y*ny),min=Math.min.apply(null,values),max=Math.max.apply(null,values),offset=min+(max-min)*(.28+random()*.44),left=clip(poly,nx,ny,offset,true),right=clip(poly,nx,ny,offset,false);
      const intersections=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.x*nx+a.y*ny-offset,db=b.x*nx+b.y*ny-offset;if(da*db<0){const t=da/(da-db);intersections.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}
      if(left.length<3||right.length<3||intersections.length!==2)continue;
      polygons.splice(target,1,left,right);cuts.push(intersections);
    }
    return {polygons:polygons,cuts:cuts};
  }
  function wallSlab(group, axis, plane, len, height, opacity, displacement, face) {
    const baseCount=face==='exterior'?3:1,selected=state.activeOperation==='fragmentation'&&state.selectedBasePanel&&state.selectedBasePanel.axis===axis&&state.selectedBasePanel.plane===plane&&state.selectedBasePanel.face===face?state.selectedBasePanel.panelIndex:-1;
    const segmentLen=len/baseCount,u=displacement?displacement.u:0,v=displacement?displacement.v:0,n=displacement?displacement.n:0;
    function addEdge(mesh,geo,isSelected,highlightColor){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:isSelected?(highlightColor||0xd93232):0x31322e,transparent:true,opacity:isSelected?.82:.48}));edge.position.copy(mesh.position);edge.rotation.copy(mesh.rotation);edge.raycast=function(){};group.add(edge);}
    for(let panelIndex=0;panelIndex<baseCount;panelIndex++){
      const x0=-len/2+segmentLen*panelIndex,x1=x0+segmentLen,basePanelSurface={axis:axis,plane:plane,len:segmentLen,height:height,face:face,panelIndex:panelIndex,panelCount:baseCount},intersectionTransform=intersectTransformFor(basePanelSurface);
      if(state.behaviors.includes('intersect')||face==='interior'&&state.behaviors.includes('folding')){const originalQuad=axis==='z'?[new THREE.Vector3(x0,0,plane),new THREE.Vector3(x1,0,plane),new THREE.Vector3(x1,height,plane),new THREE.Vector3(x0,height,plane)]:[new THREE.Vector3(plane,0,x0),new THREE.Vector3(plane,0,x1),new THREE.Vector3(plane,height,x1),new THREE.Vector3(plane,height,x0)],movedQuad=originalQuad.map(function(p){return p.clone().add(new THREE.Vector3(intersectionTransform.x,intersectionTransform.y,intersectionTransform.z));});addStickyBridge(originalQuad,movedQuad,face+':'+axis+':'+plane+':'+panelIndex);}
      if(panelIndex===selected){
        const result=fragmentPolygons(x0,x1,height,state.fragmentLevel,axis+':'+plane+':'+panelIndex),pieces=result.polygons;
        for(let row=0;row<pieces.length;row++){
          const poly=pieces[row],shape=new THREE.Shape();shape.moveTo(poly[0].x,poly[0].y);for(let j=1;j<poly.length;j++)shape.lineTo(poly[j].x,poly[j].y);shape.closePath();
          const geo=new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false,steps:1});geo.translate(0,0,-.065);
          const active=state.selectedFragmentPanel&&state.selectedFragmentPanel.index===row,mesh=new THREE.Mesh(geo,material('#f4f2eb',opacity));
          mesh.position.set(axis==='z'?0:plane,height/2,axis==='z'?plane:0);mesh.position.add(new THREE.Vector3(intersectionTransform.x,intersectionTransform.y,intersectionTransform.z));if(axis==='x')mesh.rotation.y=-Math.PI/2;mesh.rotation.y+=intersectionTransform.yaw;
          mesh.userData.basePanelSurface=basePanelSurface;if(state.fragmentLevel>0)mesh.userData.fragmentPanel={axis:axis,plane:plane,face:face,basePanelIndex:panelIndex,index:row,count:pieces.length};mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);addEdge(mesh,geo,active);
        }
      } else {
        const geo=new THREE.BoxGeometry(axis==='z'?segmentLen:.13,height,axis==='x'?segmentLen:.13),mesh=new THREE.Mesh(geo,material('#f4f2eb',opacity));
        mesh.position.copy(transformPoint(axis,plane,(x0+x1)/2+u,height/2+v,n));mesh.position.add(new THREE.Vector3(intersectionTransform.x,intersectionTransform.y,intersectionTransform.z));if(displacement){mesh.position.add(new THREE.Vector3(displacement.dx||0,displacement.dy||0,displacement.dz||0));mesh.rotation.set(displacement.rx||0,displacement.ry||0,displacement.rz||0);}mesh.rotation.y+=intersectionTransform.yaw;
        mesh.userData.basePanelSurface=basePanelSurface;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);addEdge(mesh,geo,false);
      }
    }
  }
  function sharedPanelEdge(a,b){const epsilon=1e-4;for(let i=0;i<a.length;i++){const p=a[i],q=a[(i+1)%a.length],dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);if(length<epsilon)continue;const ux=dx/length,uy=dy/length;for(let j=0;j<b.length;j++){const r=b[j],t=b[(j+1)%b.length],ex=t.x-r.x,ey=t.y-r.y;if(Math.abs(dx*ey-dy*ex)>epsilon*length)continue;if(Math.abs((r.x-p.x)*uy-(r.y-p.y)*ux)>epsilon)continue;const r0=(r.x-p.x)*ux+(r.y-p.y)*uy,r1=(t.x-p.x)*ux+(t.y-p.y)*uy,lo=Math.max(0,Math.min(r0,r1)),hi=Math.min(length,Math.max(r0,r1));if(hi-lo>epsilon)return [{x:p.x+ux*lo,y:p.y+uy*lo},{x:p.x+ux*hi,y:p.y+uy*hi}];}}return null;}
  function basePanelKey(surface){return surface.face+':'+surface.axis+':'+surface.plane.toFixed(2)+':'+surface.panelIndex;}
  function selectBasePanel(surface){if(state.selectedBasePanel){const previousKey=basePanelKey(state.selectedBasePanel);state.fragmentLevels[previousKey]=state.fragmentLevel;state.foldTargetsByPanel[previousKey]=state.foldTargets.slice();}state.selectedBasePanel={axis:surface.axis,plane:surface.plane,face:surface.face,panelIndex:surface.panelIndex,panelCount:surface.panelCount||3};const nextKey=basePanelKey(state.selectedBasePanel);state.fragmentLevel=state.fragmentLevels[nextKey]||0;state.foldTargets=(state.foldTargetsByPanel[nextKey]||[]).slice();state.selectedFoldTarget=state.foldTargets[0]||null;state.selectedFragment=state.activeOperation==='folding'?state.selectedFoldTarget:null;state.selectedFragmentPanel=null;if(state.activeOperation==='folding')syncActiveFoldSettings();}
  function rotateAroundEdge(point,start,end,angle){const axis=end.clone().sub(start).normalize(),relative=point.clone().sub(start),cross=new THREE.Vector3().crossVectors(axis,relative),dot=axis.dot(relative),cos=Math.cos(angle),sin=Math.sin(angle);return start.clone().add(relative.multiplyScalar(cos)).add(cross.multiplyScalar(sin)).add(axis.multiplyScalar(dot*(1-cos)));}
  function facade(axis, plane, len, height, face) {
    const shellOffset=0;
    if(state.behaviors.includes('folding')){
      const baseCount=3,segmentLen=len/baseCount,entries=[],panelFoldTargets=[];
      for(let panelIndex=0;panelIndex<baseCount;panelIndex++){
        const x0=-len/2+segmentLen*panelIndex,x1=x0+segmentLen,key=basePanelKey({face:face,axis:axis,plane:plane,panelIndex:panelIndex});(state.foldTargetsByPanel[key]||[]).forEach(function(id){panelFoldTargets.push(id);});const isCurrent=state.selectedBasePanel&&state.selectedBasePanel.axis===axis&&state.selectedBasePanel.plane===plane&&state.selectedBasePanel.face===face&&state.selectedBasePanel.panelIndex===panelIndex,level=isCurrent?state.fragmentLevel:(state.fragmentLevels[key]||0),isFragmented=level>0,result=isFragmented?fragmentPolygons(x0,x1,height,level,axis+':'+plane+':'+panelIndex):{polygons:[[{x:x0,y:-height/2},{x:x1,y:-height/2},{x:x1,y:height/2},{x:x0,y:height/2}]]};
        result.polygons.forEach(function(poly,pieceIndex){entries.push({poly:poly,panelIndex:panelIndex,pieceIndex:pieceIndex,isFragmented:isFragmented,level:level,id:face+':'+axis+':'+plane.toFixed(2)+':'+panelIndex+':'+pieceIndex});});
      }
      entries.forEach(function(entry){
        const localCenter=entry.poly.reduce(function(sum,p){return [sum[0]+p.x/entry.poly.length,sum[1]+p.y/entry.poly.length];},[0,0]),center=transformPoint(axis,plane,localCenter[0],localCenter[1]+height/2,0),shouldFold=panelFoldTargets.includes(entry.id),foldPoint=state.points.find(function(point){return point.behavior==='folding';}),foldSettings=state.foldSettingsByTarget[entry.id]||{intensity:state.intensity,direction:state.foldDirection};
        let world=entry.poly.map(function(p){return transformPoint(axis,plane,p.x,p.y+height/2,shellOffset);}),originalWorld=world.map(function(point){return point.clone();});
        if(shouldFold&&foldPoint){
          let anchorEdge=null,best=-Infinity;entries.forEach(function(other){if(panelFoldTargets.includes(other.id))return;const edge=sharedPanelEdge(entry.poly,other.poly);if(!edge)return;const score=Math.hypot(edge[1].x-edge[0].x,edge[1].y-edge[0].y);if(score>best){best=score;anchorEdge=edge;}});
          if(anchorEdge){const start=transformPoint(axis,plane,anchorEdge[0].x,anchorEdge[0].y+height/2,shellOffset),end=transformPoint(axis,plane,anchorEdge[1].x,anchorEdge[1].y+height/2,shellOffset),amount=foldSettings.angle===undefined?foldAngleAt(foldPoint,center.x,center.y,center.z,foldSettings.intensity):foldSettings.angle,sign=foldSettings.direction==='inward'?(axis==='z'?-Math.sign(plane||1):Math.sign(plane||1)):(axis==='z'?Math.sign(plane||1):-Math.sign(plane||1)),angle=sign*amount;world=world.map(function(point){return rotateAroundEdge(point,start,end,angle);});}
        }
        world=transformIntersectPoints(world,{axis:axis,plane:plane,len:segmentLen,height:height,face:face,panelIndex:entry.panelIndex,panelCount:baseCount});if(shouldFold||state.behaviors.includes('intersect'))addStickyBridge(originalWorld,world,entry.id);
        const positions=[],centerPoint=world.reduce(function(sum,point){return sum.add(point.clone().multiplyScalar(1/world.length));},new THREE.Vector3());for(let i=0;i<world.length;i++)positions.push(centerPoint.x,centerPoint.y,centerPoint.z,world[i].x,world[i].y,world[i].z,world[(i+1)%world.length].x,world[(i+1)%world.length].y,world[(i+1)%world.length].z);
        const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const selected=state.selectedFragment===entry.id,mesh=new THREE.Mesh(geo,material(shouldFold?'#d93232':'#f4f2eb',shouldFold?.82:.42));mesh.userData.fragmentId=entry.id;mesh.userData.isFragment=true;mesh.userData.basePanelSurface={axis:axis,plane:plane,len:segmentLen,height:height,face:face,panelIndex:entry.panelIndex,panelCount:baseCount};if(entry.isFragmented&&entry.level>0)mesh.userData.fragmentPanel={axis:axis,plane:plane,face:face,basePanelIndex:entry.panelIndex,index:entry.pieceIndex,count:entries.filter(function(item){return item.panelIndex===entry.panelIndex;}).length};mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);
        const outline=world.concat([world[0]]),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(outline),new THREE.LineBasicMaterial({color:selected?0xd93232:0x31322e,transparent:true,opacity:shouldFold?.9:.52}));line.raycast=function(){};model.add(line);
      });
      return;
    }
    const center = transformPoint(axis, plane, 0, height / 2, 0);
    const folds = matchedPoints(center.x, center.y, center.z, 'folding');
    const fragments = matchedPoints(center.x, center.y, center.z, 'fragmentation');
    let du = 0, dv = 0, dn = 0, moveX = 0, moveY = 0, moveZ = 0, rotateX = 0, rotateY = 0, rotateZ = 0;
    dn=shellOffset;
    if (!fragments.length) { wallSlab(model, axis, plane, len, height, 0.42, { u: du, v: dv, n: dn, dx: moveX, dy: moveY, dz: moveZ, rx: rotateX, ry: rotateY, rz: rotateZ }, face); return; }
    const targetSize=6.2,fragmenting=fragments.length>0,cols=fragmenting?Math.max(1,Math.min(18,Math.ceil(len/targetSize))):Math.max(4,Math.ceil(len/1.7)),rows=fragmenting?Math.max(1,Math.min(14,Math.ceil(height/targetSize))):Math.max(3,Math.ceil(height/1.45));
    const xs = Array.from({ length: cols + 1 }, function (_, i) { return -len / 2 + len * i / cols; });
    const ys = Array.from({ length: rows + 1 }, function (_, i) { return height * i / rows; });
    if(fragmenting){const randX=seeded(hash(face+':mosaic-x:'+state.building)),randY=seeded(hash(face+':mosaic-y:'+state.building));for(let i=1;i<cols;i++)xs[i]+=(randX()-.5)*targetSize*.58;for(let i=1;i<rows;i++)ys[i]+=(randY()-.5)*targetSize*.58;}
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const rand = seeded(hash(face + ':' + state.building + ':' + c + ':' + r));
      const u0 = xs[c], u1 = xs[c + 1], v0 = ys[r], v1 = ys[r + 1], uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
      const w = transformPoint(axis, plane, uc, vc, 0), fp = folds.map(function (p) { return { p: p, f: influence(p, w.x, w.y, w.z) }; }).sort(function (a, b) { return b.f - a.f; })[0], gp = fragments.map(function (p) { return { p: p, f: influence(p, w.x, w.y, w.z) }; }).sort(function (a, b) { return b.f - a.f; })[0];
      let poly = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      const skew = fragmenting?Math.min((u1-u0)*.34,targetSize*.34):Math.min(0.18,(u1-u0)*.08);
      if (rand() < (fragmenting?.92:.64)) poly = [[u0 + rand() * skew, v0+rand()*(v1-v0)*.08], [u1 - rand() * skew, v0 + rand() * (v1-v0)*.2], [u1-rand()*skew*.3, v1 - rand() * (v1-v0)*.18], [u0 + rand() * skew*.45, v1-rand()*(v1-v0)*.06]];
      if (gp && gp.f > 0.13) {
        if (rand() < 0.18 + gp.f * .18) continue;
        const fragmentId=face+':'+axis+':'+plane.toFixed(2)+':'+c+':'+r,selected=state.selectedFragment===fragmentId,edge=state.fragmentHinges[fragmentId]||state.foldEdge,fill=hingeColor(edge,selected),foldThis=fp&&fp.f>.12&&rand()<.82,hinge={bottom:0,right:1,top:2,left:3}[edge],direction=state.foldDirection==='inward'?(axis==='z'?-Math.sign(plane||1):Math.sign(plane||1)):(axis==='z'?Math.sign(plane||1):-Math.sign(plane||1)),angle=state.foldAngle*Math.PI/180*direction;
        const pivotAngle=-angle,foldTransform=foldThis?function(i,point){const a=poly[hinge],b=poly[(hinge+1)%poly.length],cx=poly.reduce(function(s,p){return s+p[0]/poly.length;},0),cy=poly.reduce(function(s,p){return s+p[1]/poly.length;},0),ax=a[0]-cx,ay=a[1]-cy,bx=b[0]-cx,by=b[1]-cy,dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,ex=dx/length,ey=dy/length,px=-ey,py=ex,rx=point[0],ry=point[1],vx=rx-ax,vy=ry-ay,along=vx*ex+vy*ey,depth=vx*px+vy*py,cos=Math.cos(angle),sin=Math.sin(angle);let result=[ax+ex*along+px*depth*cos,ay+ey*along+py*depth*cos,depth*sin];if(state.centerHinge){const c=Math.cos(pivotAngle),s=Math.sin(pivotAngle);result=state.centerAxis==='vertical'?[result[0]*c,result[1],-result[0]*s]:[result[0],result[1]*c-result[2]*s,result[1]*s+result[2]*c];}return result;}:null;
        if(foldTransform&&state.centerHinge){foldTransform.centerPivot=true;foldTransform.centerAxis=state.centerAxis;}
        surfaceTile(axis,plane,poly,fill,.88,true,foldTransform,{u:du,v:dv,n:dn,dx:moveX,dy:moveY,dz:moveZ,rx:rotateX,ry:rotateY,rz:rotateZ},fragmentId);
      } else {
        const fragmentId=face+':'+axis+':'+plane.toFixed(2)+':'+c+':'+r,selected=state.selectedFragment===fragmentId,fill=hingeColor(state.fragmentHinges[fragmentId]||state.foldEdge,selected);
        surfaceTile(axis, plane, poly, fill, .88, true, null, { u: du, v: dv, n: dn, dx: moveX, dy: moveY, dz: moveZ, rx: rotateX, ry: rotateY, rz: rotateZ }, fragmentId);
      }
    }
  }
    function drawFragmentBaseGrid(){
    if(state.activeOperation!=='fragmentation'||!state.selectedBasePanel)return;
    const b=config[state.building],surface=state.selectedBasePanel,total=surface.axis==='z'?b.w:b.d,count=surface.panelCount||3,len=total/count,height=b.h,u0=-total/2+len*surface.panelIndex,u1=u0+len,offset=Math.sign(surface.plane||1)*.035;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(len,height),new THREE.MeshBasicMaterial({color:0xd93232,transparent:true,opacity:.48,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
    panel.position.set(surface.axis==='z'?(u0+u1)/2:surface.plane+offset,height/2,surface.axis==='z'?surface.plane+offset:(u0+u1)/2);
    if(surface.axis==='x')panel.rotation.y=Math.PI/2;
    panel.renderOrder=9;markers.add(panel);
    const result=fragmentPolygons(u0,u1,height,state.fragmentLevel,surface.axis+':'+surface.plane+':'+surface.panelIndex);
    result.cuts.forEach(function(cut){const dx=cut[1].x-cut[0].x,dy=cut[1].y-cut[0].y,length=Math.hypot(dx,dy),nx=-dy/length*.035,ny=dx/length*.035,shape=new THREE.Shape();shape.moveTo(cut[0].x+nx,cut[0].y+ny);shape.lineTo(cut[1].x+nx,cut[1].y+ny);shape.lineTo(cut[1].x-nx,cut[1].y-ny);shape.lineTo(cut[0].x-nx,cut[0].y-ny);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false});geo.translate(0,0,-.006);const seam=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x080807,depthTest:false,depthWrite:false}));seam.position.set(surface.axis==='z'?0:surface.plane+offset,height/2,surface.axis==='z'?surface.plane+offset:0);if(surface.axis==='x')seam.rotation.y=-Math.PI/2;seam.renderOrder=12;markers.add(seam);});
  }
  function build() {
    const b=config[state.building];
    clear(model); clear(markers);
    const floor=new THREE.Mesh(new THREE.BoxGeometry(b.w,.12,b.d),material('#dedbd2',.92));
    floor.position.set(0,-.07,0);floor.receiveShadow=true;model.add(floor);
    facade('z',-b.d/2,b.w,b.h,'exterior');
    facade('x',-b.w/2,b.d,b.h,'exterior');
    facade('z',b.d/2,b.w,b.h,'exterior');
    facade('x',b.w/2,b.d,b.h,'exterior');
    // Interior partitions keep the base geometry legible in both views.
    wallSlab(model,'z',-.15,b.w*.56,3.2,.34,null,'interior');
    wallSlab(model,'x',b.w*.22,b.d*.35,2.8,.34,null,'interior');
    drawFragmentBaseGrid();
  }
  function cameraMode() {
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;
    renderer.setSize(w,h);
    const span=state.view==='plan'?15:17;
    camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
    camera.updateProjectionMatrix();
    if(state.view==='plan')camera.position.set(0,23,0.01);
    else camera.position.set(14,12,16);
    camera.lookAt(0,2,0);
  }
  function syncBehaviors() { const b=config[state.building], radius=Math.hypot(b.w,b.d,b.h)*.78; state.points=state.behaviors.filter(function(behavior){return behavior!=='fragmentation'||state.behaviors.includes('folding');}).map(function(behavior){return {id:'global-'+behavior,x:0,z:0,height:b.h*.48,radius:radius,intensity:state.intensity,behavior:behavior,on:true};}); }
  function drawEmergencyModel(){const canvas=renderer.domElement,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;if(!ctx)return;ctx.clearRect(0,0,w,h);ctx.fillStyle='#f5f1e7';ctx.fillRect(0,0,w,h);const scale=Math.min(w/24,h/17),cx=w*.5,cy=h*.58;function pt(x,y,z){return state.view==='plan'?[cx+x*scale,cy+z*scale]:[cx+(x-z)*scale*.72,cy+(x+z)*scale*.38-y*scale*.9];}function face(points,fill){ctx.beginPath();points.forEach(function(p,i){const q=pt(p[0],p[1],p[2]);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#343530';ctx.lineWidth=2;ctx.stroke();}const b=config[state.building],x0=-b.w/2,x1=b.w/2,z0=-b.d/2,z1=b.d/2;face([[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]],'#e7e3d9');face([[x0,0,z0],[x1,0,z0],[x1,b.h,z0],[x0,b.h,z0]],'rgba(247,246,241,.85)');face([[x1,0,z0],[x1,0,z1],[x1,b.h,z1],[x1,b.h,z0]],'rgba(231,228,219,.8)');face([[x0,0,z1],[x1,0,z1],[x1,b.h,z1],[x0,b.h,z1]],'rgba(247,246,241,.64)');face([[x0,0,z0],[x0,0,z1],[x0,b.h,z1],[x0,b.h,z0]],'rgba(231,228,219,.55)');face([[-.15,0,-1.9],[2.65,0,-1.9],[2.65,2.8,-1.9],[-.15,2.8,-1.9]],'rgba(190,188,180,.72)');}
  function render() { try {if (!fallback) build(); cameraMode(); const label=state.behaviors.length?state.behaviors.join(' + '):'conventional grid',foldWaiting=state.behaviors.includes('folding')&&!state.behaviors.includes('fragmentation'); document.getElementById('view-title').textContent = (state.view === 'plan' ? 'PLAN' : 'ISOMETRIC') + ' · EXTERIOR + INTERIOR' + (fallback ? ' · 2D FALLBACK' : ''); document.getElementById('drawing-title').textContent = config[state.building].name + ' / ' + label; document.getElementById('status').textContent = state.activeOperation==='fragmentation'?'Select one of the three base panels, then use Fragment to add 0–7 angled cuts of varying shapes with no gaps.':foldWaiting?'Folding is selected. Enable Fragmentation to create pieces for it to fold.':state.activeOperation==='intersect'?'Panels slide only along their X or Z axis. Intensity controls how far façades and interior partitions move toward and through one another.':state.behaviors.length ? label[0].toUpperCase()+label.slice(1)+' applied across the building · combine operations or adjust intensity' : 'Conventional grid baseline · choose one or more operations.'; renderer.render(scene, camera); } catch(error) { if(!fallback){activateFallback();document.getElementById('view-title').textContent=(state.view==='plan'?'PLAN':'ISOMETRIC')+' · EXTERIOR + INTERIOR · 2D FALLBACK';render();}else{console.error('Collision Field could not render the building.',error);drawEmergencyModel();} } }
  function syncOperationPanels(){const hasSelection=!!state.activeOperation,controls=document.getElementById('operation-controls'),foldingContext=state.activeOperation==='folding';controls.hidden=!hasSelection;const intensityControl=document.getElementById('intensity-control');if(intensityControl)intensityControl.hidden=state.activeOperation==='fragmentation';document.querySelectorAll('[data-operation-panel]').forEach(function(panel){const mode=panel.dataset.operationPanel;panel.hidden=mode==='folding'?!foldingContext:mode==='fragmentation'?state.activeOperation!=='fragmentation':mode==='intersect'?state.activeOperation!=='intersect':true;});document.querySelectorAll('[data-mode]').forEach(function(button){const active=state.behaviors.includes(button.dataset.mode);button.classList.toggle('active',active);button.classList.toggle('selected',state.activeOperation===button.dataset.mode);button.setAttribute('aria-pressed',String(active));});const prompt=document.getElementById('prompt'),intensityLabel=document.getElementById('strength-label-text');if(intensityLabel)intensityLabel.textContent=state.activeOperation==='intersect'?'Intersection intensity':'Operation intensity';prompt.textContent=!hasSelection?'Choose Fragment, Folding, or Intersect to reveal its controls.':foldingContext?'Fragmentation is included automatically. Intensity sets the fold up to 120°. Fold one or two segments; each stays attached at a stationary hinge.':state.activeOperation==='intersect'?'Panels slide only along their X or Z axis. Intensity controls how far façades and interior partitions move toward and through one another.':'Each facade has three selectable base panels. Fragment adds 0–7 angled cuts within the selected panel, with no gaps.';}
  function setBehavior(value) { const wasSelected=state.activeOperation===value;state.activeOperation=value;const index=state.behaviors.indexOf(value);if(!wasSelected&&index>=0){syncOperationPanels();return;}if(value==='folding'){if(index<0){state.behaviors.push('folding');if(!state.behaviors.includes('fragmentation'))state.behaviors.push('fragmentation');}else{state.behaviors.splice(index,1);state.foldTargets=[];}}else if(value==='fragmentation'&&index>=0&&state.behaviors.includes('folding')){state.behaviors.splice(index,1);state.behaviors.splice(state.behaviors.indexOf('folding'),1);state.foldTargets=[];}else if(index<0)state.behaviors.push(value);else state.behaviors.splice(index,1);syncBehaviors();syncOperationPanels();updateFragmentControls();render(); }
  function foldTargetCenter(target){const surface=state.selectedBasePanel;if(!surface)return null;const pieceIndex=+(target.match(/:(\d+)$/)||[])[1],b=config[state.building],total=surface.axis==='z'?b.w:b.d,len=total/(surface.panelCount||3),u0=-total/2+len*surface.panelIndex,result=fragmentPolygons(u0,u0+len,b.h,state.fragmentLevel,surface.axis+':'+surface.plane+':'+surface.panelIndex),poly=result.polygons[pieceIndex];if(!poly)return null;const center=poly.reduce(function(sum,p){return [sum[0]+p.x/poly.length,sum[1]+p.y/poly.length];},[0,0]);return surface.axis==='z'?{x:center[0],y:center[1]+b.h/2,z:surface.plane}:{x:surface.plane,y:center[1]+b.h/2,z:center[0]};}
  function syncActiveFoldSettings(){const selected=state.selectedFoldTarget&&state.foldSettingsByTarget[state.selectedFoldTarget];if(selected){state.intensity=selected.intensity;state.foldDirection=selected.direction;const slider=document.getElementById('strength');slider.value=state.intensity;document.getElementById('strength-value').textContent=state.intensity+'%';document.querySelectorAll('[data-fold-direction]').forEach(function(button){const active=button.dataset.foldDirection===state.foldDirection;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}const removeButton=document.getElementById('unfold-segment');if(removeButton)removeButton.hidden=!selected;syncBehaviors();}
  function selectFoldTarget(target){if(!state.foldTargets.includes(target)&&state.foldTargets.length>=2)return;if(!state.foldTargets.includes(target)){state.foldTargets.push(target);const center=foldTargetCenter(target),point=state.points.find(function(candidate){return candidate.behavior==='folding';});state.foldSettingsByTarget[target]={intensity:state.intensity,direction:state.foldDirection};if(center&&point)state.foldSettingsByTarget[target].angle=foldAngleAt(point,center.x,center.y,center.z,state.intensity);}state.selectedFoldTarget=target;if(state.selectedBasePanel)state.foldTargetsByPanel[basePanelKey(state.selectedBasePanel)]=state.foldTargets.slice();syncActiveFoldSettings();}
  function removeSelectedFoldTarget(){const target=state.selectedFoldTarget;if(!target)return;state.foldTargets=state.foldTargets.filter(function(id){return id!==target;});delete state.foldSettingsByTarget[target];state.selectedFoldTarget=state.foldTargets[0]||null;state.selectedFragment=state.selectedFoldTarget;if(state.selectedBasePanel)state.foldTargetsByPanel[basePanelKey(state.selectedBasePanel)]=state.foldTargets.slice();syncActiveFoldSettings();updateFragmentControls();render();}
  function updateFragmentControls(){const baseLabel=document.getElementById('fragment-selection-label'),base=state.selectedBasePanel,fragment=document.getElementById('fragment-level'),fragmentValue=document.getElementById('fragment-level-value');baseLabel.textContent=base?'Selected '+(base.face==='interior'?'interior':'exterior')+' panel '+(base.panelIndex+1)+' of '+(base.panelCount||3)+' · '+(base.axis==='z'?(base.plane>0?'front facade':'rear facade'):(base.plane>0?'right facade':'left facade'))+(state.selectedFragmentPanel?' · fragment '+(state.selectedFragmentPanel.index+1)+' of '+state.selectedFragmentPanel.count:''):'Click one of the three panels in the model.';fragment.disabled=!base;fragment.value=state.fragmentLevel;fragmentValue.textContent=state.fragmentLevel+(state.fragmentLevel===1?' cut':' cuts');const note=document.getElementById('fold-target-note');if(note)note.textContent=state.selectedFoldTarget?'Editing this fold only. Select another fragment to edit it; neighboring folds stay unchanged.':state.foldTargets.length?'Select a folded fragment to adjust its fold.':'Click one or two fragments to fold; each stays hinged to a stationary neighbor.';const removeButton=document.getElementById('unfold-segment');if(removeButton)removeButton.hidden=!state.selectedFoldTarget;}
  function setView(value) { state.view = value; document.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('active', b.dataset.view === value); }); render(); }
  document.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { setBehavior(b.dataset.mode); }; });
  document.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });
  document.getElementById('strength').oninput = function (e) { state.intensity=+e.target.value; document.getElementById('strength-value').textContent=state.intensity+'%'; syncBehaviors(); if(state.activeOperation==='folding'&&state.selectedFoldTarget){const settings=state.foldSettingsByTarget[state.selectedFoldTarget]||(state.foldSettingsByTarget[state.selectedFoldTarget]={direction:state.foldDirection});settings.intensity=state.intensity;const center=foldTargetCenter(state.selectedFoldTarget),point=state.points.find(function(candidate){return candidate.behavior==='folding';});if(center&&point)settings.angle=foldAngleAt(point,center.x,center.y,center.z,state.intensity);}render(); };
  document.getElementById('stickiness').oninput=function(e){state.stickiness=+e.target.value;document.getElementById('stickiness-value').textContent=state.stickiness+'%';render();};
  document.getElementById('fragment-level').oninput=function(e){state.fragmentLevel=+e.target.value;if(state.selectedBasePanel)state.fragmentLevels[basePanelKey(state.selectedBasePanel)]=state.fragmentLevel;state.selectedFragmentPanel=null;updateFragmentControls();render();};
  document.querySelectorAll('[data-fold-direction]').forEach(function(button){button.onclick=function(){state.foldDirection=button.dataset.foldDirection;if(state.selectedFoldTarget){const settings=state.foldSettingsByTarget[state.selectedFoldTarget]||(state.foldSettingsByTarget[state.selectedFoldTarget]={intensity:state.intensity});settings.direction=state.foldDirection;}document.querySelectorAll('[data-fold-direction]').forEach(function(other){const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));});render();};});
  const unfoldButton=document.getElementById('unfold-segment');if(unfoldButton)unfoldButton.onclick=removeSelectedFoldTarget;
  
  
  document.getElementById('reset').onclick = function () { state.behaviors=[];state.activeOperation=null;state.selectedFragment=null;state.selectedBasePanel=null;state.selectedFragmentPanel=null;state.foldTargets=[];state.selectedFoldTarget=null;state.foldTargetsByPanel={};state.foldSettingsByTarget={};state.fragmentLevel=0;state.fragmentLevels={};state.fragmentHinges={};state.stickiness=55;document.getElementById('stickiness').value=state.stickiness;document.getElementById('stickiness-value').textContent=state.stickiness+'%';updateFragmentControls();syncBehaviors();syncOperationPanels();render(); };
  function pointer(e) { const r = renderer.domElement.getBoundingClientRect(); mouse.x = ((e.clientX-r.left)/r.width)*2-1; mouse.y = -((e.clientY-r.top)/r.height)*2+1; raycaster.setFromCamera(mouse,camera); }
  function selectFallbackBasePanel(e){const rect=renderer.domElement.getBoundingClientRect(),width=rect.width,height=rect.height,sx=Math.min(width/24,height/17),cx=width*.5,cy=height*.58,iso=state.view!=='plan';function project(x,y,z){return iso?[cx+(x-z)*sx*.72,cy+(x+z)*sx*.38-y*sx*.9]:[cx+x*sx,cy+z*sx];}const b=config[state.building],surfaces=[{axis:'z',plane:-b.d/2,len:b.w},{axis:'x',plane:-b.w/2,len:b.d},{axis:'z',plane:b.d/2,len:b.w},{axis:'x',plane:b.w/2,len:b.d}],px=e.clientX-rect.left,py=e.clientY-rect.top;let best=null,bestDistance=Infinity;surfaces.forEach(function(surface){for(let index=0;index<3;index++){const u=-surface.len/2+surface.len*(index+.5)/3,q=surface.axis==='z'?project(u,b.h/2,surface.plane):project(surface.plane,b.h/2,u),distance=Math.hypot(px-q[0],py-q[1]);if(distance<bestDistance){bestDistance=distance;best={axis:surface.axis,plane:surface.plane,len:surface.len,panelIndex:index,panelCount:3};}}});if(!best||bestDistance>=Math.max(80,sx*5))return;const same=state.selectedBasePanel&&state.selectedBasePanel.axis===best.axis&&state.selectedBasePanel.plane===best.plane&&state.selectedBasePanel.panelIndex===best.panelIndex;if(!same)selectBasePanel({axis:best.axis,plane:best.plane,face:'exterior',panelIndex:best.panelIndex,panelCount:3});if(same||state.activeOperation==='folding'){const u0=-best.len/2+best.len*best.panelIndex/3,u1=u0+best.len/3,result=fragmentPolygons(u0,u1,b.h,state.fragmentLevel,best.axis+':'+best.plane+':'+best.panelIndex);let panel=0,distance=Infinity;result.polygons.forEach(function(poly,index){const center=poly.reduce(function(total,point){return [total[0]+point.x/poly.length,total[1]+point.y/poly.length];},[0,0]),u=(u0+u1)/2,q=best.axis==='z'?project(u,center[1]+b.h/2,best.plane):project(best.plane,center[1]+b.h/2,u),d=Math.hypot(px-q[0],py-q[1]);if(d<distance){distance=d;panel=index;}});state.selectedFragmentPanel={index:panel,count:result.polygons.length};if(state.activeOperation==='folding'){const id='exterior:'+best.axis+':'+best.plane.toFixed(2)+':'+best.panelIndex+':'+panel;selectFoldTarget(id);state.selectedFragment=id;}}updateFragmentControls();render();}
  stage.addEventListener('click',function(e){if(fallback){if(state.activeOperation==='fragmentation'||state.activeOperation==='folding')selectFallbackBasePanel(e);return;}pointer(e);const hits=raycaster.intersectObject(model,true);if(state.activeOperation==='fragmentation'||state.activeOperation==='folding'){for(let i=0;i<hits.length;i++){const object=hits[i].object,panel=object.userData.fragmentPanel,surface=object.userData.basePanelSurface;if(state.activeOperation==='folding'&&object.userData.fragmentId&&surface){const sameBase=state.selectedBasePanel&&state.selectedBasePanel.axis===surface.axis&&state.selectedBasePanel.plane===surface.plane&&state.selectedBasePanel.panelIndex===surface.panelIndex;if(!sameBase)selectBasePanel(surface);selectFoldTarget(object.userData.fragmentId);state.selectedFragment=object.userData.fragmentId;updateFragmentControls();render();return;}if(panel&&state.activeOperation==='fragmentation'){selectBasePanel({axis:panel.axis,plane:panel.plane,face:panel.face,panelIndex:panel.basePanelIndex,panelCount:3});state.selectedFragmentPanel={index:panel.index,count:panel.count};updateFragmentControls();render();return;}if(surface){selectBasePanel(surface);updateFragmentControls();render();return;}}}for(let i=0;i<hits.length;i++){let object=hits[i].object;while(object&&object!==model&&!object.userData.fragmentId)object=object.parent;if(object&&object.userData.fragmentId){state.selectedFragment=object.userData.fragmentId;updateFragmentControls();render();return;}}});
  function projectFloor(e) { pointer(e); const v = new THREE.Vector3(); if (!raycaster.ray.intersectPlane(floorPlane,v)) return null; return v; }
  function resize() { cameraMode();renderer.render(scene,camera); }
  window.addEventListener('resize',resize);
  document.getElementById('prompt').textContent='Choose Fragment, Folding, or Intersect to reveal its controls.';
  updateFragmentControls();
  render();
})();
