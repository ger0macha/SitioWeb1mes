// =============================================
// CONFIGURACIÓN PRINCIPAL
// =============================================

// Verifica que fullpage.js esté cargado
if (typeof fullpage === 'undefined') {
  console.error('fullPage.js no está cargado correctamente');
  mostrarError("Error crítico: Por favor recarga la página");
} else {
  console.log('fullPage.js cargado correctamente');
}

const SHEET_ID = "1m5TOfOxH_itvSyxCQ5lvQEtH6HwZfH7bsdWryHK5diI";
const SHEET_NAME = "ubi";

// =============================================
// VARIABLES GLOBALES
// =============================================
let mapa;
let ubicacionesGlobales = [];

// =============================================
// FUNCIONES AUXILIARES
// =============================================
function mostrarError(mensaje) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 5000);
  }
}

// =============================================
// FUNCION REPRODUCCION DE AUDIO
// =============================================

function configurarAudio() {
  const musica = document.getElementById('musica');
  const muteBtn = document.getElementById('mute-btn');
  
  if (!musica || !muteBtn) return;
  
  let isMuted = false;

  // Configuración inicial de volumen
  musica.volume = 0.6;

  // Efecto de fade out después de 5 segundos
  setTimeout(() => {
    const fadeAudio = setInterval(() => {
      if (musica.volume > 0.3) {
        musica.volume -= 0.05;
      } else {
        clearInterval(fadeAudio);
      }
    }, 200);
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
        
        // Rutas corregidas - ahora apuntando directamente a /fotos/
        let fotoPath = '';
        if (item.foto) {
          // Eliminar espacios y normalizar nombre
          const cleanName = item.foto.trim()
            .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
            .toLowerCase();
          
          // Ruta directa a la carpeta fotos
          fotoPath = `fotos/${cleanName}`;
        }
        
        return {
          titulo: item.titulo || 'Sin título',
          fecha: item.fecha || '',
          fechaObj: item.fecha ? new Date(item.fecha) : new Date(),
          descripcion: item.descripcion || '',
          icono: item.icono || '❤️',
          foto: fotoPath, // Usamos la ruta modificada
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

  window.addEventListener('resize', () => {
    setTimeout(() => {
      if (mapa) {
        mapa.invalidateSize();
        mapa.fitBounds(markers.getBounds().pad(0.2));
      }
    }, 300);
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (mapa) {
        mapa.invalidateSize();
        mapa.fitBounds(markers.getBounds().pad(0.2));
      }
    }, 500);
  });
}

// =============================================
// LÍNEA DE TIEMPO - VERSIÓN MEJORADA
// =============================================
function crearLineaDeTiempo() {
  const contenedor = document.createElement('div');
  contenedor.className = 'timeline-container';
  
  const isMobile = window.innerWidth < 768;
  
  // Ajustar línea central para móviles
  if (isMobile) {
    contenedor.style.setProperty('--line-position', '30px');
  }
  
  ubicacionesGlobales.forEach((ubicacion, index) => {
    const evento = document.createElement('div');
    
    if (isMobile) {
      evento.className = 'timeline-event mobile';
    } else {
      evento.className = `timeline-event ${index % 2 === 0 ? 'left' : 'right'}`;
    }
    
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
  if (!galeriaContainer) return;
  
  galeriaContainer.innerHTML = '';
  
  ubicacionesGlobales.filter(ubicacion => ubicacion.foto).forEach(ubicacion => {
    const link = document.createElement('a');
    link.href = ubicacion.foto;
    link.classList.add('gallery-item');
    link.dataset.subHtml = `<h4>${ubicacion.titulo}</h4><p>${ubicacion.descripcion}</p>`;
    
    const img = document.createElement('img');
    // Usar el atributo nativo loading="lazy" del navegador
    img.src = ubicacion.foto;
    img.alt = ubicacion.descripcion;
    img.loading = 'lazy';
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s';
    
    img.onload = function() {
      this.style.opacity = '1';
    };
    
    img.onerror = function() {
      this.src = 'assets/placeholder.jpg';
      this.style.opacity = '1';
      this.onerror = null;
    };
    
    link.appendChild(img);
    galeriaContainer.appendChild(link);
  });
  
  // Inicializar la galería después de un pequeño retraso para asegurar que el DOM está listo
  setTimeout(initGallery, 100);
}

function initGallery() {
  const galeriaContainer = document.getElementById('galeria-container');
  if (!galeriaContainer || !lightGallery) return;
  
  try {
    // Destruir instancia previa si existe
    if (window.galleryInstance) {
      window.galleryInstance.destroy();
    }
    
    // Crear nueva instancia con configuración optimizada
    window.galleryInstance = lightGallery(galeriaContainer, {
      selector: 'a.gallery-item',
      plugins: [lgZoom],
      speed: 300,
      download: false,
      mobileSettings: {
        controls: true,
        showCloseIcon: true,
        download: false
      }
    });
  } catch (e) {
    console.error("Error inicializando galería:", e);
  }
}



// =============================================
// FULLPAGE - CONFIGURACIÓN CORREGIDA
// =============================================
function initFullpage() {
  // Destruir instancia existente si hay una
  if (window.fullpageInstance) {
    try {
      fullpage.destroy('all');
    } catch (e) {
      console.log("Error al destruir instancia previa:", e);
    }
  }
  
  const mensajeEl = document.querySelector('.mensaje');
  const audioControls = document.getElementById('audio-controls');

  // Configuración con callbacks corregidos
  const fpOptions = {
    licenseKey: 'OPEN-SOURCE-GPLV3-LICENSE',
    autoScrolling: true,
    scrollBar: false,
    navigation: true,
    anchors: ['mensaje', 'contador', 'linea-tiempo', 'lugares', 'memorias'],
    responsiveWidth: 400,
    scrollOverflow: true,
    responsiveHeight: 600,
    normalScrollElements: '.section-content, .timeline-container, #galeria-container, #mapa-container, .lg-content',

    // Usamos arrow function para mantener el contexto
    afterResponsive: (isResponsive) => {
      if (!window.fullpageInstance) return;
      
      try {
        if (isResponsive) {
          window.fullpageInstance.setAutoScrolling(false);
          window.fullpageInstance.setFitToSection(false);
        } else {
          window.fullpageInstance.setAutoScrolling(true);
          window.fullpageInstance.setFitToSection(true);
        }
      } catch (e) {
        console.error("Error en afterResponsive:", e);
      }
    },

    afterLoad: (origin, destination) => {
// Ocultar el mensaje cuando se sale de la primera sección
      if (destination.anchor === 'mensaje') {
        mensajeEl.classList.remove('hidden');
        audioControls.classList.remove('hidden');
      } else {
        mensajeEl.classList.add('hidden');
        audioControls.classList.add('hidden');
      }

      if (destination && destination.anchor === 'lugares' && mapa) {
        setTimeout(() => {
          try {
            mapa.invalidateSize();
          } catch (e) {
            console.error("Error redimensionando mapa:", e);
          }
        }, 300);
      }
      
      // Forzar redibujado en móviles
      if (window.innerWidth < 768 && window.fullpageInstance) {
        setTimeout(() => {
          try {
            window.fullpageInstance.reBuild();
            document.querySelectorAll('.section').forEach(section => {
              section.style.transform = 'none';
            });
          } catch (e) {
            console.error("Error al reconstruir fullpage:", e);
          }
        }, 100);
      }
    },

    afterRender: () => {
      if (window.innerWidth < 768 && window.fullpageInstance) {
        setTimeout(() => {
          try {
            window.fullpageInstance.reBuild();
            document.querySelectorAll('.section').forEach(section => {
              section.style.transform = 'none';
            });
          } catch (e) {
            console.error("Error al reconstruir fullpage:", e);
          }
        }, 300);
      }
    }
  };

  // Crear nueva instancia
  try {
    window.fullpageInstance = new fullpage('#fullpage', fpOptions);
    console.log("Fullpage inicializado correctamente");
  } catch (e) {
    console.error("Error al inicializar fullpage:", e);
    mostrarError("Error al cargar la página. Por favor recarga.");
  }
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
      
      if (!mapa) return;
      
      mapa.setView(ubicacion.coordenadas, 15);
      setTimeout(() => {
        if (!mapa) return;
        
        const marker = Object.values(mapa._layers)
          .find(layer => layer instanceof L.Marker && 
                layer.getLatLng().equals(ubicacion.coordenadas));
        if (marker) marker.openPopup();
      }, 500);
      
      if (window.fullpageInstance) {
        window.fullpageInstance.moveTo('lugares');
      }
    });
  });
}

