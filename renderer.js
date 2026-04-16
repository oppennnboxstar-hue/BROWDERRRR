class BrowserUI {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.nextTabId = 1;
    this.bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    this.homeUrl = 'https://www.perplexity.ai';
    this.isMaximized = false;
    
    this.init();
  }
  
  init() {
    this.bindElements();
    this.bindEvents();
    this.setupTorStatus();
    this.setupSidebarResizer();
    this.createNewTab(this.homeUrl);
    this.setupElectronListeners();
  }
  
  bindElements() {
    this.elements = {
      tabsContainer: document.getElementById('tabs-container'),
      webviewsContainer: document.getElementById('webviews-container'),
      addressBar: document.getElementById('address-bar'),
      backBtn: document.getElementById('back-btn'),
      forwardBtn: document.getElementById('forward-btn'),
      refreshBtn: document.getElementById('refresh-btn'),
      homeBtn: document.getElementById('home-btn'),
      goBtn: document.getElementById('go-btn'),
      newTabBtn: document.getElementById('new-tab-btn'),
      bookmarkBtn: document.getElementById('bookmark-btn'),
      minimizeBtn: document.getElementById('minimize-btn'),
      maximizeBtn: document.getElementById('maximize-btn'),
      closeBtn: document.getElementById('close-btn'),
      newIdentityBtn: document.getElementById('new-identity-btn'),
      torStatus: document.getElementById('tor-status'),
      sidebar: document.getElementById('sidebar'),
      perplexityWebview: document.getElementById('perplexity-webview')
    };
  }
  
  bindEvents() {
    this.elements.newTabBtn.addEventListener('click', () => this.createNewTab(this.homeUrl));
    this.elements.backBtn.addEventListener('click', () => this.getActiveWebview()?.back());
    this.elements.forwardBtn.addEventListener('click', () => this.getActiveWebview()?.forward());
    this.elements.refreshBtn.addEventListener('click', () => this.getActiveWebview()?.reload());
    this.elements.homeBtn.addEventListener('click', () => this.navigateToHome());
    this.elements.goBtn.addEventListener('click', () => this.navigateToUrl());
    this.elements.addressBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.navigateToUrl();
    });
    this.elements.bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
    
    this.elements.minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
    this.elements.maximizeBtn.addEventListener('click', () => this.toggleMaximize());
    this.elements.closeBtn.addEventListener('click', () => window.electronAPI.close());
    this.elements.newIdentityBtn.addEventListener('click', () => this.requestNewIdentity());
  }
  
  setupTorStatus() {
    const updateStatus = async () => {
      try {
        const isReady = await window.electronAPI.getTorStatus();
        const statusEl = this.elements.torStatus;
        
        if (isReady) {
          statusEl.className = 'tor-status connected';
          statusEl.querySelector('.tor-text').textContent = 'Tor: Подключен';
        } else {
          statusEl.className = 'tor-status connecting';
          statusEl.querySelector('.tor-text').textContent = 'Tor: Подключение...';
        }
      } catch (error) {
        console.error('Tor status check failed:', error);
      }
    };
    
    updateStatus();
    setInterval(updateStatus, 5000);
  }
  
  setupSidebarResizer() {
    const resizer = document.querySelector('.sidebar-resizer');
    const sidebar = this.elements.sidebar;
    let isResizing = false;
    let startX, startWidth;
    
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(300, Math.min(600, startWidth + diff));
      sidebar.style.width = `${newWidth}px`;
    });
    
    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = 'default';
    });
  }
  
  setupElectronListeners() {
    window.electronAPI.onNewTab((url) => {
      this.createNewTab(url);
    });
  }
  
  createNewTab(url) {
    const tabId = this.nextTabId++;
    
    const webview = document.createElement('webview');
    webview.id = `webview-${tabId}`;
    webview.src = url || this.homeUrl;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no');
    webview.classList.add('active');
    
    this.elements.webviewsContainer.appendChild(webview);
    
    const tab = {
      id: tabId,
      webview: webview,
      title: 'Новая вкладка',
      url: url || this.homeUrl
    };
    
    this.tabs.push(tab);
    this.renderTab(tab);
    this.setActiveTab(tabId);
    
    this.bindWebviewEvents(webview, tabId);
  }
  
  renderTab(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tab.id;
    
    tabEl.innerHTML = `
      <span class="tab-title">${tab.title}</span>
      <span class="tab-close">×</span>
    `;
    
    tabEl.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.setActiveTab(tab.id);
      }
    });
    
    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });
    
    this.elements.tabsContainer.appendChild(tabEl);
    tab.element = tabEl;
  }
  
  bindWebviewEvents(webview, tabId) {
    webview.addEventListener('page-title-updated', (e) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.title = e.title;
        this.updateTabElement(tabId);
      }
    });
    
    webview.addEventListener('page-favicon-updated', (e) => {
      // Можно добавить отображение favicon
    });
    
    webview.addEventListener('did-start-loading', () => {
      this.updateNavigationButtons();
    });
    
    webview.addEventListener('did-stop-loading', () => {
      this.updateNavigationButtons();
      this.updateAddressBar();
    });
    
    webview.addEventListener('did-navigate', (e) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.url = e.url;
        if (this.activeTabId === tabId) {
          this.elements.addressBar.value = e.url;
        }
      }
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
      if (this.activeTabId === tabId) {
        this.elements.addressBar.value = e.url;
      }
    });
    
    webview.addEventListener('new-window', (e) => {
      this.createNewTab(e.url);
    });
  }
  
  updateTabElement(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.element) {
      const titleEl = tab.element.querySelector('.tab-title');
      if (titleEl) titleEl.textContent = tab.title;
    }
  }
  
  setActiveTab(tabId) {
    if (this.activeTabId === tabId) return;
    
    this.tabs.forEach(tab => {
      tab.webview.classList.remove('active');
      if (tab.element) tab.element.classList.remove('active');
    });
    
    const activeTab = this.tabs.find(t => t.id === tabId);
    if (activeTab) {
      activeTab.webview.classList.add('active');
      if (activeTab.element) activeTab.element.classList.add('active');
      this.activeTabId = tabId;
      this.elements.addressBar.value = activeTab.url;
      this.updateNavigationButtons();
      this.updateBookmarkButton();
    }
  }
  
  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = this.tabs[tabIndex];
    
    if (tab.element) tab.element.remove();
    if (tab.webview) tab.webview.remove();
    
    this.tabs.splice(tabIndex, 1);
    
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
        this.setActiveTab(this.tabs[newActiveIndex].id);
      } else {
        this.createNewTab(this.homeUrl);
      }
    }
  }
  
  getActiveWebview() {
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    return activeTab ? activeTab.webview : null;
  }
  
  navigateToUrl() {
    let input = this.elements.addressBar.value.trim();
    const webview = this.getActiveWebview();
    if (!webview) return;
    
    if (!input.includes('.') && !input.includes('://')) {
      input = `https://www.perplexity.ai/search?q=${encodeURIComponent(input)}`;
    } else if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'https://' + input;
    }
    
    webview.src = input;
  }
  
  navigateToHome() {
    const webview = this.getActiveWebview();
    if (webview) {
      webview.src = this.homeUrl;
    }
  }
  
  updateNavigationButtons() {
    const webview = this.getActiveWebview();
    if (webview) {
      this.elements.backBtn.disabled = !webview.canGoBack();
      this.elements.forwardBtn.disabled = !webview.canGoForward();
    }
  }
  
  updateAddressBar() {
    const webview = this.getActiveWebview();
    if (webview && this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        this.elements.addressBar.value = webview.src;
        tab.url = webview.src;
      }
    }
  }
  
  toggleBookmark() {
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    if (!activeTab) return;
    
    const existingIndex = this.bookmarks.findIndex(b => b.url === activeTab.url);
    
    if (existingIndex === -1) {
      this.bookmarks.push({
        title: activeTab.title,
        url: activeTab.url,
        date: new Date().toISOString()
      });
      this.elements.bookmarkBtn.style.color = '#FBBF24';
    } else {
      this.bookmarks.splice(existingIndex, 1);
      this.elements.bookmarkBtn.style.color = '#A0A0B0';
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
  }
  
  updateBookmarkButton() {
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    if (activeTab) {
      const isBookmarked = this.bookmarks.some(b => b.url === activeTab.url);
      this.elements.bookmarkBtn.style.color = isBookmarked ? '#FBBF24' : '#A0A0B0';
    }
  }
  
  toggleMaximize() {
    this.isMaximized = !this.isMaximized;
    window.electronAPI.maximize();
    this.elements.maximizeBtn.textContent = this.isMaximized ? '❐' : '□';
  }
  
  async requestNewIdentity() {
    this.elements.newIdentityBtn.style.opacity = '0.5';
    this.elements.newIdentityBtn.disabled = true;
    
    try {
      const success = await window.electronAPI.getNewIdentity();
      
      if (success) {
        this.elements.torStatus.className = 'tor-status connecting';
        this.elements.torStatus.querySelector('.tor-text').textContent = 'Tor: Новая личность...';
        
        setTimeout(() => {
          this.elements.torStatus.className = 'tor-status connected';
          this.elements.torStatus.querySelector('.tor-text').textContent = 'Tor: Подключен';
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to get new identity:', error);
    }
    
    setTimeout(() => {
      this.elements.newIdentityBtn.style.opacity = '1';
      this.elements.newIdentityBtn.disabled = false;
    }, 10000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BrowserUI();
});
