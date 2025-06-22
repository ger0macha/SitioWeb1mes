// =============================================
// CONFIGURACIÓN PRINCIPAL
// =============================================
const SHEET_ID = "1m5TOfOxH_itvSyxCQ5lvQEtH6HwZfH7bsdWryHK5diI";
const SHEET_NAME = "ubi";

// =============================================
// VARIABLES GLOBALES
// =============================================
let mapa, fullpageInstance;

// =============================================
// FUNCIÓN PARA CARGAR DATOS DESDE SHEETS (CORREGIDA)
// =============================================
async function cargarDatosDesdeSheets() {
  try {
    const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Procesamiento especial para el formato de tu sheet
    return data.map(item => {
      // Construye el array de coordenadas desde las columnas separadas
      const coordenadas = [];
      if (item['coordenadas/0'] && item['coordenadas/1']) {
        coordenadas.push(Number(item['coordenadas/0']));
        coordenadas.push(Number(item['coordenadas/1']));
      }
      
      return {
        titulo: item.titulo || 'Sin título',
        fecha: item.fecha || '',
        descripcion: item.descripcion || '',
        icono: item.icono || '❤️',
        foto: item.foto || '',
        coordenadas: coordenadas
      };
    }).filter(item => item.coordenadas.length === 2); // Solo items con coordenadas válidas
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    return [];
  }
}

// =============================================
// INICIALIZACIÓN DE COMPONENTES
// =============================================
// Reemplaza completamente la función initMap() por esta versión mejorada:
async function initMap() {
  const ubicaciones = await cargarDatosDesdeSheets();
  const container = document.getElementById('mapa-container');
  
  if (!ubicaciones.length) {
    container.innerHTML = '<p class="error-mapa">No hay ubicaciones para mostrar</p>';
    return;
  }

  // Limpiar y preparar contenedor
  container.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';

  // Crear mapa centrado en la primera ubicación
  mapa = L.map('map').setView(ubicaciones[0].coordenadas, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);

  // Agregar marcadores con iconos personalizados
  ubicaciones.forEach((ubicacion, index) => {
    const marker = L.marker(ubicacion.coordenadas, {
      icon: L.divIcon({
        html: `<div style="
          background: #e63946;
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          font-size: 14px;
        ">${ubicacion.icono}</div>`,
        className: 'marcador-personalizado'
      })
    }).bindPopup(`
      <div class="popup-content">
        <h3>${ubicacion.titulo}</h3>
        <p>${ubicacion.descripcion}</p>
        <small>${ubicacion.fecha}</small>
        ${ubicacion.foto ? `
        <a href="${ubicacion.foto}" class="gallery-item" data-sub-html="<h4>${ubicacion.titulo}</h4><p>${ubicacion.descripcion}</p>">
         <img src="${ubicacion.foto}" class="popup-thumb">
        </a>` : ''}
      </div>
    `);
    
    marker.addTo(mapa);
  });

  // Ajustar el zoom para mostrar todos los marcadores
  setTimeout(() => {
    mapa.invalidateSize();
    const markerGroup = new L.featureGroup(ubicaciones.map(u => L.marker(u.coordenadas)));
    mapa.fitBounds(markerGroup.getBounds().pad(0.2));
  }, 500);
}

function initGallery() {
  lightGallery(document.getElementById('galeria-container'), {
    plugins: [lgZoom],
    speed: 500,
    download: false
  });
}

function initFullpage() {
  if (fullpageInstance) fullpage.destroy('all');
  
  fullpageInstance = new fullpage('#fullpage', {
    licenseKey: 'OPEN-SOURCE-GPLV3-LICENSE',
    autoScrolling: true,
    scrollBar: false,
    navigation: true,
    anchors: ['primer-seccion', 'lugares', 'memorias'],
    scrollingSpeed: 800,
    afterLoad: function(origin, destination) {
      if (destination.anchor === 'lugares' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 300);
      }
    }
  });
}

// =============================================
// MECANISMO DE CARTA (RESTAURADO)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const carta = document.getElementById('carta');
  const musica = document.getElementById('musica');
  
  carta.addEventListener('click', () => {
    // Cambiar imagen de la carta
    carta.src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';
    
    // Reproducir música
    musica.play().catch(e => console.log("Auto-play bloqueado:", e));
    
    // Efecto de vibración
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // Ocultar intro
    document.getElementById('intro').style.opacity = '0';
    
    setTimeout(() => {
      document.getElementById('intro').style.display = 'none';
      const main = document.getElementById('main');
      
      // Mostrar contenido principal
      main.style.display = 'block';
      setTimeout(() => {
        main.style.opacity = '1';
        
        // Inicializar componentes
        initFullpage();
        initGallery();
        initMap();
      }, 50);
    }, 300);
  });
});