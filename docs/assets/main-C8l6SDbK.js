(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function t(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(r){if(r.ep)return;r.ep=!0;const n=t(r);fetch(r.href,n)}})();const l=document.getElementById("nav-toggle"),c=document.getElementById("nav-menu");l.addEventListener("click",()=>{c.classList.toggle("active"),l.querySelectorAll("span").forEach((o,t)=>{c.classList.contains("active")?(t===0&&(o.style.transform="rotate(45deg) translate(5px, 5px)"),t===1&&(o.style.opacity="0"),t===2&&(o.style.transform="rotate(-45deg) translate(7px, -6px)")):(o.style.transform="none",o.style.opacity="1")})});const u=document.querySelectorAll(".nav-link");u.forEach(e=>{e.addEventListener("click",()=>{c.classList.remove("active"),l.querySelectorAll("span").forEach(t=>{t.style.transform="none",t.style.opacity="1"})})});document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",function(o){o.preventDefault();const t=document.querySelector(this.getAttribute("href"));if(t){const s=document.querySelector(".header").offsetHeight,r=t.offsetTop-s;window.scrollTo({top:r,behavior:"smooth"})}})});const a=document.getElementById("header");let d=window.scrollY;window.addEventListener("scroll",()=>{const e=window.scrollY;e>100?(a.style.background="rgba(255, 255, 255, 0.98)",a.style.boxShadow="0 2px 20px rgba(0, 0, 0, 0.1)"):(a.style.background="rgba(255, 255, 255, 0.95)",a.style.boxShadow="none"),e>d&&e>200?a.style.transform="translateY(-100%)":a.style.transform="translateY(0)",d=e});const f=document.createElement("style");f.textContent=`
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;document.head.appendChild(f);const h={threshold:.1,rootMargin:"0px 0px -50px 0px"},v=new IntersectionObserver(e=>{e.forEach(o=>{o.isIntersecting&&(o.target.style.opacity="1",o.target.style.transform="translateY(0)")})},h),E=document.querySelectorAll(".feature-card, .step, .example-card, .docs-category");E.forEach(e=>{e.style.opacity="0",e.style.transform="translateY(20px)",e.style.transition="opacity 0.6s ease, transform 0.6s ease",v.observe(e)});document.querySelectorAll(".features-grid .feature-card").forEach((e,o)=>{e.style.transitionDelay=`${o*.1}s`});document.querySelectorAll(".docs-grid .docs-category").forEach((e,o)=>{e.style.transitionDelay=`${o*.1}s`});document.querySelectorAll(".examples-grid .example-card").forEach((e,o)=>{e.style.transitionDelay=`${o*.1}s`});const b=document.querySelectorAll("section[id]"),L=Array.from(u);function m(){const e=window.scrollY+100;b.forEach(o=>{const t=o.offsetTop,s=o.offsetHeight,r=o.getAttribute("id");e>=t&&e<t+s&&L.forEach(n=>{n.classList.remove("active"),n.getAttribute("href")===`#${r}`&&n.classList.add("active")})})}const y=document.createElement("style");y.textContent=`
  .nav-link.active {
    color: var(--color-primary) !important;
    position: relative;
  }
  
  .nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
  }
`;document.head.appendChild(y);window.addEventListener("scroll",m);function w(){document.querySelectorAll("pre code").forEach(o=>{let t=o.innerHTML;t=t.replace(/\b(const|let|var|function|class|interface|type|export|import|from|default)\b/g,'<span style="color: #c586c0;">$1</span>'),t=t.replace(/(['"`])([^'"`]*)\1/g,'<span style="color: #ce9178;">$1$2$1</span>'),t=t.replace(/\/\*[\s\S]*?\*\//g,'<span style="color: #6a9955;">$&</span>'),t=t.replace(/\/\/.*$/gm,'<span style="color: #6a9955;">$&</span>'),t=t.replace(/\b(\d+)\b/g,'<span style="color: #b5cea8;">$1</span>'),o.innerHTML=t})}document.addEventListener("DOMContentLoaded",()=>{w()});if("IntersectionObserver"in window){const e=document.querySelectorAll("img[data-src]"),o=new IntersectionObserver(t=>{t.forEach(s=>{if(s.isIntersecting){const r=s.target;r.src=r.dataset.src,r.classList.remove("lazy"),o.unobserve(r)}})});e.forEach(t=>o.observe(t))}function A(e,o){let t;return function(...r){const n=()=>{clearTimeout(t),e(...r)};clearTimeout(t),t=setTimeout(n,o)}}window.addEventListener("scroll",A(()=>{m()},10));window.addEventListener("load",()=>{document.body.classList.add("loaded")});const p=document.createElement("style");p.textContent=`
  body:not(.loaded) * {
    transition: none !important;
    animation: none !important;
  }
  
  .loaded {
    transition: opacity 0.3s ease;
  }
`;document.head.appendChild(p);document.querySelectorAll('a[href^="http"]').forEach(e=>{e.getAttribute("target")||(e.setAttribute("target","_blank"),e.setAttribute("rel","noopener noreferrer"))});function g(e,o,t){console.log("Event tracked:",{category:e,action:o,label:t})}document.querySelectorAll(".btn-primary").forEach(e=>{e.addEventListener("click",()=>{g("CTA","click",e.textContent.trim())})});document.querySelectorAll(".copy-btn").forEach(e=>{e.addEventListener("click",()=>{g("Code","copy","command")})});window.addEventListener("error",e=>{console.error("Resource failed to load:",e.target.src||e.target.href),e.target.tagName==="IMG"&&(e.target.style.display="none")},!0);document.addEventListener("keydown",e=>{e.key==="Escape"&&c.classList.contains("active")&&(c.classList.remove("active"),l.querySelectorAll("span").forEach(t=>{t.style.transform="none",t.style.opacity="1"}))});window.addEventListener("beforeprint",()=>{document.body.classList.add("printing")});window.addEventListener("afterprint",()=>{document.body.classList.remove("printing")});console.log("🪝 Claude Good Hooks landing page loaded successfully!");
