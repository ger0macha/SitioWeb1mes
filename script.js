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

let mapa; // Variable global para el mapa
let timeline; // Variable global para la línea de tiempo



async function initMapAndTimeline() {
  // 1. Cargar datos
  const response = await fetch('ubicaciones.json');
  const ubicaciones = await response.json();

  // 2. Ordenar por fecha (si no lo están)
  ubicaciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // 3. Inicializar mapa
  initMap(ubicaciones);

  // 4. Inicializar timeline
  initTimeline(ubicaciones);
}

function initMap(ubicaciones) {
  mapa = L.map('mapa-container').setView(ubicaciones[0].coordenadas, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

  // Cluster de marcadores para mejor rendimiento
  const markers = L.markerClusterGroup();

  ubicaciones.forEach(ubicacion => {
    if (ubicaciones.filter(u => 
      u.coordenadas[0] === ubicacion.coordenadas[0] && 
      u.coordenadas[1] === ubicacion.coordenadas[1]
    ).length > 1) {
      marker.setIcon(L.divIcon({
        html: `<div class="marcador-multi">${ubicacion.icono}</div>`,
        className: 'marcador-multi'
      }));
    }
    const marker = L.marker(ubicacion.coordenadas, {
      icon: L.divIcon({
        html: `<div class="marcador-mapa">${ubicacion.icono || '📍'}</div>`,
        className: 'marcador-personalizado'
      })
    }).bindPopup(`
      <h3>${ubicacion.titulo}</h3>
      <p>${ubicacion.descripcion}</p>
      ${ubicacion.foto ? `<img src="${ubicacion.foto}" style="max-height:150px; border-radius:8px;">` : ''}
      <small>${new Date(ubicacion.fecha).toLocaleDateString('es-ES')}</small>
    `);

    markers.addLayer(marker);
  });

  mapa.addLayer(markers);
  mapa.fitBounds(markers.getBounds());
}

function initTimeline(ubicaciones) {
  const timelineData = {
    events: ubicaciones.map(ubicacion => ({
      start_date: {
        year: ubicacion.fecha.split('-')[0],
        month: ubicacion.fecha.split('-')[1],
        day: ubicacion.fecha.split('-')[2]
      },
      text: {
        headline: ubicacion.titulo,
        text: `<p>${ubicacion.descripcion}</p>
               ${ubicacion.foto ? `<img src="${ubicacion.foto}" style="max-height:200px;">` : ''}`
      }
    }))
  };

  timeline = new TL.Timeline('timeline-container', timelineData);

  // Sincronización mapa-timeline
  timeline.on('click', (e) => {
    const slideIndex = e.target.closest('.tl-slide')?.getAttribute('data-slide-index');
    if (slideIndex) {
      const coords = ubicaciones[slideIndex].coordenadas;
      mapa.flyTo(coords, 15, { duration: 1 });
    }
  });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initMapAndTimeline);

mapa.on('popupopen', (e) => {
  const img = e.popup._content.querySelector('.lazy-image');
  if (img && img.dataset.src && !img.innerHTML) {
    img.innerHTML = `<img src="${img.dataset.src}" style="max-height:150px;">`;
  }
});