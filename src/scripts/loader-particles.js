// Script para crear las partículas animadas del loader
document.addEventListener('DOMContentLoaded', function() {
  let particlesCreated = false;
  
  function createParticles() {
    const particles = document.querySelector('.particles');
    if (!particles || particlesCreated) return;
    
    const particleCount = 8; // Reducido de 15 a 8
    particles.innerHTML = '';
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 10 + 's';
      particle.style.animationDuration = (8 + Math.random() * 4) + 's';
      particles.appendChild(particle);
    }
    
    particlesCreated = true;
    
    // Reset flag cuando el loader se oculta
    setTimeout(() => {
      const loader = document.querySelector('.niol-splash-loader');
      if (!loader || loader.offsetParent === null) {
        particlesCreated = false;
      }
    }, 1000);
  }

  // Crear partículas con throttling
  let isCreating = false;
  function throttledCreateParticles() {
    if (isCreating) return;
    isCreating = true;
    
    setTimeout(() => {
      createParticles();
      isCreating = false;
    }, 100);
  }

  // Solo observar cambios específicos
  const observer = new MutationObserver(function(mutations) {
    let shouldCreateParticles = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasLoader = addedNodes.some(node => 
          node.nodeType === 1 && 
          (node.classList?.contains('niol-splash-loader') || 
           node.querySelector?.('.niol-splash-loader'))
        );
        
        if (hasLoader) {
          shouldCreateParticles = true;
        }
      }
    });
    
    if (shouldCreateParticles) {
      throttledCreateParticles();
    }
  });

  // Observar solo el body principal
  observer.observe(document.body, { 
    childList: true, 
    subtree: false // Cambiado de true a false para reducir eventos
  });

  // Crear partículas iniciales si ya existe el loader
  setTimeout(throttledCreateParticles, 200);
});