// =============================================
// CONFIGURACIÓN PRINCIPAL
// =============================================
const SHEET_ID = "1m5TOfOxH_itvSyxCQ5lvQEtH6HwZfH7bsdWryHK5diI";
const SHEET_NAME = "ubi";

// =============================================
// VARIABLES GLOBALES
// =============================================
let mapa, fullpageInstance;
let ubicacionesGlobales = [];

// =============================================
// FUNCIONES AUXILIARES
// =============================================
function mostrarError(mensaje) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = mensaje;
  errorEl.style.display = 'block';
  setTimeout(() => errorEl.style.display = 'none', 5000);
}

// =============================================
// FUNCION REPRODUCCION DE AUDIO
// =============================================

function configurarAudio() {
  const musica = document.getElementById('musica');
  const muteBtn = document.getElementById('mute-btn');
  let isMuted = false;

  // Configuración inicial de volumen
  musica.volume = 0.6; // 70% de volumen inicial (ajusta entre 0 y 1)

  // Efecto de fade out después de 5 segundos
  setTimeout(() => {
    const fadeAudio = setInterval(() => {
      if (musica.volume > 0.3) { // Baja hasta 30% (ajustable)
        musica.volume -= 0.05;
      } else {
        clearInterval(fadeAudio);
      }
    }, 200); // Ajusta la velocidad del fade
  }, 5000);

  // Botón mute/unmute
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    musica.muted = isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    
    // Vibración táctil si es móvil
    if (navigator.vibrate) navigator.vibrate(50);
  });
}

