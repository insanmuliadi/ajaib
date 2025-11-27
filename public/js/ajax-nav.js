(function() {
  'use strict';
  
  const config = {
    // Ganti dengan selector yang lebih spesifik, EXCLUDE TOC
    contentSelectors: [
      '.maincontent',
      'head'
    ],
    titleSelector: 'h1, .post-title',
    updateWidgets: true
  };
  
  let isLoading = false;
  let currentUrl = window.location.href;
  let isAnchorClick = false; // Flag untuk anchor link
  
  function loadPage(url) {
    if (isLoading || isAnchorClick) return; // Jangan load jika anchor click
    
    isLoading = true;
    //window.scrollTo(0, 0);
    
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
    
    // LANGSUNG FETCH (Tanpa menunggu fadeOut)
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
            // Langsung ganti konten tanpa animasi opacity
            element.innerHTML = newContent.innerHTML;
            successCount++;
          } else {
            console.warn(`Selector not found: ${selector}`);
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
          
          // Scroll reset segera setelah konten dimuat
          setTimeout(() => {
            window.scrollTo(0, 0); // Fungsi scroll yang ingin didelay
          }, 100);
          isLoading = false;
          
          window.dispatchEvent(new CustomEvent('ajaxPageLoaded', { 
            detail: { url: url, updated: successCount } 
          }));
        } else {
          throw new Error('No content updated');
        }
      })
      .catch(error => {
        console.error('Error loading page:', error);
        window.location.href = url; // Fallback jika error
        isLoading = false;
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
      
      // RULE #1: Jika href dimulai dengan #, STOP di sini (anchor link)
      if (!href || href.startsWith('#')) {
        isAnchorClick = true; // Set flag
        setTimeout(() => { isAnchorClick = false; }, 1000); // Reset setelah 1 detik
        return; 
      }
      
      // RULE #1b: Cek parent - jika ada .toc atau #TableOfContents, SKIP
      let parent = link.parentElement;
      while (parent && parent !== document.body) {
        if (parent.classList.contains('toc') || 
            parent.id === 'TableOfContents' ||
            parent.classList.contains('no-ajax')) {
          isAnchorClick = true; // Set flag
          setTimeout(() => { isAnchorClick = false; }, 1000); // Reset
          return; 
        }
        parent = parent.parentElement;
      }
      
      // RULE #2: Skip link dengan atribut khusus
      if (href.startsWith('javascript:') ||
          link.hasAttribute('target') ||
          link.hasAttribute('download') ||
          link.classList.contains('no-ajax')) {
        return;
      }
      
      // RULE #3: Parse URL
      let linkUrl;
      try {
        linkUrl = new URL(href, window.location.href);
      } catch (e) {
        console.error('Invalid URL:', href);
        return;
      }
      
      const currentDomain = window.location.hostname;
      
      // RULE #4: Skip external links
      if (linkUrl.hostname !== currentDomain) {
        return;
      }
      
      // RULE #5: Skip jika URL sama tapi beda hash saja (anchor dalam halaman sama)
      const currentPathname = window.location.pathname;
      if (linkUrl.pathname === currentPathname && linkUrl.hash) {
        return;
      }
      
      // RULE #6: Cek apakah ini content page yang perlu AJAX
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

  function initPrefetch() {
    // Hanya aktif di koneksi cepat dan tidak di mobile (opsional)
    if (navigator.connection && 
        (navigator.connection.saveData || 
         (navigator.connection.effectiveType && navigator.connection.effectiveType.includes('2g')))) {
        return; // Skip prefetch di kondisi koneksi lambat
    }
    
    let prefetchTimeout;
    
    document.addEventListener('mouseover', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Filter yang sama dengan interceptLinks
        if (!href || 
            href.startsWith('#') || 
            href.startsWith('javascript:') ||
            link.hasAttribute('target') ||
            link.hasAttribute('download') ||
            link.classList.contains('no-ajax')) {
            return;
        }
        
        // Clear timeout sebelumnya
        if (prefetchTimeout) {
            clearTimeout(prefetchTimeout);
        }
        
        // Delay sedikit sebelum prefetch (100-200ms)
        prefetchTimeout = setTimeout(() => {
            try {
                const linkUrl = new URL(href, window.location.href);
                
                // Hanya prefetch internal links dan content pages
                if (linkUrl.hostname === window.location.hostname) {
                    const isContentPage = linkUrl.pathname.includes('/posts/') || 
                                            linkUrl.pathname.includes('/blog/') ||
                                            (linkUrl.pathname.length > 1 && 
                                             !linkUrl.pathname.includes('/tags/') &&
                                             !linkUrl.pathname.includes('/categories/'));
                    
                    if (isContentPage && linkUrl.href !== currentUrl) {
                        // Prefetch dengan prioritas rendah
                        const linkElem = document.createElement('link');
                        linkElem.rel = 'prefetch';
                        linkElem.href = linkUrl.href;
                        linkElem.as = 'document';
                        document.head.appendChild(linkElem);
                    }
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }, 100); // Delay 100ms
    });
    
    // Cancel prefetch jika mouse keluar sebelum timeout
    document.addEventListener('mouseout', function(e) {
        const link = e.target.closest('a');
        if (link && prefetchTimeout) {
            clearTimeout(prefetchTimeout);
        }
    });
  }

  function init() {
    history.replaceState({ url: currentUrl }, '', currentUrl);
    interceptLinks();
    window.addEventListener('popstate', handlePopState);
    if (!navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
      initPrefetch();
    }
    console.log('AJAX Navigation initialized (No Fade)');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();