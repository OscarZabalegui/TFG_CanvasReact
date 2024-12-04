import React, { useState } from "react";
import { ChromePicker } from 'react-color'; // Seleccion interactiva
import Sketch from "react-p5";
import "./Canvas.css";

const Canvas2D = () => {
  const [selectedShape, setSelectedShape] = useState("triangle");
  const [shapes, setShapes] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedSize, setSelectedSize] = useState(40);
  const [mode, setMode] = useState("create"); // "create" o "move"
  const [selectedFigure, setSelectedFigure] = useState(null); // La figura seleccionada para mover
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
    p5.createCanvas(600, 600).parent(canvasParentRef);
  };

  const draw = (p5) => {
    p5.background(200);
    // Dibujar todas las figuras
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
        default:
          break;
      }
    });
  };

  const mousePressed = (p5) => {
    if (p5.mouseX < 0 || p5.mouseX > p5.width || p5.mouseY < 0 || p5.mouseY > p5.height) {
      return; // Clic fuera del canvas, salimos de la función
    }
    if (mode === "create") {
      // Crea una figura
      setShapes((prev) => [...prev, { type: selectedShape, x: p5.mouseX, y: p5.mouseY, color: selectedColor, size: selectedSize }]); // Crea igual q antes
      setUserMetrics((prev) => ({
        ...prev,
        currentDragStart: Date.now(), // Registrar el tiempo al hacer clic
        currentDragCoords: { x: p5.mouseX, y: p5.mouseY }, // Coordenadas iniciales
      }));
      updateFigureMetrics();

    } else if (mode === "move") {
      // Comprobar si se ha hecho clic en una figura para moverla
      for (let i = 0; i < shapes.length; i++) { // Iteramos sobre todo el array de figuras existentes para comprobar si el clic esta en alguna
        const { x, y, size } = shapes[i]; // Extraemos las propiedades de la figura q se esta analizando
        // Verificar si el clic está dentro de la figura
        if (p5.dist(p5.mouseX, p5.mouseY, x, y) < size / 2) { // dist calcula la distancia entre dos puntos del canvas y luego comprobamos si esta 
          // en el "radio" efectivo de la figura, para circulos es exacto para cuadrados y triangulos es el circulo circunscrito
          setSelectedFigure(i); // Marcar la figura como seleccionada
          setUserMetrics((prev) => ({
            ...prev,
            currentDragStart: Date.now(), // Registrar el tiempo al hacer clic
            currentDragCoords: { x: p5.mouseX, y: p5.mouseY }, // Coordenadas iniciales
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
  };

  const mouseReleased = (p5) => {
    if (mode === "move" && userMetrics.currentDragStart && userMetrics.currentDragCoords) {
      const dragDuration = Date.now() - userMetrics.currentDragStart;
      const dragEndCoords = { x: p5.mouseX, y: p5.mouseY };
      const dragDistance = Math.sqrt(
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

  const ColorPicker = ({ onColorChange, selectedColor }) => {

    const handleChange = (color) => {
      console.log("Color seleccionado:", color.hex);
      onColorChange(color.hex); // Actualiza el color seleccionado
    };

    return (
      <div>
        <h4>Selecciona el color y la saturación:</h4>
        <ChromePicker
          color={selectedColor} // Vincula el color actual
          onChange={handleChange}
        />
      </div>
    );
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


  return (
    <div className="dropdown-container">
      <h3>Selecciona la figura:</h3>
      <select value={selectedShape} onChange={(e) => setSelectedShape(e.target.value)}>
        <option value="triangle">Triángulo</option>
        <option value="circle">Círculo</option>
        <option value="square">Cuadrado</option>
      </select>

      <ColorPicker onColorChange={setSelectedColor} selectedColor={selectedColor} />

      <h3>Selecciona el tamaño:</h3>
      <input
        type="number"
        value={selectedSize}
        onChange={(e) => setSelectedSize(Number(e.target.value))}
        min="10"
      />

      <div>
        {/* Botones simples */}
        <button onClick={() => handleModeChange("create")}>Modo Crear</button>
        <button onClick={() => handleModeChange("move")}>Modo Mover</button>
        <button onClick={() => handleModeChange("delete")}>Modo Eliminar</button>
      </div>
      
      <div>
        <h3>Métricas del usuario</h3>
        <p>Figuras utilizadas: {JSON.stringify(userMetrics.figuresUsed)}</p>
        <p>Colores utilizados: {JSON.stringify(userMetrics.colorsUsed)}</p>
        <p>Tamaños utilizados: {JSON.stringify(userMetrics.sizesUsed)}</p>
        <p>Duraciones de arrastre: {JSON.stringify(userMetrics.dragTimes)}</p>
        <p>Distancias de arrastre: {JSON.stringify(userMetrics.dragDistances)}</p>
      </div>


      <div>
        <Sketch setup={setup} draw={draw} mousePressed={mousePressed} mouseDragged={mouseDragged} mouseReleased={mouseReleased} />
      </div>
    </div>
  );
};

export default Canvas2D;
