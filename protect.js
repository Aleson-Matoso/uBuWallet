/* Camada de proteção do protótipo uBu Wallet.
   Dificulta cópia, captura e inspeção no navegador. Nenhuma proteção client-side
   impede foto da tela com outro aparelho nem gravação de tela pelo sistema. */
(function(){
  'use strict';

  /* 1. Não permitir carregar dentro de outro site */
  if(window.top!==window.self){
    document.documentElement.innerHTML='';
    try{window.top.location=window.self.location}catch(_){}
    return;
  }

  var doc=document, root=doc.documentElement;

  /* 2. Cortina que cobre o conteúdo (perda de foco, captura, devtools) */
  var shield=doc.createElement('div');
  shield.id='shield';
  shield.innerHTML='<div id="shieldMsg">Conteúdo protegido</div><small>Volte para esta janela para continuar.</small>';
  doc.body.appendChild(shield);
  var reasons={};
  function cover(why,on,msg){
    if(on){reasons[why]=true}else{delete reasons[why]}
    var any=Object.keys(reasons).length>0;
    if(msg)doc.getElementById('shieldMsg').textContent=msg;
    shield.classList.toggle('on',any);
  }

  /* 3. Menu de contexto, arrastar, copiar, recortar, colar, seleção */
  ['contextmenu','dragstart','selectstart','copy','cut'].forEach(function(ev){
    doc.addEventListener(ev,function(e){
      var t=e.target;
      if(ev==='selectstart'&&t&&t.closest&&t.closest('input,textarea'))return;
      e.preventDefault();
    },true);
  });

  /* 4. Atalhos de teclado: bloqueia qualquer combinação com Ctrl, Cmd ou Alt e as teclas F1 a F24.
        Dentro de campos de texto continuam liberados: digitar (inclusive acentos via Option/AltGr),
        colar (Ctrl/Cmd+V), selecionar tudo (Ctrl/Cmd+A) e desfazer (Ctrl/Cmd+Z).
        Teclas simples (Tab, Enter, Espaço, setas) seguem funcionando para navegação e acessibilidade. */
  var blankTimer;
  function flash(ms){cover('key',true,'Captura de tela bloqueada');clearTimeout(blankTimer);blankTimer=setTimeout(function(){cover('key',false)},ms||1800)}
  var MODIFIERS=['control','meta','alt','altgraph','shift','capslock','os','fn','dead'];
  doc.addEventListener('keydown',function(e){
    var k=(e.key||'').toLowerCase();
    if(k==='printscreen'||k==='snapshot'){flash(2500);e.preventDefault();return}
    if(e.metaKey&&e.shiftKey&&('345'.indexOf(k)>-1||e.key==='#'||e.key==='$'||e.key==='%'))flash(2500); /* Cmd+Shift+3/4/5 no macOS */
    if(MODIFIERS.indexOf(k)>-1)return;
    var t=e.target, inField=!!(t&&t.closest&&t.closest('input,textarea,select'));
    var mod=e.ctrlKey||e.metaKey, alt=e.altKey;
    var fkey=(e.keyCode>=112&&e.keyCode<=135)||/^f([1-9]|1[0-9]|2[0-4])$/.test(k);
    var altGr=!!(e.getModifierState&&e.getModifierState('AltGraph'));
    if(!fkey&&!mod&&!alt&&!(k==='backspace'&&!inField))return;          /* teclas simples */
    var allowed=inField&&!fkey&&(
      (mod&&!alt&&!e.shiftKey&&(k==='v'||k==='a'||k==='z'))||           /* colar, selecionar tudo, desfazer */
      (altGr&&k.length===1)||                                           /* símbolos com AltGr */
      (alt&&!mod&&k.length===1));                                       /* acentos e símbolos com Option */
    if(!allowed){e.preventDefault();e.stopPropagation();return false}
  },true);
  /* Zoom por Ctrl+rolagem e gesto de pinça */
  doc.addEventListener('wheel',function(e){if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false,capture:true});
  ['gesturestart','gesturechange','gestureend'].forEach(function(ev){doc.addEventListener(ev,function(e){e.preventDefault()},true)});
  doc.addEventListener('keyup',function(e){
    if((e.key||'').toLowerCase()==='printscreen'){
      try{navigator.clipboard.writeText('Conteúdo protegido')}catch(_){}
      flash(2500);
    }
  },true);
  window.addEventListener('beforeprint',function(){cover('print',true,'Impressão bloqueada')});
  window.addEventListener('afterprint',function(){cover('print',false)});

  /* 5. Esconde o conteúdo quando a janela perde foco ou a aba fica oculta
        (alternador de apps, ferramentas de captura, painel do inspetor) */
  window.addEventListener('blur',function(){cover('blur',true,'Conteúdo protegido')});
  window.addEventListener('focus',function(){cover('blur',false)});
  doc.addEventListener('visibilitychange',function(){cover('hidden',doc.hidden,'Conteúdo protegido')});
  window.addEventListener('pagehide',function(){cover('hidden',true)});
  window.addEventListener('pageshow',function(){cover('hidden',false)});
  if(!doc.hasFocus())cover('blur',true);

  /* 6. Detecção de DevTools (janela acoplada e pausa por debugger) */
  var devOpen=false;
  function setDev(v){
    if(v===devOpen)return;
    devOpen=v;
    cover('devtools',v,'Ferramentas de desenvolvedor detectadas');
    if(v)try{console.clear()}catch(_){}
  }
  function check(){
    var wide=(window.outerWidth-window.innerWidth)>200, tall=(window.outerHeight-window.innerHeight)>260;
    var t=performance.now();
    (function(){debugger})();
    var paused=(performance.now()-t)>120;
    setDev(wide||tall||paused);
  }
  setInterval(check,1000);
  window.addEventListener('resize',check);

  /* 7. Console sem pistas */
  try{
    var noop=function(){};
    ['log','info','warn','error','debug','table','dir','trace'].forEach(function(m){console[m]=noop});
  }catch(_){}

  /* 8. A cortina volta ao DOM se for removida pelo inspetor */
  function guard(){if(!shield.isConnected)doc.body.appendChild(shield)}
  new MutationObserver(guard).observe(doc.body,{childList:true});
  setInterval(guard,2000);

  /* 9. Sem cache de página restaurada */
  window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
})();
