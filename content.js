(function() {
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('injected.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch(e) {}

  let botActive = false;
  let questionsAnswered = 0;
  let allDecrypted = [];

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function decrypt(encStr) {
    try {
      const key = "S1E9C5R@E@T*K)E(YS1E9C5R^E@T*K)E";
      const [ivHex, ctHex] = encStr.split(':');
      const keyBytes = new TextEncoder().encode(key);
      const iv = hexToBytes(ivHex);
      const ct = hexToBytes(ctHex);
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, {name:'AES-CBC'}, false, ['decrypt']);
      const dec = await crypto.subtle.decrypt({name:'AES-CBC', iv}, cryptoKey, ct);
      const text = new TextDecoder().decode(dec);
      return JSON.parse(text);
    } catch(e) { return null; }
  }

  function hexToBytes(hex) {
    const b = new Uint8Array(hex.length/2);
    for(let i=0;i<hex.length;i+=2) b[i/2]=parseInt(hex.substr(i,2),16);
    return b;
  }

  async function processQuestions(encQs) {
    updateOverlay(`🔓 Decrypting...`);
    allDecrypted = [];
    for (const enc of encQs) {
      const d = await decrypt(enc);
      if (d) allDecrypted.push(d);
    }
    const answers = allDecrypted.map(d => d?.question?.answers?.[0]);
    window.__matiksAnswers = answers;
    if (botActive) waitThenAnswer();
  }

  async function waitThenAnswer() {
    updateOverlay('⏳ Waiting...');
    for (let i = 0; i < 100; i++) {
      const input = findInput();
      if (input && !input.disabled && input.offsetParent !== null) break;
      await sleep(100);
    }
    for (let i = 10; i > 0; i--) {
      if (!botActive) return;
      updateOverlay(`⏳ Starting in ${i}...`);
      await sleep(1000);
    }
    await doAnswer();
  }

  function findInput() {
    return document.querySelector('input[placeholder="Enter answer"]') ||
           document.querySelector('input[placeholder="Enter Answer"]') ||
           document.querySelector('input[placeholder]') ||
           document.querySelector('input');
  }

  function setInputValue(input, val) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (nativeSetter?.set) nativeSetter.set.call(input, '');
    input.dispatchEvent(new Event('input', {bubbles:true}));
    if (nativeSetter?.set) nativeSetter.set.call(input, String(val));
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  }

  async function doAnswer() {
    const answers = allDecrypted.map(d => d?.question?.answers?.[0]);
    updateOverlay(`🚀 ${answers.length} questions`);

    for (let i = 0; i < answers.length; i++) {
      if (!botActive) break;
      const ans = answers[i];
      if (ans === null || ans === undefined) { await sleep(500); continue; }

      let input = null;
      for (let t = 0; t < 200; t++) {
        input = findInput();
        if (input && input.value === '' && !input.disabled) break;
        await sleep(100);
      }
      if (!input) continue;

      await sleep(400);
      if (input.value !== '') { i--; continue; }

      setInputValue(input, ans);
      questionsAnswered++;
      updateOverlay(`✏️ [${i+1}/${answers.length}] = ${ans}`);
      try { chrome.runtime.sendMessage({type:'STATS',count:questionsAnswered,last:String(ans)}); } catch(e){}

      await sleep(300);
      for (let t = 0; t < 150; t++) {
        const inp = findInput();
        if (!inp || inp.value === '') break;
        await sleep(100);
      }
    }
    updateOverlay(`🎉 Done! ${questionsAnswered} answered`);
  }

  window.addEventListener('__matiksGotData__', (e) => {
    if (botActive) processQuestions(e.detail);
  });

  function createOverlay() {
    document.getElementById('mb-ov')?.remove();
    const d = document.createElement('div');
    d.id = 'mb-ov';
    d.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:2147483647;background:rgba(10,20,30,0.95);color:#00ff88;font:bold 13px monospace;padding:12px 18px;border-radius:12px;border:1px solid #00ff88;box-shadow:0 0 20px rgba(0,255,136,.5);pointer-events:none;max-width:380px;line-height:1.8;';
    d.innerHTML = '🤖 MatiksBot<br><span id="mb-st" style="font-weight:normal;color:#aaa;font-size:11px">Ready!</span>';
    document.body.appendChild(d);
  }
  function updateOverlay(msg) {
    let e = document.getElementById('mb-st');
    if (!e) { createOverlay(); e = document.getElementById('mb-st'); }
    if (e) e.textContent = msg;
  }

  async function startBot() {
    botActive = true; questionsAnswered = 0;
    createOverlay();
    if (window.__matiksEncrypted?.length > 0) processQuestions(window.__matiksEncrypted);
    else if (allDecrypted.length > 0) waitThenAnswer();
    else updateOverlay('⏳ Waiting for game data...');
  }
  function stopBot() { botActive = false; document.getElementById('mb-ov')?.remove(); }

  chrome.runtime.onMessage.addListener((msg,_,res)=>{
    if(msg.type==='START'){startBot();res({ok:true});}
    if(msg.type==='STOP'){stopBot();res({ok:true});}
    if(msg.type==='STATUS')res({active:botActive,count:questionsAnswered});
  });
})();