// =============================================
// CARGA PRINCIPAL DE DATOS Y COMPONENTES
// =============================================
async function cargarDatosYComponentes() {
  try {
    ubicacionesGlobales = await cargarDatosDesdeSheets();
     
    // Verificación de rutas de imágenes
    console.log("Ubicaciones cargadas:", ubicacionesGlobales);
    ubicacionesGlobales.filter(u => u.foto).forEach(u => {
      console.log(`Ruta de imagen para ${u.titulo}:`, u.foto);
    });
    
    initFullpage();
    initMap();
    crearGaleria();
    initGallery();
    
    const timeline = crearLineaDeTiempo();
    const timelineContainer = document.getElementById('linea-tiempo-container');
    if (timelineContainer) {
      timelineContainer.innerHTML = '';
      timelineContainer.appendChild(timeline);
    }
    
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
  
  if (!carta || !musica || !intro || !main) return;
  
  let cartaAbierta = false;
  const FECHA_INICIO = new Date('2025-05-14');
  
  carta.addEventListener('click', async () => {
    if (cartaAbierta) return;
    cartaAbierta = true;
    
    carta.src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';

    carta.style.transform = 'rotate(10deg) scale(1.1)';
    setTimeout(() => {
      carta.style.transform = 'rotate(0) scale(1)'; 
    }, 300);
    
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

        // Configurar áreas para cambiar de slide
  const leftControl = document.querySelector('.slide-control-left');
  const rightControl = document.querySelector('.slide-control-right');
      
  if (leftControl && rightControl && fullpageInstance) {
    leftControl.addEventListener('click', () => {
      fullpageInstance.moveSlideLeft();
    });
        
    rightControl.addEventListener('click', () => {
      fullpageInstance.moveSlideRight();
    });
  }
});