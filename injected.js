(function() {
  if (window.__matiksReady) return;
  window.__matiksReady = true;

  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch(...args);
    try {
      const body = args[1]?.body;
      if (typeof body === 'string' && (
        body.includes('GetGameByIdV2') ||
        body.includes('getGameByIdV2') ||
        body.includes('encryptedQuestions')
      )) {
        const clone = await res.clone().json();
        const encQs = clone?.data?.getGameByIdV2?.encryptedQuestions;
        if (encQs && encQs.length > 0) {
          window.__matiksEncrypted = encQs;
          window.dispatchEvent(new CustomEvent('__matiksGotData__', { detail: encQs }));
        }
      }
    } catch(e) {}
    return res;
  };

  const origXHR = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (typeof body === 'string' && (
      body.includes('GetGameByIdV2') ||
      body.includes('getGameByIdV2')
    )) {
      this.addEventListener('load', function() {
        try {
          const json = JSON.parse(this.responseText);
          const encQs = json?.data?.getGameByIdV2?.encryptedQuestions;
          if (encQs && encQs.length > 0) {
            window.__matiksEncrypted = encQs;
            window.dispatchEvent(new CustomEvent('__matiksGotData__', { detail: encQs }));
          }
        } catch(e) {}
      });
    }
    return origXHR.call(this, body);
  };
})();
