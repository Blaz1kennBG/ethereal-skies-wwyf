import{g as f,r as u,$ as a,J as i,K as c,e as R,p as v}from"./index-1a20dae6.js";function p(n){const t=f("useRender");t.render=n}function g(n){const t=u(),r=u();if(a){const s=new ResizeObserver(e=>{n==null||n(e,s),e.length&&(r.value=e[0].contentRect)});i(()=>{s.disconnect()}),c(t,(e,o)=>{o&&(s.unobserve(o),r.value=void 0),e&&s.observe(e)},{flush:"post"})}return{resizeRef:t,contentRect:R(r)}}const m=v({tag:{type:String,default:"div"}},"tag");export{p as a,m,g as u};
