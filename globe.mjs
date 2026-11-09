const radians = Math.PI / 180;
export function projectCoordinates(latitude, longitude, yaw, pitch) {
  const lat = latitude * radians, lon = longitude * radians;
  const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
  const rx = Math.cos(yaw) * x + Math.sin(yaw) * z;
  const rz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
  return { x: rx, y: Math.cos(pitch) * y - Math.sin(pitch) * rz, z: Math.sin(pitch) * y + Math.cos(pitch) * rz };
}
export function clusterPoints(points, radius) {
  const remaining = new Set(points), groups = [];
  for (const point of points) {
    if (!remaining.delete(point)) continue;
    const group = [point];
    for (let i = 0; i < group.length; i++) {
      for (const other of remaining) {
        if (Math.hypot(group[i].x - other.x, group[i].y - other.y) < radius) {
          remaining.delete(other); group.push(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

function makeRenderer(canvas, land) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!gl) throw new Error('WebGL 2 is unavailable');
  const shader = (type, source) => {
    const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `#version 300 es
    in vec3 position; in vec2 uv; uniform vec2 angles; uniform vec2 scale;
    out vec2 texcoord; out vec3 normal;
    void main() {
      float cy=cos(angles.x), sy=sin(angles.x), cp=cos(angles.y), sp=sin(angles.y);
      vec3 p=vec3(cy*position.x+sy*position.z,position.y,-sy*position.x+cy*position.z);
      p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
      normal=p; texcoord=uv; gl_Position=vec4(p.xy*scale,-p.z*.5,1.);
    }`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float; in vec2 texcoord; in vec3 normal; uniform sampler2D map;
    out vec4 colour;
    void main() {
      vec3 n=normalize(normal); float light=max(dot(n,normalize(vec3(-.3,.5,1.))),0.);
      vec3 base=texture(map,texcoord).rgb;
      colour=vec4(base*(.4+.6*light)+vec3(.045,.07,.075)*pow(1.-max(n.z,0.),3.),1.);
    }`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const vertices = [], indices = [], rows = 64, cols = 128;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
    const lat = (90 - row / rows * 180) * radians, lon = (col / cols * 360 - 180) * radians;
    vertices.push(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon),col/cols,row/rows);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row*(cols+1)+col, b = a+cols+1; indices.push(a,b,a+1,b,b+1,a+1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  for (const [name, size, offset] of [['position',3,0],['uv',2,12]]) {
    const location = gl.getAttribLocation(program,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,20,offset);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const texture = document.createElement('canvas'); texture.width=1024; texture.height=512;
  const ctx=texture.getContext('2d'); ctx.fillStyle='#254855'; ctx.fillRect(0,0,1024,512);
  ctx.strokeStyle='#335764'; ctx.lineWidth=1;
  for(let x=0;x<=1024;x+=1024/12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
  for(let y=0;y<=512;y+=512/6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
  ctx.fillStyle='#a4b59a';ctx.strokeStyle='#c7c9aa';ctx.lineWidth=.65;
  for(const feature of land.features){
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    for(const polygon of polygons) for(const shift of [-1024,0,1024]) {
      ctx.beginPath();
      for(const ring of polygon){
        let previous;
        ring.forEach(([lon,lat],i)=>{
          let x=(lon+180)/360*1024;
          if(previous!==undefined){while(x-previous>512)x-=1024;while(x-previous< -512)x+=1024;}
          previous=x;const y=(90-lat)/180*512;
          if(i===0)ctx.moveTo(x+shift,y);else ctx.lineTo(x+shift,y);
        });ctx.closePath();
      }
      ctx.fill('evenodd');ctx.stroke();
    }
  }
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST);const angles=gl.getUniformLocation(program,'angles'),scale=gl.getUniformLocation(program,'scale');
  return (yaw,pitch,radius,width,height)=>{
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(angles,yaw,pitch);gl.uniform2f(scale,2*radius/width,2*radius/height);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  };
}

async function start() {
  const $=id=>document.getElementById(id), canvas=$('earth'), menu=$('cluster-menu');
  const response=await fetch('cities.json');if(!response.ok)throw new Error('City catalogue could not load');
  const cities=await response.json(), ids=new Set();
  for(const city of cities){
    if(!/^[a-z]+$/.test(city.id)||ids.has(city.id)||!Number.isFinite(city.latitude)||Math.abs(city.latitude)>90||!Number.isFinite(city.longitude)||Math.abs(city.longitude)>180||!customElements.get(`${city.id}-switch`))throw new Error('Invalid city catalogue');
    ids.add(city.id);
  }
  let selected, yaw=-18*radians,pitch=50*radians,zoom=1, draw, animation, pointer;
  const panes=new Map(), buttons=new Map();
  const phase=h=>h<5?'Night':h<7?'Dawn':h<10?'Morning':h<16?'Daytime':h<18?'Golden hour':h<19.5?'Signs coming on':'Night';
  function read(entry){
    $('switch-stage').style.setProperty('--dark',entry.dark.toFixed(3));
    const hour=entry.hour%24;$('clock').textContent=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')}`;
    $('phase').textContent=phase(hour);
  }
  function select(id,updateHash=true){
    const city=cities.find(c=>c.id===id);if(!city)return;
    selected=city;menu.hidden=true;
    for(const [key,entry] of panes)entry.pane.hidden=key!==id;
    let entry=panes.get(id);
    if(!entry){
      const pane=document.createElement('div');pane.className='switch-pane';
      const element=document.createElement(`${id}-switch`);element.className='switch';
      entry={pane,element,hour:12,dark:0};panes.set(id,entry);
      element.addEventListener('scrub',event=>{Object.assign(entry,event.detail);if(selected.id===id)read(entry);});
      element.addEventListener('change',event=>{try{localStorage.setItem(`city-switch:${id}`,event.detail.night?'night':'day');}catch{}});
      pane.append(element);$('switches').append(pane);
      let night=matchMedia('(prefers-color-scheme: dark)').matches;
      try{const saved=localStorage.getItem(`city-switch:${id}`);if(saved)night=saved==='night';}catch{}
      element.jump(night);
    }
    entry.pane.hidden=false;read(entry);
    for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===id));
    $('city-name').textContent=city.name;$('read-city').textContent=city.name;$('country').textContent=city.country;$('description').textContent=city.description;
    for(const [prop,value] of [['paper',city.paper],['night',city.night],['dusk-colour',city.dusk]])$('switch-stage').style.setProperty(`--${prop}`,value);
    const base=`https://preacherxp.github.io/${id}-switch/`;
    $('demo-link').href=base;$('mp4-link').href=`${base}${id}-day-night-60fps.mp4`;$('repo-link').href=`https://github.com/preacherxp/${id}-switch`;
    $('selection-status').textContent=`${city.name} switch selected`;
    if(updateHash)history.replaceState(null,'',`#${id}`);
    centre();
  }
  function centre(){
    cancelAnimationFrame(animation);
    const fromYaw=yaw,fromPitch=pitch,targetYaw=-selected.longitude*radians,targetPitch=selected.latitude*radians;
    const delta=((targetYaw-fromYaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=targetYaw;pitch=targetPitch;render();return;}
    const began=performance.now();
    function step(now){const t=Math.min(1,(now-began)/500),ease=1-(1-t)**3;yaw=fromYaw+delta*ease;pitch=fromPitch+(targetPitch-fromPitch)*ease;render();if(t<1)animation=requestAnimationFrame(step);}
    animation=requestAnimationFrame(step);
  }
  function render(){
    if(!draw)return;
    const {width,height}=$('earth-view').getBoundingClientRect(),radius=Math.min(width,height)*.42*zoom;
    draw(yaw,pitch,radius,width,height);canvas.dataset.yaw=String(yaw);canvas.dataset.zoom=String(zoom);
    const points=cities.map(city=>{const p=projectCoordinates(city.latitude,city.longitude,yaw,pitch);return{city,x:width/2+p.x*radius,y:height/2-p.y*radius,z:p.z};}).filter(p=>p.z>.05&&p.x>16&&p.x<width-16&&p.y>16&&p.y<height-16);
    $('pins').replaceChildren();
    for(const group of clusterPoints(points,34)){
      const x=group.reduce((s,p)=>s+p.x,0)/group.length,y=group.reduce((s,p)=>s+p.y,0)/group.length;
      const pin=document.createElement('button');pin.type='button';pin.className=`pin${group.length===1?' single':''}${group.some(p=>p.city.id===selected.id)?' current':''}`;
      pin.style.left=`${x}px`;pin.style.top=`${y}px`;pin.title=group.map(p=>p.city.name).join(', ');pin.setAttribute('aria-label',group.length===1?`Select ${group[0].city.name}`:`Choose from ${group.length} cities: ${pin.title}`);
      if(group.length>1)pin.textContent=group.length;
      pin.addEventListener('click',()=>{
        if(group.length===1){select(group[0].city.id);buttons.get(group[0].city.id).focus();return;}
        menu.replaceChildren();
        for(const point of group){const button=document.createElement('button');button.textContent=point.city.name;button.type='button';button.onclick=()=>{select(point.city.id);buttons.get(point.city.id).focus();};menu.append(button);}
        menu.hidden=false;menu.style.left=`${Math.max(12,Math.min(width-212,x+18))}px`;menu.style.top=`${Math.max(12,Math.min(height-menu.offsetHeight-12,y+18))}px`;menu.firstElementChild.focus();
      });$('pins').append(pin);
    }
  }
  for(const city of cities){
    const button=document.createElement('button');button.type='button';button.className='city-button';button.dataset.city=city.id;
    const name=document.createElement('span'),country=document.createElement('small');name.textContent=city.name;country.textContent=city.country;button.append(name,country);
    button.onclick=()=>select(city.id);buttons.set(city.id,button);$('city-list').append(button);
  }
  select(ids.has(location.hash.slice(1))?location.hash.slice(1):'zabrze');
  addEventListener('hashchange',()=>select(location.hash.slice(1),false));
  try{
    const mapResponse=await fetch('data/land.geojson');if(!mapResponse.ok)throw new Error('Map unavailable');
    draw=makeRenderer(canvas,await mapResponse.json());render();canvas.dataset.ready='true';
    $('globe-status').textContent='Drag to rotate · + / − to zoom · numbered pins group nearby cities';
  }catch(error){$('globe-status').textContent='The 3D globe is unavailable in this browser. Choose any city below.';canvas.hidden=true;console.warn(error.message);return;}
  new ResizeObserver(()=>{menu.hidden=true;render();}).observe($('earth-view'));
  const zoomBy=amount=>{zoom=Math.max(.7,Math.min(2.4,zoom+amount));menu.hidden=true;render();};
  $('zoom-in').onclick=()=>zoomBy(.25);$('zoom-out').onclick=()=>zoomBy(-.25);$('reset-view').onclick=()=>{zoom=1;centre();};
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;cancelAnimationFrame(animation);pointer={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);menu.hidden=true;});
  canvas.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;yaw+=(event.clientX-pointer.x)*.008;pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch+(event.clientY-pointer.y)*.008));pointer.x=event.clientX;pointer.y=event.clientY;render();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{pointer=null;});
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key))return;
    event.preventDefault();cancelAnimationFrame(animation);menu.hidden=true;
    if(event.key==='Home'){centre();return;}
    if(['+','=','-'].includes(event.key)){zoomBy(event.key==='-'?-.25:.25);return;}
    yaw+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;
    pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch+(event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0)));render();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){menu.hidden=true;canvas.focus();}});
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!event.target.closest('.pin'))menu.hidden=true;});
}
if(typeof document!=='undefined')start().catch(error=>{document.getElementById('globe-status').textContent=`${error.message}. Open the Gallery using the link above.`;console.error(error);});
