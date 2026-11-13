// 나다르 액자 — 사진을 기다리는 동안 보는 화면: 양피지에 잉크가 스며들며 나다르 사진관 자료가 그려진다(장면마다 약 11초, 번갈아)
//   ① 나다르 사진관 정면, 파리 카퓌신 대로 35번지(1860년대 알부민 인화 · BnF, 퍼블릭 도메인) — 잉크로 떠오른 뒤 천천히 다가감
//   ② 오노레 도미에 석판화 〈사진을 예술의 높이로 끌어올리는 나다르〉 1862(퍼블릭 도메인) — 잉크로 떠오른 뒤 기구가 천천히 떠오름
// 색은 양피지 · 세피아 잉크뿐. WebGL 한 장 — 안 되면 CSS 양피지만
const FS = `
precision highp float;
uniform vec2 R; uniform float T; uniform float S;
uniform sampler2D I0; uniform sampler2D I1; uniform vec2 A0; uniform vec2 A1;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
const float L=11.;   // 장면 길이(초)
// 한 장면의 잉크 농도: 스며들며 떠오름(0–5초) → 머묾 → 다음 장면으로 바뀌며 옅어짐(9.5–12.5초)
float layer(sampler2D tx, vec2 asp, float lt, float kind, vec2 fc){
  if(lt<0.||lt>L+1.5) return 0.;
  vec2 box=asp*min(R.x*.86/asp.x,R.y*.66/asp.y);              // 화면 안에 맞춘 그림 크기(px)
  vec2 c=R*vec2(.5,.54);
  float k=lt/L;
  vec2 q=(fc-c)/box;
  q/=1.+.06*k;                                                // 천천히 다가감
  if(kind>.5){ q.y-=.035*k; q.x-=.008*sin(lt*.55); }          // 기구: 천천히 떠오르며 살짝 흔들림
  q+=.5;
  float rv=smoothstep(.0,5.,lt)*(1.-smoothstep(9.5,L+1.5,lt));
  float rf=fbm(q*2.6+S+kind*3.)*.55+(1.-length((q-.5)*vec2(1.,.9))*1.5)*.45;
  float th=1.05-rv*1.25;
  float m=smoothstep(th,th+.07,rf);
  float edge=smoothstep(th-.01,th+.015,rf)-smoothstep(th+.015,th+.11,rf);
  vec2 fl=(vec2(fbm(q*3.+T*.07),fbm(q*3.+7.-T*.07))-.5)*.03*(1.-m);   // 아직 마르지 않은 잉크는 살짝 흐름
  vec2 uv=clamp(q+fl,0.,1.); uv.y=1.-uv.y;
  float lum=dot(texture2D(tx,uv).rgb,vec3(.3,.55,.15));
  float ink=pow(1.-lum,1.15)*.92;
  float bm=smoothstep(0.,.05,q.x)*smoothstep(1.,.95,q.x)*smoothstep(0.,.05,q.y)*smoothstep(1.,.95,q.y);
  return (ink*m+edge*.22)*bm;
}
void main(){
  vec2 fc=gl_FragCoord.xy, p=(fc-.5*R)/min(R.x,R.y);
  // 양피지: 얼룩 · 섬유 · 가장자리 그을림
  float big=fbm(p*2.2+S);
  vec3 col=mix(vec3(.945,.905,.815),vec3(.86,.785,.655),big*.85);
  col-=fbm(p*38.+S)*.045+fbm(vec2(p.x*2.5,p.y*70.)+S)*.025;
  col*=mix(.72,1.,smoothstep(1.25,.25,length(p*vec2(.95,.8))));
  // 가장자리에서 옅게 흐르는 잉크 결(배경)
  float t=T*.04;
  vec2 q=vec2(fbm(p*1.4+vec2(0.,t)+S),fbm(p*1.4+vec2(5.2,-t)+S));
  vec2 r=vec2(fbm(p*2.+4.*q+vec2(1.7,9.2)+t*.5),fbm(p*2.+4.*q+vec2(8.3,2.8)-t*.4));
  float f=fbm(p*1.5+3.*r);
  float rid=pow(1.-abs(2.*fbm(p*2.4+3.5*r+vec2(t*.3,-t*.2))-1.),7.);
  float reach=smoothstep(.92,1.32,length(fc/R*2.-1.)+(f-.5)*.5);
  vec3 inkc=mix(vec3(.38,.27,.17),vec3(.16,.11,.08),smoothstep(.3,.8,f));
  col=mix(col,inkc,clamp(smoothstep(.42,.9,f)*reach*.5+rid*(reach*.6+.04),0.,.5));
  // 장면: 두 자료가 번갈아(겹치는 동안 하나는 옅어지고 하나는 스며듦)
  float cyc=mod(T,2.*L);
  float d=layer(I0,A0,cyc,0.,fc)+layer(I0,A0,cyc+2.*L,0.,fc)+layer(I1,A1,cyc-L,1.,fc);
  vec3 dk=vec3(.20,.14,.10);
  col=mix(col,dk,clamp(d,0.,.9));
  gl_FragColor=vec4(col,1.);
}`;
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
export const SCENE_SEC = 11;
const SRC = ['img/nadar_facade.jpg', 'img/nadar_daumier.jpg'];

export function inkLoader(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false });
  let raf = 0, t0 = 0, on = false, seed = Math.random() * 10, onTick = null;
  if (!gl) return { start() { canvas.classList.add('on', 'nogl'); t0 = performance.now(); }, stop() { canvas.classList.remove('on'); }, progress() {}, finish() {}, get on() { return canvas.classList.contains('on'); }, get time() { return (performance.now() - t0) / 1000; }, set onTick(f) {} };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k);
  const asp = [1, 1];
  SRC.forEach((src, i) => {   // 그림 두 장 — 받는 대로 텍스처
    const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const im = new Image(); im.onload = () => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); asp[i] = im.naturalWidth / im.naturalHeight; }; im.src = src;
  });
  gl.uniform1i(U('I0'), 0); gl.uniform1i(U('I1'), 1);
  const uR = U('R'), uT = U('T'), uS = U('S'), uA0 = U('A0'), uA1 = U('A1');
  const size = () => { const k = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * k), h = Math.round(innerHeight * k); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } };
  const frame = (now) => {
    if (!on) return;
    size(); const t = (now - t0) / 1000;
    gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, t); gl.uniform1f(uS, seed);
    gl.uniform2f(uA0, asp[0], 1); gl.uniform2f(uA1, asp[1], 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3); onTick?.(t); raf = requestAnimationFrame(frame);
  };
  return {
    start() { if (on && canvas.classList.contains('on')) return; on = true; t0 = performance.now(); seed = Math.random() * 10; canvas.classList.add('on'); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    progress() {}, finish() {},
    stop() { canvas.classList.remove('on'); setTimeout(() => { if (!canvas.classList.contains('on')) { on = false; cancelAnimationFrame(raf); } }, 1600); },
    get on() { return on && canvas.classList.contains('on'); },
    get time() { return (performance.now() - t0) / 1000; },
    set onTick(f) { onTick = f; },
  };
}
