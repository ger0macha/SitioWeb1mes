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
    
    // Procesar y validar datos
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
      .filter(item => item.coordenadas.length === 2) // Solo items con coordenadas válidas
      .sort((a, b) => a.fechaObj - b.fechaObj); // Ordenar cronológicamente
    
  } catch (error) {
    console.error("Error cargando datos:", error);
    mostrarError("Error cargando datos desde Google Sheets");
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
    anchors: ['mensaje', 'contador', 'linea-tiempo', 'mapa', 'galeria'],
    scrollingSpeed: 800,
    afterLoad: function(origin, destination) {
      if (destination.anchor === 'mapa' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 300);
      }
    }
  });
}

function crearGaleria(ubicaciones) {
  const galeriaContainer = document.getElementById('galeria-container');
  galeriaContainer.innerHTML = '';
  
  ubicaciones.filter(ubicacion => ubicacion.foto).forEach(ubicacion => {
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

async function cargarDatosYComponentes() {
  try {
    // 1. Cargar datos desde Google Sheets
    const ubicaciones = await cargarDatosDesdeSheets();
    
    // 2. Inicializar componentes principales
    initFullpage();
    initMap(ubicaciones);
    
    // 3. Crear e inicializar galería
    crearGaleria(ubicaciones);
    initGallery();
    
    // 4. Crear línea de tiempo
    const timeline = crearLineaDeTiempo(ubicaciones);
    document.getElementById('linea-tiempo-container').innerHTML = '';
    document.getElementById('linea-tiempo-container').appendChild(timeline);
    
    // 5. Configurar eventos de la línea de tiempo
    configurarBotonesTimeline(ubicaciones);
    
    return ubicaciones;
  } catch (error) {
    console.error("Error inicializando componentes:", error);
    mostrarError("¡Ups! Hubo un problema cargando los datos");
    return [];
  }
}

function actualizarContador(fechaInicio) {
  const ahora = new Date();
  
  // 1. Validar fechas
  if (fechaInicio > ahora) {
    console.error("La fecha de inicio es futura");
    return;
  }

  // 2. Calcular meses completos
  let meses = (ahora.getFullYear() - fechaInicio.getFullYear()) * 12;
  meses += ahora.getMonth() - fechaInicio.getMonth();
  
  // Ajustar si el día actual es menor que el día de inicio
  if (ahora.getDate() < fechaInicio.getDate()) {
    meses--;
  }

  // 3. Calcular días restantes
  const fechaBase = new Date(fechaInicio);
  fechaBase.setMonth(fechaBase.getMonth() + meses);
  
  let dias = Math.floor((ahora - fechaBase) / (1000 * 60 * 60 * 24));
  
  // Ajuste de borde: cuando la diferencia es exactamente 1 mes
  if (dias < 0) {
    meses--;
    fechaBase.setMonth(fechaBase.getMonth() - 1);
    dias = Math.floor((ahora - fechaBase) / (1000 * 60 * 60 * 24));
  }

  // 4. Calcular horas del día actual
  const inicioDia = new Date(ahora);
  inicioDia.setHours(0, 0, 0, 0);
  
  const horas = Math.floor((ahora - inicioDia) / (1000 * 60 * 60));

  // 5. Actualizar DOM
  document.getElementById('meses').textContent = meses;
  document.getElementById('dias').textContent = dias;
  document.getElementById('horas').textContent = horas;
  
  // 6. Devolver datos para depuración
  return { meses, dias, horas };
}



// =============================================
// MECANISMO DE CARTA (RESTAURADO)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM
  const carta = document.getElementById('carta');
  const musica = document.getElementById('musica');
  const intro = document.getElementById('intro');
  const main = document.getElementById('main');
  
  // Variables de estado
  let cartaAbierta = false;
  const FECHA_INICIO = new Date('2025-05-14'); // FECHA REAL AQUÍ
  
  // Evento principal
  carta.addEventListener('click', async () => {
    if (cartaAbierta) return;
    cartaAbierta = true;
    
    // Animación inicial
    carta.src = 'https://cdn-icons-png.flaticon.com/512/1925/1925282.png';
    musica.play().catch(e => console.log("Auto-play bloqueado:", e));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // Transición de pantallas
    intro.style.opacity = '0';
    
    setTimeout(async () => {
      intro.style.display = 'none';
      main.style.display = 'block';
      
      setTimeout(async () => {
        main.style.opacity = '1';
        
        // Inicializar componentes
        await cargarDatosYComponentes();
        
      }, 50);
    }, 300);
  });

  // Función para inicializar todos los componentes
  async function inicializarComponentes() {
    try {
      // Contador de tiempo
      const FECHA_INICIO = new Date('2025-05-14');
      actualizarContador(FECHA_INICIO);
      
      setInterval(() => actualizarContador(FECHA_INICIO), 3600000); // Actualizar cada hora
      
      // Cargar datos y componentes
      const ubicaciones = await cargarDatosDesdeSheets();
      
      initFullpage();
      initMap(ubicaciones);
      initGallery();
      
      // Línea de tiempo
      const timeline = crearLineaDeTiempo(ubicaciones);
      document.getElementById('linea-tiempo-container').appendChild(timeline);
      
      // Eventos de la línea de tiempo
      configurarBotonesTimeline(ubicaciones);
      
    } catch (error) {
      console.error("Error inicializando componentes:", error);
      mostrarError("Ocurrió un error al cargar los datos");
    }
  }

  // Función para configurar botones de timeline
  function configurarBotonesTimeline(ubicaciones) {
    document.querySelectorAll('.timeline-map-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        const ubicacion = ubicaciones[index];
        
        mapa.setView(ubicacion.coordenadas, 15);
        setTimeout(() => {
          const marker = Object.values(mapa._layers)
            .find(layer => layer instanceof L.Marker && 
                  layer.getLatLng().equals(ubicacion.coordenadas));
          if (marker) marker.openPopup();
        }, 500);
        
        fullpageInstance.moveTo('mapa');
      });
    });
  }

  // Función para mostrar errores
  function mostrarError(mensaje) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 5000);
  }
});