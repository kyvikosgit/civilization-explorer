// 나다르 액자 — 사진을 기다리는 동안의 화면: 양피지 위에 잉크가 천천히 번지고, 가운데 타원 액자 선이 진행만큼 그려진다
// 색은 양피지 · 세피아 잉크뿐(화려하지 않게). WebGL 한 장(조각 셰이더) — 안 되면 CSS 양피지만
const FS = `
precision highp float;
uniform vec2 R; uniform float T; uniform float P; uniform float S;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<6;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);
  // 양피지: 얼룩 · 섬유 · 가장자리 그을림
  float big=fbm(p*2.2+S);
  vec3 paper=mix(vec3(.945,.905,.815),vec3(.86,.785,.655),big*.85);
  paper-=fbm(p*38.+S)*.045+fbm(vec2(p.x*2.5,p.y*70.)+S)*.025;
  float vig=smoothstep(1.25,.25,length(p*vec2(.95,.8)));
  paper*=mix(.72,1.,vig);
  // 잉크: 가장자리에서 가는 잉크 결이 연기처럼 천천히 흘러 들어옴(시간 · 진행만큼 조금씩 안쪽으로). 가운데 액자 자리는 비워 둠
  float t=T*.04;
  vec2 q=vec2(fbm(p*1.4+vec2(0.,t)+S),fbm(p*1.4+vec2(5.2,-t)+S));
  vec2 r=vec2(fbm(p*2.+4.*q+vec2(1.7,9.2)+t*.5),fbm(p*2.+4.*q+vec2(8.3,2.8)-t*.4));
  float f=fbm(p*1.5+3.*r);
  float rid=1.-abs(2.*fbm(p*2.4+3.5*r+vec2(t*.3,-t*.2))-1.); rid=pow(rid,7.);
  float rr=length(gl_FragCoord.xy/R*2.-1.);   // 화면 모양 따라(가로 · 세로 어느 화면이든 네 변에서)
  float front=mix(1.02,.66,clamp(T/40.,0.,1.)*.45+P*.55);   // 처음엔 귀퉁이에만, 다 되면 액자 바로 바깥까지
  float reach=smoothstep(front-.04,front+.36,rr+(f-.5)*.55);
  float cloud=smoothstep(.42,.9,f)*reach;
  float dens=cloud*.66+rid*(reach*.8+.07);
  vec3 inkc=mix(vec3(.38,.27,.17),vec3(.16,.11,.08),smoothstep(.3,.8,f));
  vec3 col=mix(paper,inkc,clamp(dens,0.,.62));
  // 가운데 타원 액자: 진행만큼 위에서부터 시계 방향으로 그려짐(겹선)
  vec2 e=p/vec2(.27,.36);
  float d=length(e)-1.;
  float ang=atan(e.x,e.y); float a01=(ang<0.?ang+6.2832:ang)/6.2832;
  float drawn=step(a01,P);
  float ring=(1.-smoothstep(.004,.011,abs(d)))+(1.-smoothstep(.002,.007,abs(d-.045)))*.6;
  float wob=.75+.25*fbm(vec2(a01*40.,T*.2));
  col=mix(col,vec3(.16,.11,.08),ring*drawn*wob*.85);
  // 펜 끝: 지금 그리는 자리에 잉크가 살짝 고임
  vec2 tip=vec2(sin(P*6.2832),cos(P*6.2832))*vec2(.27,.36);
  col=mix(col,vec3(.13,.09,.07),(1.-smoothstep(.0,.012,length(p-tip)))*step(.002,P)*step(P,.998)*.8);
  gl_FragColor=vec4(col,1.);
}`;
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

export function inkLoader(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  let raf = 0, t0 = 0, prog = 0, shown = 0, on = false, seed = Math.random() * 10;
  if (!gl) return { start() { canvas.classList.add('on', 'nogl'); }, stop() { canvas.classList.remove('on'); }, progress() {} };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k), uR = U('R'), uT = U('T'), uP = U('P'), uS = U('S');
  const size = () => { const k = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * k), h = Math.round(innerHeight * k); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } };
  const frame = (now) => {
    if (!on) return;
    size(); shown += (prog - shown) * 0.04;   // 진행 막대처럼 천천히 따라감
    gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform1f(uP, shown); gl.uniform1f(uS, seed);
    gl.drawArrays(gl.TRIANGLES, 0, 3); raf = requestAnimationFrame(frame);
  };
  return {
    start() { if (on) return; on = true; t0 = performance.now(); prog = 0; shown = 0; seed = Math.random() * 10; canvas.classList.add('on'); raf = requestAnimationFrame(frame); },
    progress(p) { prog = Math.max(prog, Math.min(1, p)); },
    finish() { prog = 1; },
    stop() { canvas.classList.remove('on'); setTimeout(() => { if (!canvas.classList.contains('on')) { on = false; cancelAnimationFrame(raf); } }, 1600); },
    get on() { return on && canvas.classList.contains('on'); },
  };
}
