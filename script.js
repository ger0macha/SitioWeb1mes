document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('carta').addEventListener('click', () => {
    // Cambiar imagen de la carta
    document.getElementById('carta').src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';
    
    // Efecto de vibración si está disponible
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // Ocultar intro con animación
    document.getElementById('intro').style.opacity = '0';
    
    setTimeout(() => {
      document.getElementById('intro').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      document.getElementById('main').style.opacity = '1';
      
      // Inicializar Fullpage.js
      initFullpage();
    }, 300);
  });
});

let fullpageInstance = null;

function initFullpage() {
  // Destruir instancia previa si existe
  if (fullpageInstance) {
    fullpage.destroy('all');
  }
  
  fullpageInstance = new fullpage('#fullpage', {
    licenseKey: 'OPEN-SOURCE-GPLV3-LICENSE',
    autoScrolling: true,
    scrollBar: false,
    navigation: true,
    anchors: ['primer-seccion', 'lugares', 'memorias'],
    scrollingSpeed: 800,
    initialSlide: 0,
    afterRender: function() {
        fullpage_api.moveTo('primer-seccion', 0);
      initMap();
      initGallery();
    },
    afterLoad: function(origin, destination, direction) {
      // Asegurar que las secciones tengan altura correcta
      document.querySelectorAll('.section').forEach(section => {
        section.style.minHeight = window.innerHeight + 'px';
      });
    }
  });
}

function initMap() {
  const mapaContainer = document.getElementById('mapa-container');
  mapaContainer.innerHTML = ''; // Limpiar contenedor
  
  const mapa = L.map(mapaContainer).setView([-31.4167, -64.1833], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
  
  L.marker([-31.4167, -64.1833])
    .addTo(mapa)
    .bindPopup('Nuestro lugar ❤️')
    .openPopup();
  
  // Redimensionar mapa cuando esté visible
  setTimeout(() => {
    mapa.invalidateSize();
    mapaContainer.style.opacity = '1';
  }, 500);
}

function initGallery() {
  lightGallery(document.getElementById('galeria-container'), {
    plugins: [lgZoom],
    speed: 500,
    selector: 'a',
    licenseKey: '0000-0000-0000-0000',
    download: false
  });
}