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
    
    // Procesamiento y ordenar por fecha
    return data.map(item => {
      const coordenadas = [];
      if (item['coordenadas/0'] && item['coordenadas/1']) {
        coordenadas.push(Number(item['coordenadas/0']));
        coordenadas.push(Number(item['coordenadas/1']));
      }
      
      // Convertir fecha a objeto Date para poder ordenar
      const fechaObj = item.fecha ? new Date(item.fecha) : new Date();
      
      return {
        titulo: item.titulo || 'Sin título',
        fecha: item.fecha || '',
        fechaObj: fechaObj, // Guardamos el objeto Date para ordenar
        descripcion: item.descripcion || '',
        icono: item.icono || '❤️',
        foto: item.foto || '',
        coordenadas: coordenadas
      };
    })
    .filter(item => item.coordenadas.length === 2)
    .sort((a, b) => a.fechaObj - b.fechaObj); // Ordenar por fecha
    
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

// Linea de tiempo

function crearLineaDeTiempo(ubicaciones) {
  const contenedor = document.createElement('div');
  contenedor.className = 'timeline-container';
  
  ubicaciones.forEach((ubicacion, index) => {
    const evento = document.createElement('div');
    evento.className = `timeline-event ${index % 2 === 0 ? 'left' : 'right'}`;
    
    evento.innerHTML = `
      <div class="timeline-content">
        <div class="timeline-icon">${ubicacion.icono}</div>
        <h4>${ubicacion.titulo}</h4>
        <small>${ubicacion.fecha}</small>
        <p>${ubicacion.descripcion}</p>
        ${ubicacion.foto ? `<img src="${ubicacion.foto}" class="timeline-img">` : ''}
        <button class="timeline-map-btn" data-index="${index}">Ver en mapa</button>
      </div>
    `;
    
    contenedor.appendChild(evento);
  });
  
  return contenedor;
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
  
  carta.addEventListener('click', async () => {
    carta.src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';
    musica.play().catch(e => console.log("Auto-play bloqueado:", e));
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    document.getElementById('intro').style.opacity = '0';
    
    setTimeout(async () => {
      document.getElementById('intro').style.display = 'none';
      const main = document.getElementById('main');
      
      main.style.display = 'block';
      setTimeout(async () => {
        main.style.opacity = '1';
        
        // Cargar datos primero
        const ubicaciones = await cargarDatosDesdeSheets();
        
        // Inicializar componentes
        initFullpage();
        initGallery();
        initMap(ubicaciones);
        
        // Crear y añadir línea de tiempo
        const timeline = crearLineaDeTiempo(ubicaciones);
        document.getElementById('linea-tiempo-container').appendChild(timeline);
        
        // Añadir event listeners para los botones
        document.querySelectorAll('.timeline-map-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const ubicacion = ubicaciones[index];
            
            // Mover el mapa a esa ubicación
            mapa.setView(ubicacion.coordenadas, 15);
            
            // Abrir el popup
            setTimeout(() => {
              const marker = Object.values(mapa._layers)
                .find(layer => layer instanceof L.Marker && 
                      layer.getLatLng().equals(ubicacion.coordenadas));
              if (marker) marker.openPopup();
            }, 500);
            
            // Cambiar a la sección del mapa
            fullpageInstance.moveTo('lugares');
          });
        });
      }, 50);
    }, 300);
  });
});