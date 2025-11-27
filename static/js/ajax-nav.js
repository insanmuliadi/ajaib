(function() {
  'use strict';
  
  const config = {
    contentSelectors: [
      '.maincontent'
    ],
    titleSelector: 'h1, .post-title',
    fadeSpeed: 10,
    updateWidgets: true
  };
  
  let isLoading = false;
  let currentUrl = window.location.href;
  
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
    
    isLoading = true;
    window.scrollTo(0, 0);
    
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
      isLoading = false;
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
                
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  isLoading = false;
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
              isLoading = false;
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
  
  // Cek apakah link adalah anchor link (hash/fragment)
  function isAnchorLink(href, linkUrl) {
    // Jika href dimulai dengan #, ini anchor link
    if (href.startsWith('#')) {
      return true;
    }
    
    // Jika URL sama tapi ada hash, ini anchor link dalam halaman yang sama
    if (linkUrl.pathname === window.location.pathname && linkUrl.hash) {
      return true;
    }
    
    return false;
  }
  
  // Cek apakah link adalah bagian dari TOC
  function isTocLink(link) {
    let parent = link.parentElement;
    while (parent && parent !== document.body) {
      const classList = parent.classList;
      const id = parent.id;
      
      // Cek class yang mengandung toc
      if (classList && (
        classList.contains('toc') || 
        classList.contains('table-of-contents') ||
        classList.contains('post-toc') ||
        Array.from(classList).some(cls => cls.toLowerCase().includes('toc'))
      )) {
        return true;
      }
      
      // Cek id yang mengandung toc
      if (id && id.toLowerCase().includes('toc')) {
        return true;
      }
      
      parent = parent.parentElement;
    }
    
    return false;
  }
  
  function interceptLinks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      
      // Basic validation
      if (!href || 
          href === '#' || 
          href.startsWith('javascript:') ||
          link.hasAttribute('target') ||
          link.hasAttribute('download') ||
          link.classList.contains('no-ajax')) {
        return;
      }
      
      const linkUrl = new URL(href, window.location.href);
      const currentDomain = window.location.hostname;
      
      // Skip external links
      if (linkUrl.hostname !== currentDomain) {
        return;
      }
      
      // PENTING: Skip anchor links dan TOC links
      // Biarkan browser handle scroll secara native
      if (isAnchorLink(href, linkUrl) || isTocLink(link)) {
        return; // Jangan preventDefault, biarkan native scroll bekerja
      }
      
      // Cek apakah ini content page yang perlu AJAX
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