// =============================================
// FUNCIÓN PARA CARGAR DATOS DESDE SHEETS
// =============================================
async function cargarDatosDesdeSheets() {
  try {
    const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}?t=${Date.now()}`;
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
    
    const data = await response.json();
    
    return data
      .map(item => {
        const coordenadas = [];
        if (item['coordenadas/0'] && item['coordenadas/1']) {
          coordenadas.push(Number(item['coordenadas/0']));
          coordenadas.push(Number(item['coordenadas/1']));
        }
        
        return {
          titulo: item.titulo || 'Sin título',
          fecha: item.fecha || '',
          fechaObj: item.fecha ? new Date(item.fecha) : new Date(),
          descripcion: item.descripcion || '',
          icono: item.icono || '❤️',
          foto: item.foto || '',
          coordenadas: coordenadas
        };
      })
      .filter(item => item.coordenadas.length === 2)
      .sort((a, b) => a.fechaObj - b.fechaObj);
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    mostrarError("Error cargando datos desde Google Sheets");
    return [];
  }
}

// =============================================
// MAPA - VERSIÓN OPTIMIZADA
// =============================================
async function initMap() {
  const container = document.getElementById('mapa-container');
  
  if (!ubicacionesGlobales.length) {
    container.innerHTML = '<p class="error-mapa">No hay ubicaciones para mostrar</p>';
    return;
  }

  container.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';

  // Usar la primera ubicación como centro del mapa
  const centroMapa = ubicacionesGlobales[0].coordenadas;
  mapa = L.map('map').setView(centroMapa, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);

  // Agrupar marcadores para mejor rendimiento
  const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  });

  ubicacionesGlobales.forEach((ubicacion, index) => {
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
         <img src="${ubicacion.foto}" class="popup-thumb" loading="lazy">
        </a>` : ''}
      </div>
    `);
    
    markers.addLayer(marker);
  });

  mapa.addLayer(markers);
  mapa.fitBounds(markers.getBounds().pad(0.2));
  mapa.addEventListener('resize', () => {
    setTimeout(() => mapa.invalidateSize(), 300);
  });
}

// =============================================
// LÍNEA DE TIEMPO - VERSIÓN MEJORADA
// =============================================
function crearLineaDeTiempo() {
  const contenedor = document.createElement('div');
  contenedor.className = 'timeline-container';
  
  ubicacionesGlobales.forEach((ubicacion, index) => {
    const evento = document.createElement('div');
    evento.className = `timeline-event ${index % 2 === 0 ? 'left' : 'right'}`;
    
    evento.innerHTML = `
      <div class="timeline-content">
        <div class="timeline-icon">${ubicacion.icono}</div>
        <h4>${ubicacion.titulo}</h4>
        <small>${ubicacion.fecha}</small>
        <p>${ubicacion.descripcion}</p>
        ${ubicacion.foto ? `
          <img src="${ubicacion.foto}" 
               class="timeline-img" 
               alt="${ubicacion.titulo}"
               loading="lazy">` : ''}
        <button class="timeline-map-btn" data-index="${index}">
          Ver en mapa
        </button>
      </div>
    `;
    
    contenedor.appendChild(evento);
  });
  
  return contenedor;
}

// =============================================
// GALERÍA - VERSIÓN OPTIMIZADA
// =============================================
function crearGaleria() {
  const galeriaContainer = document.getElementById('galeria-container');
  galeriaContainer.innerHTML = '';
  
  ubicacionesGlobales.filter(ubicacion => ubicacion.foto).forEach(ubicacion => {
    const link = document.createElement('a');
    link.href = ubicacion.foto;
    link.classList.add('gallery-item');
    link.dataset.subHtml = `<h4>${ubicacion.titulo}</h4><p>${ubicacion.descripcion}</p>`;
    
    const img = document.createElement('img');
    img.src = ubicacion.foto;
    img.alt = ubicacion.descripcion;
    img.loading = 'lazy';
    
    link.appendChild(img);
    galeriaContainer.appendChild(link);
  });
}

function initGallery() {
  lightGallery(document.getElementById('galeria-container'), {
    plugins: [lgZoom],
    speed: 500,
    download: false
  });
}

// =============================================
// FULLPAGE - CONFIGURACIÓN
// =============================================
function initFullpage() {
  if (fullpageInstance) fullpage.destroy('all');
  
  fullpageInstance = new fullpage('#fullpage', {
    licenseKey: 'OPEN-SOURCE-GPLV3-LICENSE',
    autoScrolling: true,
    scrollBar: false,
    navigation: true,
    anchors: ['mensaje', 'contador', 'linea-tiempo', 'lugares', 'memorias'],
    responsiveWidth: 320,
    afterLoad: function(origin, destination) {
      if (destination.anchor === 'lugares' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 300);
      }
    },

    afterRender: function() {
      if (window.innerWidth < 768) {
        setTimeout(() => fullpageInstance.reBuild(), 500);
      }
    }
  });
}

// =============================================
// CONTADOR DE TIEMPO - VERSIÓN PRECISA
// =============================================
function actualizarContador(fechaInicio) {
  const ahora = new Date();
  const diff = ahora - fechaInicio;
  
  const meses = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  const diasResto = Math.floor(diff % (1000 * 60 * 60 * 24 * 30.44));
  const dias = Math.floor(diasResto / (1000 * 60 * 60 * 24));
  const horas = ahora.getHours();

  document.getElementById('meses').textContent = meses;
  document.getElementById('dias').textContent = dias;
  document.getElementById('horas').textContent = horas;
}

// =============================================
// CONFIGURACIÓN DE EVENTOS
// =============================================
function configurarBotonesTimeline() {
  document.querySelectorAll('.timeline-map-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      const ubicacion = ubicacionesGlobales[index];
      
      mapa.setView(ubicacion.coordenadas, 15);
      setTimeout(() => {
        const marker = Object.values(mapa._layers)
          .find(layer => layer instanceof L.Marker && 
                layer.getLatLng().equals(ubicacion.coordenadas));
        if (marker) marker.openPopup();
      }, 500);
      
      fullpageInstance.moveTo('lugares');
    });
  });
}

// =============================================
// CARGA PRINCIPAL DE DATOS Y COMPONENTES
// =============================================
async function cargarDatosYComponentes() {
  try {
    ubicacionesGlobales = await cargarDatosDesdeSheets();
    
    initFullpage();
    initMap();
    
    crearGaleria();
    initGallery();
    
    const timeline = crearLineaDeTiempo();
    document.getElementById('linea-tiempo-container').innerHTML = '';
    document.getElementById('linea-tiempo-container').appendChild(timeline);
    
    configurarBotonesTimeline();
    
  } catch (error) {
    console.error("Error inicializando componentes:", error);
    mostrarError("¡Ups! Hubo un problema cargando los datos");
  }
}

// =============================================
// EVENTO DE CARTA - VERSIÓN OPTIMIZADA
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const carta = document.getElementById('carta');
  const musica = document.getElementById('musica');
  const intro = document.getElementById('intro');
  const main = document.getElementById('main');
  
  let cartaAbierta = false;
  const FECHA_INICIO = new Date('2025-05-14');
  
  carta.addEventListener('click', async () => {
    if (cartaAbierta) return;
    cartaAbierta = true;
    
    carta.src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';
    
    // Reproducir música con manejo de errores
    try {
      configurarAudio();
      await musica.play();
    } catch (e) {
      console.log("Auto-play bloqueado:", e)
      mostrarError("Toca el botón 🔊 para activar el audio");
    }
    
    if (navigator.vibrate && window.matchMedia('(hover: none)').matches) {
      navigator.vibrate([200, 100, 200]);
    }

    intro.style.opacity = '0';
    
    setTimeout(() => {
      intro.style.display = 'none';
      main.style.display = 'block';
      
      setTimeout(async () => {
        main.style.opacity = '1';
        
        // Iniciar contador
        actualizarContador(FECHA_INICIO);
        setInterval(() => actualizarContador(FECHA_INICIO), 60000);
        
        // Cargar datos y componentes
        await cargarDatosYComponentes();
        
      }, 50);
    }, 300);
  });
});