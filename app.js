// Micro-TIL Application Logic
(() => {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    USERNAME: 'micro_til_gh_username',
    REPO: 'micro_til_gh_repo',
    BRANCH: 'micro_til_gh_branch',
    FILE_PATH: 'micro_til_gh_filepath',
    STRATEGY: 'micro_til_gh_strategy',
    TOKEN: 'micro_til_gh_token',
    THEME: 'micro_til_theme',
    DRAFT_TITLE: 'micro_til_draft_title',
    DRAFT_BODY: 'micro_til_draft_body',
    DRAFT_URL: 'micro_til_draft_url',
    DRAFT_CAT: 'micro_til_draft_cat'
  };

  // State
  let config = {
    username: localStorage.getItem(STORAGE_KEYS.USERNAME) || '',
    repo: localStorage.getItem(STORAGE_KEYS.REPO) || '',
    branch: localStorage.getItem(STORAGE_KEYS.BRANCH) || 'main',
    filePath: localStorage.getItem(STORAGE_KEYS.FILE_PATH) || 'TIL.md',
    strategy: localStorage.getItem(STORAGE_KEYS.STRATEGY) || 'single',
    token: localStorage.getItem(STORAGE_KEYS.TOKEN) || ''
  };

  let activeCategory = localStorage.getItem(STORAGE_KEYS.DRAFT_CAT) || '💡 Insight';

  // DOM Elements
  const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    navSettingsBtn: document.getElementById('navSettingsBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    repoStatus: document.getElementById('repoStatus'),
    setupBanner: document.getElementById('setupBanner'),
    openSettingsFromBanner: document.getElementById('openSettingsFromBanner'),
    
    // Form elements
    tilForm: document.getElementById('tilForm'),
    categoryPills: document.querySelectorAll('#categoryPills .pill'),
    tilTitle: document.getElementById('tilTitle'),
    titleCharCount: document.getElementById('titleCharCount'),
    tilBody: document.getElementById('tilBody'),
    tilUrl: document.getElementById('tilUrl'),
    autosaveStatus: document.getElementById('autosaveStatus'),
    targetFileDisplay: document.getElementById('targetFileDisplay'),
    submitBtn: document.getElementById('submitBtn'),
    btnSpinner: document.getElementById('btnSpinner'),
    btnText: document.getElementById('btnText'),
    quickToolBtns: document.querySelectorAll('.tool-btn'),

    // History elements
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    historyList: document.getElementById('historyList'),
    historyLoading: document.getElementById('historyLoading'),
    historyEmpty: document.getElementById('historyEmpty'),

    // Settings form elements
    settingsForm: document.getElementById('settingsForm'),
    ghUsername: document.getElementById('ghUsername'),
    ghRepo: document.getElementById('ghRepo'),
    ghBranch: document.getElementById('ghBranch'),
    ghFilePath: document.getElementById('ghFilePath'),
    filePathGroup: document.getElementById('filePathGroup'),
    ghToken: document.getElementById('ghToken'),
    toggleTokenVisibility: document.getElementById('toggleTokenVisibility'),
    testConnBtn: document.getElementById('testConnBtn'),
    clearDataBtn: document.getElementById('clearDataBtn'),
    strategyRadios: document.querySelectorAll('input[name="strategy"]'),

    // Modal & Toast
    successModal: document.getElementById('successModal'),
    modalCommitMsg: document.getElementById('modalCommitMsg'),
    modalFile: document.getElementById('modalFile'),
    modalSha: document.getElementById('modalSha'),
    modalGhLink: document.getElementById('modalGhLink'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    toast: document.getElementById('toast')
  };

  // Helper: UTF-8 safe Base64 encode/decode
  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  // Toast notification
  function showToast(message, type = 'info', duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, duration);
  }

  // Formatting relative time
  function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  // Update target file display badge
  function updateTargetDisplay() {
    if (!config.username || !config.repo) {
      elements.targetFileDisplay.textContent = 'Not configured yet (see Settings)';
      elements.repoStatus.className = 'status-indicator';
      elements.repoStatus.querySelector('.status-text').textContent = 'Not configured';
      elements.setupBanner.classList.remove('hidden');
      return;
    }

    elements.setupBanner.classList.add('hidden');
    elements.repoStatus.className = 'status-indicator connected';
    elements.repoStatus.querySelector('.status-text').textContent = `${config.username}/${config.repo}`;

    const effectivePath = getEffectiveFilePath();
    elements.targetFileDisplay.textContent = `${config.username}/${config.repo} → ${effectivePath}`;
  }

  // Get active file path (single vs daily)
  function getEffectiveFilePath() {
    if (config.strategy === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      return `til/${today}.md`;
    }
    return config.filePath || 'TIL.md';
  }

  // Tab switching
  function switchTab(tabId) {
    elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'historyTab') {
      fetchCommitHistory();
    }
  }

  // Switch Theme
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggleBtn.textContent = savedTheme === 'light' ? '🌞' : '🌙';
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    elements.themeToggleBtn.textContent = newTheme === 'light' ? '🌞' : '🌙';
  }

  // GitHub API Header generator
  function getHeaders() {
    return {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // GitHub Test Connection
  async function testGitHubConnection(testConfig) {
    const { username, repo, branch, token } = testConfig;
    if (!token) throw new Error('Personal Access Token is required.');
    if (!username || !repo) throw new Error('Username and Repo are required.');

    const res = await fetch(`https://api.github.com/repos/${username}/${repo}/branches/${branch}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) throw new Error('Invalid token or insufficient permissions.');
    if (res.status === 404) throw new Error(`Repository "${username}/${repo}" or branch "${branch}" not found.`);
    if (!res.ok) throw new Error(`GitHub error: ${res.statusText}`);

    const data = await res.json();
    return data;
  }

  // Fetch Existing File from GitHub
  async function fetchFileContent(filePath) {
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}?ref=${config.branch}`;
    const res = await fetch(url, { headers: getHeaders() });

    if (res.status === 404) {
      return { exists: false, content: '', sha: null };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch file (${res.status})`);
    }

    const data = await res.json();
    return {
      exists: true,
      content: base64ToUtf8(data.content.replace(/\n/g, '')),
      sha: data.sha
    };
  }

  // Commit and Push to GitHub
  async function commitToGitHub(entry) {
    const filePath = getEffectiveFilePath();
    const { exists, content: oldContent, sha } = await fetchFileContent(filePath);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeFormatted = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Format new entry in clean Markdown
    let entryMarkdown = `### ${entry.category} ${entry.title}\n`;
    entryMarkdown += `> _Logged on ${dateFormatted} at ${timeFormatted}_\n\n`;
    entryMarkdown += `${entry.body.trim()}\n`;
    if (entry.url) {
      entryMarkdown += `\n🔗 **Reference:** [${entry.url}](${entry.url})\n`;
    }
    entryMarkdown += `\n---\n\n`;

    let finalContent = '';
    if (exists) {
      // Append right after header or at the bottom
      if (oldContent.includes('---')) {
        const parts = oldContent.split(/---\s*\n/);
        const header = parts[0] + '---\n\n';
        const rest = parts.slice(1).join('---\n\n');
        // Prepend newest entry to the top of entries
        finalContent = `${header}${entryMarkdown}${rest}`;
      } else {
        finalContent = `${oldContent}\n\n${entryMarkdown}`;
      }
    } else {
      // Create initial header for new file
      finalContent = `# 📚 Today I Learned (TIL)\n\nPersonal log of micro-learnings and development insights.\n\n---\n\n${entryMarkdown}`;
    }

    const commitMessage = `docs(til): ${entry.category} - ${entry.title}`;

    const putUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}`;
    const payload = {
      message: commitMessage,
      content: utf8ToBase64(finalContent),
      branch: config.branch
    };
    if (sha) {
      payload.sha = sha;
    }

    const res = await fetch(putUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to push commit (${res.status})`);
    }

    const result = await res.json();
    return {
      commitSha: result.commit.sha,
      htmlUrl: result.commit.html_url,
      filePath: filePath,
      commitMessage: commitMessage
    };
  }

  // Fetch Recent Commits for History Tab
  async function fetchCommitHistory() {
    if (!config.username || !config.repo || !config.token) {
      elements.historyLoading.classList.add('hidden');
      elements.historyEmpty.classList.remove('hidden');
      elements.historyList.innerHTML = '';
      return;
    }

    elements.historyLoading.classList.remove('hidden');
    elements.historyEmpty.classList.add('hidden');
    elements.historyList.innerHTML = '';

    try {
      const url = `https://api.github.com/repos/${config.username}/${config.repo}/commits?sha=${config.branch}&per_page=12`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Unable to fetch history');

      const commits = await res.json();
      elements.historyLoading.classList.add('hidden');

      if (!commits || commits.length === 0) {
        elements.historyEmpty.classList.remove('hidden');
        return;
      }

      elements.historyList.innerHTML = commits.map(c => `
        <article class="commit-card">
          <div class="commit-header">
            <span class="commit-msg">${escapeHtml(c.commit.message.split('\n')[0])}</span>
            <span class="commit-time">${formatRelativeTime(c.commit.author.date)}</span>
          </div>
          <div class="commit-footer">
            <span class="commit-author">👤 ${escapeHtml(c.commit.author.name)}</span>
            <a href="${c.html_url}" target="_blank" rel="noopener" class="commit-sha">
              #${c.sha.substring(0, 7)} ↗
            </a>
          </div>
        </article>
      `).join('');
    } catch (err) {
      elements.historyLoading.classList.add('hidden');
      elements.historyEmpty.classList.remove('hidden');
      elements.historyEmpty.textContent = `Error loading history: ${err.message}`;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Draft Autosave
  function saveDraft() {
    localStorage.setItem(STORAGE_KEYS.DRAFT_TITLE, elements.tilTitle.value);
    localStorage.setItem(STORAGE_KEYS.DRAFT_BODY, elements.tilBody.value);
    localStorage.setItem(STORAGE_KEYS.DRAFT_URL, elements.tilUrl.value);
    localStorage.setItem(STORAGE_KEYS.DRAFT_CAT, activeCategory);
    elements.autosaveStatus.textContent = 'Draft autosaved';
  }

  function loadDraft() {
    elements.tilTitle.value = localStorage.getItem(STORAGE_KEYS.DRAFT_TITLE) || '';
    elements.tilBody.value = localStorage.getItem(STORAGE_KEYS.DRAFT_BODY) || '';
    elements.tilUrl.value = localStorage.getItem(STORAGE_KEYS.DRAFT_URL) || '';
    
    const savedCat = localStorage.getItem(STORAGE_KEYS.DRAFT_CAT);
    if (savedCat) {
      activeCategory = savedCat;
      elements.categoryPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.cat === savedCat);
      });
    }

    elements.titleCharCount.textContent = `${elements.tilTitle.value.length}/80`;
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_TITLE);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_BODY);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_URL);
    elements.tilTitle.value = '';
    elements.tilBody.value = '';
    elements.tilUrl.value = '';
    elements.titleCharCount.textContent = '0/80';
    elements.autosaveStatus.textContent = 'All clear';
  }

  // Quick Formatting Tools
  function insertFormatting(type) {
    const ta = elements.tilBody;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    let replacement = '';

    switch (type) {
      case 'code':
        replacement = selected ? `\`${selected}\`` : '`code`';
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'Key takeaway'}`;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Quote'}`;
        break;
      case 'link':
        replacement = `[${selected || 'Link Title'}](url)`;
        break;
      case 'bold':
        replacement = `**${selected || 'bold'}**`;
        break;
    }

    ta.setRangeText(replacement, start, end, 'end');
    ta.focus();
    saveDraft();
  }

  // Event Listeners
  function initListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Tab buttons
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    elements.navSettingsBtn.addEventListener('click', () => switchTab('settingsTab'));
    elements.openSettingsFromBanner.addEventListener('click', () => switchTab('settingsTab'));

    // Category Pills
    elements.categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.cat;
        saveDraft();
      });
    });

    // Formatting tools
    elements.quickToolBtns.forEach(btn => {
      btn.addEventListener('click', () => insertFormatting(btn.dataset.tool));
    });

    // Autosave inputs
    elements.tilTitle.addEventListener('input', () => {
      elements.titleCharCount.textContent = `${elements.tilTitle.value.length}/80`;
      saveDraft();
    });
    elements.tilBody.addEventListener('input', saveDraft);
    elements.tilUrl.addEventListener('input', saveDraft);

    // Form Submit (Commit to GitHub)
    elements.tilForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!config.token || !config.username || !config.repo) {
        showToast('Please configure GitHub settings first!', 'error');
        switchTab('settingsTab');
        return;
      }

      const title = elements.tilTitle.value.trim();
      const body = elements.tilBody.value.trim();
      const url = elements.tilUrl.value.trim();

      if (!title || !body) {
        showToast('Please provide both title and notes.', 'error');
        return;
      }

      // UI Loading state
      elements.submitBtn.disabled = true;
      elements.btnSpinner.classList.remove('hidden');
      elements.btnText.textContent = 'Pushing to GitHub...';

      try {
        const result = await commitToGitHub({
          category: activeCategory,
          title,
          body,
          url
        });

        // Show Success Modal
        elements.modalCommitMsg.textContent = result.commitMessage;
        elements.modalFile.textContent = result.filePath;
        elements.modalSha.textContent = result.commitSha.substring(0, 7);
        elements.modalGhLink.href = result.htmlUrl;
        elements.successModal.classList.remove('hidden');

        clearDraft();
        showToast('Committed successfully! 🎉', 'success');
      } catch (err) {
        console.error(err);
        showToast(`Commit failed: ${err.message}`, 'error', 5000);
      } finally {
        elements.submitBtn.disabled = false;
        elements.btnSpinner.classList.add('hidden');
        elements.btnText.textContent = '🚀 Push Commit to GitHub';
      }
    });

    // Modal close
    elements.modalCloseBtn.addEventListener('click', () => {
      elements.successModal.classList.add('hidden');
    });

    // Refresh history
    elements.refreshHistoryBtn.addEventListener('click', fetchCommitHistory);

    // Toggle token password visibility
    elements.toggleTokenVisibility.addEventListener('click', () => {
      const isPwd = elements.ghToken.type === 'password';
      elements.ghToken.type = isPwd ? 'text' : 'password';
      elements.toggleTokenVisibility.textContent = isPwd ? 'Hide' : 'Show';
    });

    // Strategy radio changes
    elements.strategyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        elements.filePathGroup.style.display = e.target.value === 'daily' ? 'none' : 'block';
      });
    });

    // Settings Form Submit
    elements.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const strategy = document.querySelector('input[name="strategy"]:checked').value;
      config = {
        username: elements.ghUsername.value.trim(),
        repo: elements.ghRepo.value.trim(),
        branch: elements.ghBranch.value.trim() || 'main',
        filePath: elements.ghFilePath.value.trim() || 'TIL.md',
        strategy: strategy,
        token: elements.ghToken.value.trim()
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.USERNAME, config.username);
      localStorage.setItem(STORAGE_KEYS.REPO, config.repo);
      localStorage.setItem(STORAGE_KEYS.BRANCH, config.branch);
      localStorage.setItem(STORAGE_KEYS.FILE_PATH, config.filePath);
      localStorage.setItem(STORAGE_KEYS.STRATEGY, config.strategy);
      localStorage.setItem(STORAGE_KEYS.TOKEN, config.token);

      updateTargetDisplay();
      showToast('Settings saved successfully!', 'success');
      switchTab('writeTab');
    });

    // Test Connection Button
    elements.testConnBtn.addEventListener('click', async () => {
      const testConf = {
        username: elements.ghUsername.value.trim(),
        repo: elements.ghRepo.value.trim(),
        branch: elements.ghBranch.value.trim() || 'main',
        token: elements.ghToken.value.trim()
      };

      elements.testConnBtn.disabled = true;
      elements.testConnBtn.textContent = 'Testing...';

      try {
        await testGitHubConnection(testConf);
        showToast('Connection verified successfully! ✅', 'success');
      } catch (err) {
        showToast(`Test failed: ${err.message}`, 'error', 5000);
      } finally {
        elements.testConnBtn.disabled = false;
        elements.testConnBtn.textContent = '🔍 Test Connection';
      }
    });

    // Clear local data
    elements.clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your saved credentials and draft?')) {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        config = { username: '', repo: '', branch: 'main', filePath: 'TIL.md', strategy: 'single', token: '' };
        elements.ghUsername.value = '';
        elements.ghRepo.value = '';
        elements.ghToken.value = '';
        clearDraft();
        updateTargetDisplay();
        showToast('All local data cleared.', 'info');
      }
    });
  }

  // Populate settings form from config
  function populateSettingsForm() {
    elements.ghUsername.value = config.username;
    elements.ghRepo.value = config.repo;
    elements.ghBranch.value = config.branch;
    elements.ghFilePath.value = config.filePath;
    elements.ghToken.value = config.token;

    elements.strategyRadios.forEach(radio => {
      radio.checked = radio.value === config.strategy;
    });

    elements.filePathGroup.style.display = config.strategy === 'daily' ? 'none' : 'block';
  }

  // Register PWA Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }

  // Init App
  function init() {
    initTheme();
    populateSettingsForm();
    loadDraft();
    updateTargetDisplay();
    initListeners();
    registerServiceWorker();
  }

  init();
})();
