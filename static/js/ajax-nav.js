(function() {
  'use strict';
  
  const config = {
    contentSelectors: [
      '.maincontent'
    ],
    titleSelector: 'h1, .post-title',
    loadingClass: 'ajax-loading',
    fadeSpeed: 10,
    updateWidgets: true
  };
  
  let isLoading = false;
  let currentUrl = window.location.href;
  
  // Create loading overlay
  function createLoadingOverlay() {
      const overlay = document.createElement('div');
      overlay.id = 'ajax-loading-overlay';
      overlay.innerHTML = '<div class="ajax-spinner"></div>';
      document.body.appendChild(overlay);
      return overlay;
  }
  
  let loadingOverlay = document.getElementById('ajax-loading-overlay') || createLoadingOverlay();
  
  function showLoading() {
    document.body.classList.add(config.loadingClass);
    loadingOverlay.classList.add('show');
    isLoading = true;
    
    // Scroll ke atas SAAT loading dimulai, bukan nanti
    window.scrollTo(0, 0);
  }
  
  function hideLoading() {
    document.body.classList.remove(config.loadingClass);
    loadingOverlay.classList.remove('show');
    isLoading = false;
  }
  
  function fadeOut(element, callback) {
    element.style.transition = `opacity ${config.fadeSpeed}ms`;
    element.style.opacity = '0';
    setTimeout(() => {
      if (callback) callback();
    }, config.fadeSpeed);
  }
  
  function fadeIn(element) {
    element.style.opacity = '0';
    element.style.display = 'block';
    setTimeout(() => {
      element.style.transition = `opacity ${config.fadeSpeed}ms`;
      element.style.opacity = '1';
    }, 50);
  }
  
  function loadPage(url) {
    if (isLoading) return;
    
    showLoading(); // Ini sudah termasuk scroll ke atas
    
    const selectors = Array.isArray(config.contentSelectors) 
      ? config.contentSelectors 
      : [config.contentSelectors];
    
    const elementsToUpdate = [];
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        elementsToUpdate.push({ selector, element });
      }
    });
    
    if (elementsToUpdate.length === 0) {
      console.error('No content elements found');
      hideLoading();
      return;
    }
    
    let fadeOutCount = 0;
    elementsToUpdate.forEach(({ element }) => {
      fadeOut(element, () => {
        fadeOutCount++;
        
        if (fadeOutCount === elementsToUpdate.length) {
          fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.text();
            })
            .then(html => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              let successCount = 0;
              
              elementsToUpdate.forEach(({ selector, element }) => {
                const newContent = doc.querySelector(selector);
                
                if (newContent) {
                  element.innerHTML = newContent.innerHTML;
                  fadeIn(element);
                  successCount++;
                } else {
                  console.warn(`Selector not found: ${selector}`);
                  element.style.opacity = '1';
                }
              });
              
              const newTitle = doc.querySelector(config.titleSelector);
              if (newTitle) {
                document.title = doc.title;
              }
              
              if (successCount > 0) {
                history.pushState({ url: url }, '', url);
                currentUrl = url;
                
                if (config.updateWidgets) {
                  reinitializeWidgets();
                }
                
                // PASTIKAN scroll ke atas setelah konten dimuat
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  hideLoading();
                }, 100);
                
                window.dispatchEvent(new CustomEvent('ajaxPageLoaded', { 
                  detail: { url: url, updated: successCount } 
                }));
              } else {
                throw new Error('No content updated');
              }
            })
            .catch(error => {
              console.error('Error loading page:', error);
              window.location.href = url;
              hideLoading();
            });
        }
      });
    });
  }
  
  function reinitializeWidgets() {
    // Reinit syntax highlighting
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
    
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
      });
    }
    
    // Reinit Disqus
    if (typeof DISQUS !== 'undefined') {
      DISQUS.reset({
        reload: true,
        config: function () {  
          this.page.identifier = window.location.pathname;
          this.page.url = window.location.href;
        }
      });
    }
    
    // Reinit lazy loading images
    if (typeof lozad !== 'undefined') {
      const observer = lozad();
      observer.observe();
    }
  }
  
  function handlePopState(event) {
    if (event.state && event.state.url) {
      loadPage(event.state.url);
    } else {
      loadPage(window.location.href);
    }
  }
  
  function interceptLinks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      
      if (!href || 
          href === '#' || 
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          link.hasAttribute('target') ||
          link.hasAttribute('download') ||
          link.classList.contains('no-ajax')) {
        return;
      }
      
      const linkUrl = new URL(href, window.location.href);
      const currentDomain = window.location.hostname;
      
      if (linkUrl.hostname !== currentDomain) {
        return;
      }
      
      const isContentPage = linkUrl.pathname.includes('/posts/') || 
                           linkUrl.pathname.includes('/blog/') ||
                           (linkUrl.pathname.length > 1 && 
                            !linkUrl.pathname.includes('/tags/') &&
                            !linkUrl.pathname.includes('/categories/'));
      
      if (isContentPage) {
        e.preventDefault();
        
        if (linkUrl.href !== currentUrl) {
          loadPage(linkUrl.href);
        }
      }
    });
  }
  
  function init() {
    history.replaceState({ url: currentUrl }, '', currentUrl);
    interceptLinks();
    window.addEventListener('popstate', handlePopState);
    console.log('AJAX Navigation initialized for Hugo');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();