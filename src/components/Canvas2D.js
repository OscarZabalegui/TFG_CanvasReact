import React, { useState, useCallback } from "react";
import { ChromePicker, SliderPicker } from 'react-color'; // Seleccion interactiva
import Sketch from "react-p5";
import HandPoseDetector from "./HandPoseDetector"; // Asegúrate de importar tu detector
import "./Canvas.css";

const Canvas2D = () => {
  const [selectedShape, setSelectedShape] = useState("triangle");
  const [shapes, setShapes] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedSize, setSelectedSize] = useState(40);
  const [mode, setMode] = useState("create"); // "create"/"move"/"delete"/"select"
  const [selectedFigure, setSelectedFigure] = useState(null); // La figura seleccionada para mover
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  const [showSizeOptions, setShowSizeOptions] = useState(false);
  const [handPosition, setHandPosition] = useState(null);
  const [lastGestureTime, setLastGestureTime] = useState(0);
  const [userMetrics, setUserMetrics] = useState({
    figuresUsed: {}, // {"triangle": 3, "circle": 2}
    colorsUsed: {}, // {"#ff0000": 4, "#00ff00": 1}
    sizesUsed: {}, // {"40": 5, "60": 2}
    dragTimes: [], // [125, 200] (duraciones en ms)
    dragDistances: [], // [50, 120] (distancias en px)
    currentDragStart: null, // Tiempo de inicio del arrastre actual
    currentDragCoords: null, // Coordenadas iniciales del arrastre
  });


  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(640, 480).parent(canvasParentRef);
  };

  const draw = (p5) => {
    p5.background(200);
    // Dibujar todas las figuras
    if (handPosition) {
      p5.fill(0, 255, 0);
      p5.ellipse(handPosition.x, handPosition.y, 10, 10); // Punto verde en la mano
    }
    shapes.forEach(({ type, x, y, color, size }) => {
      p5.fill(color);
      switch (type) {
        case "triangle":
          p5.triangle(x, y - size / 2, x - size / 2, y + size / 2, x + size / 2, y + size / 2);
          break;
        case "circle":
          p5.ellipse(x, y, size, size);
          break;
        case "square":
          p5.rect(x - size / 2, y - size / 2, size, size);
          break;
        case "pentagon":
          drawPolygon(p5, x, y, 5, size / 2); // 5 son los lados
          break;
        case "hexagon":
          drawPolygon(p5, x, y, 6, size / 2); // 6 lados
          break;
        default:
          break;
      }
    });
  };

  const mousePressed = (p5) => {
    if (p5.mouseX < 0 || p5.mouseX > p5.width || p5.mouseY < 0 || p5.mouseY > p5.height) {
      return; // Clic fuera del canvas, salimos de la función
    }

    if (mode === "select") {

      shapes.forEach(({ type, x, y, size }, index) => {
        let corners = [];

        if (type === "square") {
          corners = [
            { x: x - size / 2, y: y - size / 2 },
            { x: x + size / 2, y: y - size / 2 },
            { x: x - size / 2, y: y + size / 2 },
            { x: x + size / 2, y: y + size / 2 },
          ];
        } else if (type === "triangle") {
          corners = [
            { x, y: y - size / 2 },
            { x: x - size / 2, y: y + size / 2 },
            { x: x + size / 2, y: y + size / 2 },
          ];
        } else if (type === "circle") {
          corners = [
            { x: x - size / 2, y },
            { x: x + size / 2, y },
            { x, y: y - size / 2 },
            { x, y: y + size / 2 },
          ];
        }

        for (const corner of corners) {
          if (p5.dist(p5.mouseX, p5.mouseY, corner.x, corner.y) < 10) {
            setSelectedFigure(index); // Selecciona la figura
            setUserMetrics((prev) => ({
              ...prev,
              currentDragStart: { x: p5.mouseX, y: p5.mouseY }, // Iniciamos coordenadas y asi funciona tmb como un if
            }));
            break;
          }
        }
      });
    }

    if (mode === "create") {
      // Crea una figura
      setShapes((prev) => [
        ...prev,
        { type: selectedShape, x: p5.mouseX, y: p5.mouseY, color: selectedColor, size: selectedSize },
      ]);
      setUserMetrics((prev) => ({
        ...prev,
        currentDragStart: Date.now(), // Registrar el tiempo al hacer clic
        currentDragCoords: { x: p5.mouseX, y: p5.mouseY }, // Coordenadas iniciales
      }));
      updateFigureMetrics(); // Actualizar otros datos

    } else if (mode === "move") {
      // Comprobar si se ha hecho clic en una figura para moverla
      for (let i = 0; i < shapes.length; i++) {
        const { x, y, size } = shapes[i];
        if (p5.dist(p5.mouseX, p5.mouseY, x, y) < size / 2) {
          setSelectedFigure(i); // Marcar la figura como seleccionada
          setUserMetrics((prev) => ({
            ...prev,
            currentDragStart: Date.now(),
            currentDragCoords: { x: p5.mouseX, y: p5.mouseY },
          }));
          break;
        }
      }
    } else if (mode === "delete") {
      // Eliminar una figura al hacer clic sobre ella
      for (let i = 0; i < shapes.length; i++) {
        const { x, y, size } = shapes[i];
        if (p5.dist(p5.mouseX, p5.mouseY, x, y) < size / 2) {
          setShapes((prevShapes) => prevShapes.filter((_, index) => index !== i)); // Eliminar la figura
          break;
        }
      }
    }
  };

  const mouseDragged = (p5) => {
    if (mode === "move" && selectedFigure !== null) { // Solo si hay una figura seleccionada y es el modo mover
      // Mover la figura seleccionada mientras se arrastra el ratón 
      setShapes((prevShapes) => {
        const newShapes = [...prevShapes]; // Creamos una copia del array de figuras ya que en React no es buena práctica modificar directamente el estado de un objeto
        // Es mejor crear una copia y reflejar luego los cambios 
        newShapes[selectedFigure] = { // Aqui simplemente elegimos la figura seleccionada y cambiamos sus cordenadas por las del raton en tiempo real
          ...newShapes[selectedFigure],
          x: p5.mouseX,
          y: p5.mouseY,
        };
        return newShapes;
      });
    }
    if (selectedFigure !== null && mode === "select") {
      const scaleFactor = 0.7; // Velocidad
      setShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        const figure = newShapes[selectedFigure];

        // Cambiar el tamaño de la figura dependiendo del arrastre
        const dx = p5.mouseX - userMetrics.currentDragStart.x;
        const dy = p5.mouseY - userMetrics.currentDragStart.y;

        // Aplicar el factor de escala al cambio de tamaño
        const deltaSize = Math.max(dx, dy) * scaleFactor;
        const newSize = Math.max(2, figure.size + deltaSize); // Evitar tamaños negativos

        newShapes[selectedFigure] = { ...figure, size: newSize };
        return newShapes;
      });
    }
  };


  const mouseMoved = (p5) => {
    if (mode === "select") {


      let isOverCorner = false;

      shapes.forEach(({ type, x, y, size }, index) => {
        let corners = [];

        if (type === "square") {

          corners = [
            { x: x - size / 2, y: y - size / 2 }, // sup izq
            { x: x + size / 2, y: y - size / 2 }, // sup der
            { x: x - size / 2, y: y + size / 2 }, // inf izq
            { x: x + size / 2, y: y + size / 2 }, // inf der
          ];
        } else if (type === "triangle") {

          corners = [
            { x, y: y - size / 2 }, // vrt sup
            { x: x - size / 2, y: y + size / 2 }, // vrt inf izq
            { x: x + size / 2, y: y + size / 2 }, // vrt inf der
          ];
        } else if (type === "circle") {

          corners = [
            { x: x - size / 2, y }, // izq
            { x: x + size / 2, y }, // der
            { x, y: y - size / 2 }, // arri
            { x, y: y + size / 2 }, // abj
          ];
        }

        // Verificar si el raton está cerca de alguna esquina
        for (const corner of corners) {
          if (p5.dist(p5.mouseX, p5.mouseY, corner.x, corner.y) < 10) {
            p5.cursor('nwse-resize'); // Cambia el cursor
            isOverCorner = true;
            break;
          }
        }
      });

      if (!isOverCorner) {
        p5.cursor('default'); // Restaurar cursor si no está sobre una esquina pq si no se queda el icono
      }
    }
  };


  const handleHandMove = useCallback((x, y) => {
    // Actualiza la posición solo si hay un cambio significativo
    setHandPosition(prev => {
      if (!prev || Math.abs(prev.x - x) > 5 || Math.abs(prev.y - y) > 5) {
        return { x, y };
      }
      return prev;
    });
  
    if (selectedFigure !== null) {
      setShapes(prevShapes => {
        const newShapes = [...prevShapes];
        newShapes[selectedFigure] = { 
          ...newShapes[selectedFigure], 
          x, 
          y 
        };
        return newShapes;
      });
    }
  }, [selectedFigure]); // Dependencias del useCallback

  const handleHandClick = (x, y) => {
    const clickedIndex = shapes.findIndex(({ x: sx, y: sy, size }) =>
      Math.sqrt(Math.pow(sx - x, 2) + Math.pow(sy - y, 2)) < size / 2
    );

    if (clickedIndex !== -1) {
      setSelectedFigure(clickedIndex);
    } else {
      setShapes((prev) => [...prev, { type: selectedShape, x, y, color: selectedColor, size: selectedSize }]);
      updateFigureMetrics();
    }
  };




  const mouseReleased = (p5) => {
    if (mode === "move" && userMetrics.currentDragStart && userMetrics.currentDragCoords) { // Si es el modo mover y las variables han sido inicializadas
      const dragDuration = Date.now() - userMetrics.currentDragStart;
      const dragEndCoords = { x: p5.mouseX, y: p5.mouseY };
      const dragDistance = Math.sqrt( // Calcular distancia, pitagoras
        Math.pow(dragEndCoords.x - userMetrics.currentDragCoords.x, 2) +
        Math.pow(dragEndCoords.y - userMetrics.currentDragCoords.y, 2)
      );

      // Actualizar métricas
      setUserMetrics((prev) => ({
        ...prev,
        dragTimes: [...prev.dragTimes, dragDuration],
        dragDistances: [...prev.dragDistances, dragDistance],
        currentDragStart: null, // Reiniciar el tiempo de inicio
        currentDragCoords: null, // Reiniciar coordenadas iniciales
      }));
    }
  };


  const handleModeChange = (newMode) => { // Necesitamos llamar a un handler para manejar bien los estados de la aplicación
    setMode(newMode);
    setSelectedFigure(null); // Resetear la figura seleccionada al cambiar de modo
  };


  const updateFigureMetrics = () => {
    setUserMetrics((prev) => ({
      ...prev,
      figuresUsed: {
        ...prev.figuresUsed,
        [selectedShape]: (prev.figuresUsed[selectedShape] || 0) + 1,
      },
      colorsUsed: {
        ...prev.colorsUsed,
        [selectedColor]: (prev.colorsUsed[selectedColor] || 0) + 1,
      },
      sizesUsed: {
        ...prev.sizesUsed,
        [selectedSize]: (prev.sizesUsed[selectedSize] || 0) + 1,
      },
    }));
  };

  // Cogido de https://www.youtube.com/watch?v=cw8QDjROUTw
  const drawPolygon = (p5, x, y, n, radius) => {

    p5.beginShape();
    for (let i = 0; i < n; i++) {
      p5.vertex(x + Math.cos(i * p5.TWO_PI / n) * radius, y + Math.sin(i * p5.TWO_PI / n) * radius);
    }
    p5.endShape(p5.CLOSE);
  };

  const handleGesture = (gestureType, position) => {
    const now = Date.now();
    // Evita gestos demasiado seguidos (500ms de cooldown)
    if (now - lastGestureTime < 500) return;

    setLastGestureTime(now);

    if (gestureType === 'pinch') {
      setShapes((prev) => [
        ...prev,
        {
          type: "triangle",
          x: position.x,
          y: position.y,
          color: selectedColor,
          size: selectedSize
        },
      ]);

      setUserMetrics((prev) => ({
        ...prev,
        figuresUsed: {
          ...prev.figuresUsed,
          triangle: (prev.figuresUsed.triangle || 0) + 1,
        },
        colorsUsed: {
          ...prev.colorsUsed,
          [selectedColor]: (prev.colorsUsed[selectedColor] || 0) + 1,
        },
        sizesUsed: {
          ...prev.sizesUsed,
          [selectedSize]: (prev.sizesUsed[selectedSize] || 0) + 1,
        },
      }));
    }
  };


  return (
    <div className="canvas-container">
      {/* Controles a la izquierda */}
      <div className="controls-container">
        <button className={`big-button ${mode === "create" ? "selected-button2" : ""}`} onClick={() => handleModeChange("create")}
        >
          Crear
        </button>
        {mode === "create" && ( // Esto es una forma que tiene React para renderizar solo si se cumple las condiciones, en este caso que el modo este en Crear
          <div className="options-panel">
            <button onClick={() => setShowShapeOptions(!showShapeOptions)}>
              Figura
            </button>
            {showShapeOptions && (
              <div className="dropdown-options">
                <button onClick={() => setSelectedShape("triangle")}
                  className={selectedShape === "triangle" ? "selected-button" : ""}><svg width="40" height="40">
                    <polygon
                      points="20,5 5,35 35,35"
                      fill={selectedShape === "triangle" ? selectedColor : "gray"}
                    />
                  </svg></button>
                <button onClick={() => setSelectedShape("circle")}
                  className={selectedShape === "circle" ? "selected-button" : ""}><svg width="40" height="40">
                    <circle
                      cx="20"
                      cy="20"
                      r="15"
                      fill={selectedShape === "circle" ? selectedColor : "gray"}
                    />
                  </svg></button>
                <button onClick={() => setSelectedShape("square")}
                  className={selectedShape === "square" ? "selected-button" : ""}><svg width="40" height="40">
                    <rect
                      x="5"
                      y="5"
                      width="30"
                      height="30"
                      fill={selectedShape === "square" ? selectedColor : "gray"}
                    />
                  </svg></button>
                <button onClick={() => setSelectedShape("pentagon")}
                  className={selectedShape === "pentagon" ? "selected-button" : ""}><svg width="40" height="40">
                    <polygon
                      points="20,5 5,15 10,35 30,35 35,15"
                      fill={selectedShape === "pentagon" ? selectedColor : "gray"}
                    />
                  </svg></button>
                <button onClick={() => setSelectedShape("hexagon")}
                  className={selectedShape === "hexagon" ? "selected-button" : ""}><svg width="40" height="40">
                    <polygon
                      points="20,5 5,15 5,35 20,45 35,35 35,15"
                      fill={selectedShape === "hexagon" ? selectedColor : "gray"}
                    />
                  </svg></button>
              </div>
            )}

            <button onClick={() => setShowColorPicker(!showColorPicker)}>
              Color
            </button>
            {showColorPicker && (
              <SliderPicker
                color={selectedColor}
                onChangeComplete={(color) => setSelectedColor(color.hex)}
              />
            )}

            <button onClick={() => setShowSizeOptions(!showSizeOptions)}>
              Tamaño: {selectedSize}
            </button>
            {showSizeOptions && (
              <input
                type="range"
                min="10"
                max="100"
                value={selectedSize}
                onChange={(e) => setSelectedSize(Number(e.target.value))}
              />
            )}
          </div>
        )}

        <button className={`big-button ${mode === "move" ? "selected-button2" : ""}`} onClick={() => handleModeChange("move")}>
          Mover
        </button>
        <button className={`big-button ${mode === "delete" ? "selected-button2" : ""}`} onClick={() => handleModeChange("delete")}>
          Eliminar
        </button>
        <button className={`big-button ${mode === "select" ? "selected-button2" : ""}`} onClick={() => handleModeChange("select")}>
          Seleccionar
        </button>


      </div>
      {/* Agregar la detección de mano */}
      <HandPoseDetector
        onHandMove={handleHandMove}
        onHandClick={handleHandClick}
        onGesture={handleGesture} // Nueva prop
      />

      <div className="canvas-wrapper">
        <Sketch
          setup={setup}
          draw={(p) => draw(p, handPosition)}  // Pasamos la posición de la mano
          mousePressed={mousePressed}
          mouseDragged={mouseDragged}
          mouseReleased={mouseReleased}
          mouseMoved={mouseMoved}
        />
      </div>
    </div>
  );
};


export default Canvas2D;
