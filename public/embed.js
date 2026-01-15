(() => {
    const EMBED_VERSION = '1.0.0';

    const currentScript = document.currentScript;
    if (!currentScript) return;

    const apiBase = currentScript.getAttribute('data-api-base') || '';
    const title = currentScript.getAttribute('data-title') || 'Chat';
    const position = (currentScript.getAttribute('data-position') || 'right').toLowerCase();
    const primary = currentScript.getAttribute('data-primary') || '#15ff00';
    const fixedWorkflow = currentScript.getAttribute('data-workflow') || null;
    const greeting = currentScript.getAttribute('data-greeting') || null;
    const colorScheme = currentScript.getAttribute('data-theme') || 'light';
    const accentColor = currentScript.getAttribute('data-accent') || '#2D8CFF';
    const radius = currentScript.getAttribute('data-radius') || 'pill';
    const density = currentScript.getAttribute('data-density') || 'normal';

    if (!apiBase) {
        // Fail silently (no console spam) for production embeds.
        return;
    }

    const host = document.createElement('div');
    host.setAttribute('data-chatkit-embed', EMBED_VERSION);
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
    :host { all: initial; }
    .ck-root {
      position: fixed;
      bottom: 20px;
      ${position === 'left' ? 'left: 20px;' : 'right: 20px;'}
      z-index: 2147483647;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: #00fa21;
    }
    .ck-bubble {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      background: ${primary};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(0,0,0,0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }
    .ck-bubble:hover { transform: translateY(-1px); box-shadow: 0 16px 34px rgba(0,0,0,0.25); }
    .ck-bubble:active { transform: translateY(0px); }

    .ck-panel {
      position: absolute;
      bottom: 72px;
      ${position === 'left' ? 'left: 0;' : 'right: 0;'}
      width: 320px;
      height: 600px;
      max-height: min(600px, calc(100vh - 120px));
      background: white;
      border-radius: 16px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0);
      overflow: hidden;
      display: none;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    .ck-panel.open { display: block; }

        .ck-titleChip {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 2;
            max-width: calc(100% - 56px);
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 650;
            color: #0f172a;
            background: rgba(248, 250, 252, 0.92);
            border: 1px solid rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(8px);
            box-shadow: 0 10px 24px rgba(0,0,0,0.10);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        }

        .ck-workflowPicker {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 3;
            max-width: calc(100% - 140px);
            height: 32px;
            padding: 0 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 650;
            color: #0f172a;
            background: rgba(248, 250, 252, 0.92);
            border: 1px solid rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(8px);
            box-shadow: 0 10px 24px rgba(0,0,0,0.10);
            outline: none;
            appearance: none;
            -webkit-appearance: none;
            cursor: pointer;
        }

        .ck-topRightMask {
            position: absolute;
            top: 10px;
            right: 52px;
            width: 42px;
            height: 32px;
            z-index: 2;
            border-radius: 10px;
            background: #fff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            pointer-events: auto;
        }

    .ck-close {
      position: absolute;
      top: 10px;
            right: 10px;
      z-index: 2;
      border: none;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #334155;
      background: rgba(248, 250, 252, 0.9);
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.10);
    }
    .ck-close:hover { background: rgba(241, 245, 249, 0.95); }

    .ck-body {
      position: relative;
      height: 100%;
    }

    .ck-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      font-size: 13px;
      padding: 16px;
      text-align: center;
    }

    .ck-error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      justify-content: center;
      padding: 16px;
      text-align: center;
      color: #334155;
      font-size: 13px;
    }
    .ck-retry {
      border: none;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      background: ${primary};
      color: white;
      font-weight: 600;
    }
  `;

    const root = document.createElement('div');
    root.className = 'ck-root';

    const panel = document.createElement('div');
    panel.className = 'ck-panel';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ck-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

    const body = document.createElement('div');
    body.className = 'ck-body';

    const titleChip = document.createElement('div');
    titleChip.className = 'ck-titleChip';
    titleChip.textContent = title;

    const workflowSelect = document.createElement('select');
    workflowSelect.className = 'ck-workflowPicker';
    workflowSelect.setAttribute('aria-label', 'Workflow');
    workflowSelect.style.display = 'none';

    // ChatKit iframe renders some header controls (e.g. edit/rename) we may want to hide.
    // We cannot reliably style inside the iframe, so we mask the top-right control slot.
    const topRightMask = document.createElement('div');
    topRightMask.className = 'ck-topRightMask';
    topRightMask.setAttribute('aria-hidden', 'true');

    const loading = document.createElement('div');
    loading.className = 'ck-loading';
    loading.textContent = 'Loading chat…';

    body.appendChild(loading);

    panel.appendChild(titleChip);
    panel.appendChild(workflowSelect);
    panel.appendChild(topRightMask);
    panel.appendChild(closeBtn);
    panel.appendChild(body);

    const bubble = document.createElement('button');
    bubble.className = 'ck-bubble';
    bubble.setAttribute('aria-label', title);
    bubble.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 8h10M7 12h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <path d="M21 12c0 4.418-4.03 8-9 8a10.6 10.6 0 0 1-3.6-.62L3 20l1.7-4.02A7.3 7.3 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;

    root.appendChild(panel);
    root.appendChild(bubble);

    shadow.appendChild(style);
    shadow.appendChild(root);

    function getDeviceId() {
        const key = '__oai_chatkit_device_id';
        try {
            const existing = localStorage.getItem(key);
            if (existing) return existing;
            const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `anon_${Math.random().toString(16).slice(2)}${Date.now()}`;
            localStorage.setItem(key, id);
            return id;
        } catch {
            return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `anon_${Math.random().toString(16).slice(2)}${Date.now()}`;
        }
    }

    async function loadChatKitScript() {
        if (customElements.get('openai-chatkit')) return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('CHATKIT_SCRIPT_LOAD_FAILED'));
            document.head.appendChild(s);
        });
    }

    let chatkitEl = null;
    let inflightSecret = null;
    let lastSecret = null;
    let lastSecretAt = 0;

    let allowedWorkflows = null;
    let selectedWorkflowKey = null;

    function storageKey(name) {
        return `__softchatbot_${name}_${apiBase.replace(/[^a-z0-9]/gi, '_')}`;
    }

    async function loadAllowedWorkflows() {
        if (allowedWorkflows) return allowedWorkflows;
        try {
            const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/chatkit/workflows`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (!data || !Array.isArray(data.workflows)) return null;
            allowedWorkflows = {
                workflows: data.workflows.filter((w) => w && typeof w.key === 'string' && typeof w.label === 'string'),
                defaultKey: typeof data.default_workflow_key === 'string' ? data.default_workflow_key : null,
            };
            return allowedWorkflows;
        } catch {
            return null;
        }
    }

    function getSavedWorkflowKey() {
        try {
            return localStorage.getItem(storageKey('workflow_key'));
        } catch {
            return null;
        }
    }

    function saveWorkflowKey(key) {
        try {
            localStorage.setItem(storageKey('workflow_key'), key);
        } catch {
            // ignore
        }
    }

    function resetChatSession() {
        lastSecret = null;
        inflightSecret = null;
        lastSecretAt = 0;
        if (chatkitEl && chatkitEl.parentNode) {
            try {
                chatkitEl.parentNode.removeChild(chatkitEl);
            } catch {
                // ignore
            }
        }
        chatkitEl = null;
    }

    async function fetchClientSecret(existing) {
        // Small guard against tight loops.
        const now = Date.now();
        if (existing && lastSecret && (now - lastSecretAt) < 30_000) {
            return lastSecret;
        }

        if (inflightSecret) return inflightSecret;

        inflightSecret = (async () => {
            const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/chatkit/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: getDeviceId(), workflow_key: selectedWorkflowKey }),
            });

            if (!res.ok) {
                throw new Error('SESSION_CREATE_FAILED');
            }

            const data = await res.json();
            if (!data || typeof data.client_secret !== 'string') {
                throw new Error('SESSION_CREATE_FAILED');
            }

            lastSecret = data.client_secret;
            lastSecretAt = Date.now();
            return data.client_secret;
        })();

        try {
            return await inflightSecret;
        } finally {
            inflightSecret = null;
        }
    }

    function showError() {
        body.innerHTML = '';
        const err = document.createElement('div');
        err.className = 'ck-error';
        err.innerHTML = `<div>Chat şu anda başlatılamadı.</div>`;
        const btn = document.createElement('button');
        btn.className = 'ck-retry';
        btn.textContent = 'Tekrar dene';
        btn.addEventListener('click', () => {
            body.innerHTML = '';
            body.appendChild(loading);
            mountChat();
        });
        err.appendChild(btn);
        body.appendChild(err);
    }

    async function mountChat() {
        try {
            await loadChatKitScript();

            // If a specific workflow is specified in embed code, use only that one (no dropdown)
            if (fixedWorkflow) {
                titleChip.style.display = 'block';
                workflowSelect.style.display = 'none';
                selectedWorkflowKey = fixedWorkflow;
            } else {
                // No specific workflow in embed code, load all available workflows for this origin
                const wf = await loadAllowedWorkflows();
                if (wf && Array.isArray(wf.workflows) && wf.workflows.length > 1) {
                    titleChip.style.display = 'none';
                    workflowSelect.style.display = 'block';

                    if (workflowSelect.options.length === 0) {
                        wf.workflows.forEach((w) => {
                            const opt = document.createElement('option');
                            opt.value = w.key;
                            opt.textContent = w.label;
                            workflowSelect.appendChild(opt);
                        });
                    }

                    const saved = getSavedWorkflowKey();
                    selectedWorkflowKey = saved || wf.defaultKey || wf.workflows[0].key;
                    workflowSelect.value = selectedWorkflowKey;

                    workflowSelect.onchange = () => {
                        selectedWorkflowKey = workflowSelect.value;
                        saveWorkflowKey(selectedWorkflowKey);
                        resetChatSession();
                        mountChat();
                    };
                } else {
                    titleChip.style.display = 'block';
                    workflowSelect.style.display = 'none';
                    selectedWorkflowKey = wf && wf.workflows && wf.workflows.length === 1 ? wf.workflows[0].key : null;
                }
            }

            if (!chatkitEl) {
                chatkitEl = document.createElement('openai-chatkit');
                chatkitEl.style.height = '100%';
                chatkitEl.style.width = '100%';
                chatkitEl.style.display = 'block';
                body.innerHTML = '';
                body.appendChild(chatkitEl);

                // Surface errors (still safe for end-users).
                chatkitEl.addEventListener('chatkit.error', () => {
                    // ChatKit will attempt refresh via getClientSecret(existing) when it can.
                    // If it cannot recover, we show a minimal retry UI.
                    // (We intentionally avoid logging details in the browser.)
                });

                chatkitEl.setOptions({
                    frameTitle: title,
                    api: {
                        async getClientSecret(existing) {
                            // ChatKit calls this to start or refresh a session.
                            return fetchClientSecret(existing);
                        },
                    },
                    theme: {
                        colorScheme: colorScheme,
                        color: {
                            accent: {
                                primary: accentColor,
                                level: 2
                            }
                        },
                        radius: radius,
                        density: density,
                        typography: {
                            baseSize: 16,
                            fontFamily: '"OpenAI Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                            fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSources: [
                                {
                                    family: 'OpenAI Sans',
                                    src: 'https://cdn.openai.com/common/fonts/openai-sans/v2/OpenAISans-Regular.woff2',
                                    weight: 400,
                                    style: 'normal',
                                    display: 'swap'
                                }
                            ]
                        }
                    },
                    composer: {
                        placeholder: 'Mesaj yazin...',
                        attachments: {
                            enabled: false
                        }
                    },
                    startScreen: {
                        greeting: greeting || 'Merhaba! Size nasil yardimci olabilirim?',
                        prompts: []
                    }
                });
            }
        } catch {
            showError();
        }
    }

    function openPanel() {
        panel.classList.add('open');
        mountChat();
    }

    function closePanel() {
        panel.classList.remove('open');
    }

    bubble.addEventListener('click', () => {
        if (panel.classList.contains('open')) closePanel();
        else openPanel();
    });

    closeBtn.addEventListener('click', closePanel);

    // Close on ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });
})();
