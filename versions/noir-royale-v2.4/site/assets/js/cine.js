// Cinematic logo reveal (~6.8 s, once per session, skippable), shown before the opening screen.
// Smoky dark marble with gold dust → an anamorphic flare and starburst → the monogram assembles out of gold particles →
// a thick extruded gold monogram swings from a steep camera angle to face you (bevel highlights, light sweep, dust blowing
// off) → it settles with a subtitle and crossfades into the opening.
// One plain-WebGL shader: the monogram is drawn to a texture and raymarched as a slab for real extrusion. No video, no library.
// SVG/CSS fallback for missing/slow WebGL; a still logo for reduced motion.

const DUR = 6.8;
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R;uniform float T;uniform sampler2D M;uniform float A;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}
const float H=.92;
float rev;
float mk(vec2 q){vec2 uv=vec2(q.x/(H*A),-q.y/H)+.5;
  if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;
  float m=texture2D(M,uv).a;float n=h(floor(q*110.));return m*step(n,rev);}
vec3 dust(vec2 p,vec2 v,float k,vec3 col){vec2 g=p*k+v*T;vec2 id=floor(g);vec2 f=fract(g)-.5;
  float r=h(id);vec2 o=vec2(h(id+3.1),h(id+7.7))-.5;float tw=.4+.6*sin(T*3.+r*40.);
  return col*smoothstep(.08,0.,length(f-o*.7))*step(.8,r)*tw;}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
  float s=fbm(p*2.2+vec2(T*.05,-T*.03))+.5*fbm(p*5.-vec2(T*.04,0.));
  vec3 c=vec3(.035,.05,.045)+vec3(.05,.11,.12)*s*smoothstep(-.6,.9,p.x+p.y*.4)+vec3(.13,.09,.04)*s*exp(-dot(p,p)*3.);
  c*=1.15-.7*length(p);
  c+=dust(p,vec2(.0,.05),9.,vec3(.85,.72,.45))*.7+dust(p+.37,vec2(.03,.08),15.,vec3(.95,.82,.55))*.45;
  float fl=exp(-pow((T-1.65)*2.6,2.));
  float ang=atan(p.y,p.x);
  c+=vec3(1.,.85,.55)*fl*(exp(-abs(p.y)*90.)*exp(-abs(p.x)*1.8)*1.6+pow(max(cos(ang*14.),0.),30.)*exp(-length(p)*5.)*.9+exp(-length(p)*22.)*2.);
  rev=smoothstep(1.9,3.1,T);
  if(rev>0.){
    float tr=smoothstep(2.4,5.6,T);tr=tr*tr*(3.-2.*tr);
    float ax=mix(.95,0.,tr),ay=mix(-.6,0.,tr),az=mix(.3,0.,tr);
    float cam=mix(1.85,2.35,smoothstep(2.,6.5,T));
    vec2 pl=p/min(1.,(R.x/R.y)/.78); // portrait screens: pull back so the logo fits the width
    vec3 ro=vec3(0.,0.,-cam),rd=normalize(vec3(pl-vec2(0.,.05),1.7));
    mat3 Ri=rx(-ax)*ry(-ay)*rz(-az);
    vec3 o=Ri*ro,d=Ri*rd;
    float hit=-1.;vec2 hq=vec2(0.);
    for(int k=0;k<12;k++){float z=float(k)*.008;float t=(z-o.z)/d.z;vec2 q=(o+d*t).xy;
      if(mk(q)>.5){hit=float(k);hq=q;break;}}
    if(hit==0.){
      float e=.005;vec2 g=vec2(mk(hq+vec2(e,0.))-mk(hq-vec2(e,0.)),mk(hq+vec2(0.,e))-mk(hq-vec2(0.,e)));
      vec3 n=normalize(rz(az)*ry(ay)*rx(ax)*vec3(-g*1.4,-1.));
      vec3 L=normalize(vec3(-.5,.6,-.8));float df=max(dot(n,L),0.);
      vec3 r=reflect(rd,n);float env=pow(.5+.5*sin(r.y*8.+r.x*3.+T*.7),5.);
      float sw=exp(-pow(hq.x*.8+hq.y*.5-mix(-1.4,1.4,smoothstep(4.3,5.9,T)),2.)*40.);
      vec3 gold=mix(vec3(.45,.34,.17),vec3(.86,.75,.52),df)+vec3(1.,.92,.72)*(env*.85+sw*1.4);
      gold*=.93+.07*sin(hq.x*700.+hq.y*90.);
      float edge=step(h(floor(hq*110.)),rev)-step(h(floor(hq*110.)),rev-.08);
      c=gold+vec3(1.,.9,.6)*edge*1.5*(1.-smoothstep(2.9,3.2,T));
    }else if(hit>0.){
      c=mix(vec3(.5,.37,.17),vec3(.16,.11,.05),hit/11.)*(.75+.25*sin(hq.x*40.));
    }
  }
  float bl=smoothstep(3.2,4.2,T)*(1.-smoothstep(5.6,6.4,T));
  c+=dust(p,vec2(-.35,.05),11.,vec3(1.,.8,.45))*bl*smoothstep(.5,0.,abs(p.y))*1.2;
  gl_FragColor=vec4(c,1.);}`;

/** The Victorian monogram (#mono symbol) rasterised to a white alpha mask, for the shader. */
async function monoMask() {
  try { await document.fonts.load('700 100px "Cinzel Decorative"'); } catch {}
  const sym = document.getElementById('mono');
  const [, , vw, vh] = sym.getAttribute('viewBox').split(/\s+/).map(Number);
  const S = 3, cv = document.createElement('canvas');
  cv.width = vw * S; cv.height = vh * S;
  const x = cv.getContext('2d');
  x.scale(S, S);
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = x.fillStyle = '#fff';
  const walk = (node, inherited) => {
    for (const n of node.children) {
      const st = { ...inherited };
      if (n.getAttribute('stroke-width')) st.w = Number(n.getAttribute('stroke-width'));
      if (n.getAttribute('font-size')) st.fs = Number(n.getAttribute('font-size'));
      x.save();
      if (n.transform?.baseVal?.length) { const m = n.transform.baseVal.consolidate().matrix; x.transform(m.a, m.b, m.c, m.d, m.e, m.f); }
      x.lineWidth = (st.w || 1.6) * 1.35;
      const dash = n.getAttribute('stroke-dasharray');
      x.setLineDash(dash ? dash.split(/[ ,]+/).map(Number) : []);
      if (n.tagName === 'g') walk(n, st);
      else if (n.tagName === 'path') x.stroke(new Path2D(n.getAttribute('d')));
      else if (n.tagName === 'ellipse') { x.beginPath(); x.ellipse(+n.getAttribute('cx'), +n.getAttribute('cy'), +n.getAttribute('rx'), +n.getAttribute('ry'), 0, 0, Math.PI * 2); x.stroke(); }
      else if (n.tagName === 'circle') { x.beginPath(); x.arc(+n.getAttribute('cx'), +n.getAttribute('cy'), +n.getAttribute('r'), 0, Math.PI * 2); x.fill(); }
      else if (n.tagName === 'text') { x.font = `700 ${st.fs || 100}px "Cinzel Decorative", Cinzel, serif`; x.textAlign = 'center'; x.fillText(n.textContent, +n.getAttribute('x'), +n.getAttribute('y')); }
      x.restore();
    }
  };
  walk(sym, {});
  return { canvas: cv, aspect: vw / vh };
}

async function glRunner(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software|mali-4|adreno \(tm\) [23]/i.test(gpu)) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const mask = await monoMask();
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask.canvas);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const u = (n) => gl.getUniformLocation(pr, n);
  const uR = u('R'), uT = u('T');
  gl.uniform1i(u('M'), 0);
  gl.uniform1f(u('A'), mask.aspect);
  const size = () => {
    const s = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(450000 / (innerWidth * innerHeight))); // ~0.45 MP budget
    canvas.width = Math.round(innerWidth * s); canvas.height = Math.round(innerHeight * s);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  addEventListener('resize', size);
  const draw = (t) => { gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, t); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  draw(3.5); gl.finish(); // warm-up: compile before the clock starts
  return draw;
}

/** Synthesized sound (no files): a rising whoosh into the flare, a shimmer as it assembles, a deep chime as it settles. Muted unless tapped. */
function sounds() {
  let ac = null;
  const noise = (dur, f0, f1, gain, at) => {
    const n = ac.createBufferSource(), b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
    n.buffer = b;
    const f = ac.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.connect(f).connect(g).connect(ac.destination); n.start(at);
  };
  const tone = (at, freqs, gain, len) => freqs.forEach((fr, i) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain / (i + 1), at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(ac.destination); o.start(at); o.stop(at + len + 0.1);
  });
  return {
    play(elapsed) {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = ac.currentTime, at = (s) => now + Math.max(0, s - elapsed);
      if (elapsed < 1.65) noise(1.4, 200, 3000, 0.25, at(0.25));
      if (elapsed < 2.6) tone(at(2.0), [1568, 2093, 2637], 0.03, 1.2);
      if (elapsed < 5.4) tone(at(5.4), [110, 220, 330, 660], 0.09, 2.5);
    },
    stop() { ac?.close(); ac = null; },
  };
}

export function playCinematic({ force = false } = {}) {
  const root = document.documentElement;
  let seen = false;
  try { seen = sessionStorage.getItem('cine') === '1'; } catch {}
  if (!force && (seen || navigator.webdriver)) return Promise.resolve(); // automated tests opt in with ?cine=1
  try { sessionStorage.setItem('cine', '1'); } catch {}

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = document.getElementById('cine');
  const canvas = box.querySelector('canvas');
  const logo = box.querySelector('.cine-logo');
  const src = [...document.getElementById('mono').childNodes];
  logo.querySelector('.trace').replaceChildren(...src.map((n) => n.cloneNode(true)));
  logo.querySelectorAll('.trace path, .trace ellipse').forEach((n) => n.setAttribute('pathLength', '1'));
  logo.querySelector('.metal-g').replaceChildren(...src.map((n) => n.cloneNode(true)));
  logo.querySelector('mask g').replaceChildren(...src.map((n) => n.cloneNode(true)));
  box.hidden = false;
  root.classList.add('cine-playing');

  return new Promise((resolve) => {
    let raf = 0, t0 = 0, mode = 'svg', done = false;
    const audio = sounds();
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      audio.stop();
      box.classList.add('out');
      root.classList.remove('cine-playing');
      setTimeout(() => { box.hidden = true; resolve(); }, reduce ? 300 : 700);
    };
    box.querySelector('.cine-skip').addEventListener('click', finish, { once: true });
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { removeEventListener('keydown', esc); finish(); } });
    const snd = box.querySelector('.cine-sound');
    snd.addEventListener('click', () => {
      const on = snd.getAttribute('aria-pressed') !== 'true';
      snd.setAttribute('aria-pressed', String(on));
      if (on) audio.play(t0 ? (performance.now() - t0) / 1000 : 0); else audio.stop();
    });

    if (reduce) { box.classList.add('still', 'sub'); setTimeout(finish, 1800); return; } // still gold logo, gentle fade

    const start = async () => {
      const draw = await glRunner(canvas).catch(() => null);
      if (done) return;
      if (draw) mode = 'gl';
      box.classList.add(mode);
      box.dataset.mode = mode;
      // SVG fallback timeline (trace → metal → rise); GL mode uses only 'sub' and 'fade'
      const marks = mode === 'gl' ? [[5.1, 'sub'], [6.2, 'fade']] : [[1.4, 'trace'], [3.4, 'solid'], [4.4, 'rise'], [5.1, 'sub'], [6.2, 'fade']];
      const frames = [];
      let last = 0;
      const tick = (now) => {
        if (!last) t0 = last = now; // clock starts on the first painted frame, after warm-up
        const t = (now - t0) / 1000;
        frames.push(now - last); last = now;
        for (const [at, cls] of marks) if (t >= at) box.classList.add(cls);
        if (mode === 'gl') {
          draw(t);
          if (frames.length === 24) { // weak GPU: drop to the SVG version mid-flight, no restart
            const med = frames.slice(4).sort((a, b) => a - b)[10];
            if (med > 30) { mode = 'svg'; box.classList.replace('gl', 'svg'); box.dataset.mode = 'svg'; ['trace', 'solid'].forEach((c) => box.classList.add(c)); }
          }
        }
        if (t >= DUR) { window.__cineFrames = frames; finish(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    // hold on the opening frame until the invitation underneath has rendered (max 1.5 s), so nothing stutters
    new Promise((r) => { document.addEventListener('invite-rendered', r, { once: true }); setTimeout(r, 1500); }).then(start);
  });
}
