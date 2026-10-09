
let experiencias = [];
let reservas = [];

let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");

// Cargar experiencias desde el archivo JSON
async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";

    const respuesta = await fetch("./data/experiencias.json");

    if (!respuesta.ok) {
      throw new Error("No fue posible cargar las experiencias");
    }

    experiencias = await respuesta.json();

    estado.textContent =
      `${experiencias.length} experiencias disponibles`;

    actualizarCatalogo();
    mostrarReservas();

  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

// Obtener experiencias según los filtros seleccionados
function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(
      experiencia => experiencia.categoria === categoriaActual
    );
  }

  if (textoBusqueda !== "") {
    resultados = resultados.filter(
      experiencia =>
        experiencia.nombre.toLowerCase().includes(textoBusqueda)
    );
  }

  if (ordenActual === "ascendente") {
    resultados.sort((a, b) => a.precio - b.precio);
  }

  if (ordenActual === "descendente") {
    resultados.sort((a, b) => b.precio - a.precio);
  }

  return resultados;
}

// Mostrar las tarjetas del catálogo
function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML =
      '<p class="sin-resultados">No se encontraron experiencias</p>';

    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>

      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>

        <label for="cantidad-${e.id}">Personas:</label>

        <input
          type="number"
          id="cantidad-${e.id}"
          min="1"
          max="${e.cupo}"
          value="1"
        >

        <button class="btn-reservar" data-id="${e.id}">
          Agregar
        </button>
      </div>
    </article>
  `).join("");

  estado.textContent = `${resultados.length} resultados`;

  agregarEventosReservar();
}

// Asignar eventos a los botones Agregar
function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => {
      agregarReserva(Number(boton.dataset.id));
    });
  });
}

// Agregar una experiencia a la reservación
function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);

  const entrada = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(entrada.value);

  if (
    !experiencia ||
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > experiencia.cupo
  ) {
    alert("Cantidad no válida");
    return;
  }

  const existente = reservas.find(
    r => r.experienciaId === id
  );

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;

    if (nuevaCantidad > experiencia.cupo) {
      alert("La cantidad supera el cupo disponible");
      return;
    }

    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;

  } else {
    reservas.push({
      experienciaId: experiencia.id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad: cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarReservas();
}

// Mostrar reservaciones, número de personas e importe total
function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML =
      "<p>No hay experiencias seleccionadas.</p>";

    total.textContent = "Total: $0 MXN";
    totalPersonas.textContent = "Total de personas: 0";
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio} MXN c/u</p>

        <div class="controles-cantidad">
          <button
            class="btn-cantidad"
            data-id="${r.experienciaId}"
            data-cambio="-1"
            ${r.cantidad <= 1 ? "disabled" : ""}
            aria-label="Disminuir personas de ${r.nombre}"
          >−</button>

          <span>${r.cantidad} persona(s)</span>

          <button
            class="btn-cantidad"
            data-id="${r.experienciaId}"
            data-cambio="1"
            ${r.cantidad >= experiencias.find(e => e.id === r.experienciaId).cupo ? "disabled" : ""}
            aria-label="Aumentar personas de ${r.nombre}"
          >+</button>
        </div>
      </div>

      <div class="acciones-reserva">
        <strong>$${r.subtotal} MXN</strong>

        <button class="btn-eliminar" data-id="${r.experienciaId}">
          Eliminar
        </button>
      </div>
    </article>
  `).join("");

  const totalReserva = reservas.reduce(
    (suma, r) => suma + r.subtotal,
    0
  );

  const cantidadPersonas = reservas.reduce(
    (suma, r) => suma + r.cantidad,
    0
  );

  totalPersonas.textContent =
    `Total de personas: ${cantidadPersonas}`;

  total.textContent = `Total: $${totalReserva} MXN`;

  agregarEventosEliminar();
  agregarEventosCantidad();
}

// Cambiar la cantidad de personas desde Mi reservación
function agregarEventosCantidad() {
  document.querySelectorAll(".btn-cantidad").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      const cambio = Number(boton.dataset.cambio);

      cambiarCantidad(id, cambio);
    });
  });
}

// Aumentar o disminuir personas y recalcular el subtotal
function cambiarCantidad(id, cambio) {
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);

  if (!reserva || !experiencia) return;

  const nuevaCantidad = reserva.cantidad + cambio;

  if (nuevaCantidad < 1 || nuevaCantidad > experiencia.cupo) {
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;

  mostrarReservas();
}

// Asignar eventos a los botones Eliminar
function agregarEventosEliminar() {
  document.querySelectorAll(".btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => {
      eliminarReserva(Number(boton.dataset.id));
    });
  });
}

// Eliminar una experiencia de la reservación
function eliminarReserva(id) {
  reservas = reservas.filter(
    r => r.experienciaId !== id
  );

  mostrarReservas();
}

// Buscar experiencias
buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

// Filtrar por categoría
filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

// Ordenar por precio
ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

// Iniciar la aplicación
cargarExperiencias();