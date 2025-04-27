import React, { useState, useCallback, useEffect, useRef } from "react";
import { SliderPicker } from 'react-color';
import Sketch from "react-p5";
import HandPoseDetector from "./HandPoseDetector";
import "./Canvas.css";

const Canvas2D = () => {
  const [selectedShape, setSelectedShape] = useState("triangle");
  const [shapes, setShapes] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [selectedSize, setSelectedSize] = useState(40);
  const [mode, setMode] = useState("create");
  const [selectedFigure, setSelectedFigure] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  const [showSizeOptions, setShowSizeOptions] = useState(false);
  const [handPosition, setHandPosition] = useState(null);
  const [lastGestureTime, setLastGestureTime] = useState(0);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [videoElement, setVideoElement] = useState(null);
  const [handDetectionActive, setHandDetectionActive] = useState(false);
  // Cambia el estado para incluir el estado de carga del video
const [videoReady, setVideoReady] = useState(false);
const [useCameraBackground, setUseCameraBackground] = useState(false);
const camRef = useRef(null);
const handPoseDetectorRef = useRef();
const p5InstanceRef = useRef();



// Modifica la función que recibe el elemento de video
  const [userMetrics, setUserMetrics] = useState({
    figuresUsed: {},
    colorsUsed: {},
    sizesUsed: {},
    dragTimes: [],
    dragDistances: [],
    currentDragStart: null,
    currentDragCoords: null,
  });

  const setup = (p5, canvasParentRef) => {
    p5InstanceRef.current = p5;
    p5.createCanvas(640, 480).parent(canvasParentRef);
  };







const toggleCameraBackground = async () => {
  if (!useCameraBackground) {
    const stream = await handPoseDetectorRef.current.startDetection();
    if (stream && p5InstanceRef.current) {
      camRef.current = p5InstanceRef.current.createCapture(p5InstanceRef.current.VIDEO);
      camRef.current.elt.srcObject = stream;
      camRef.current.hide();
      setHandDetectionActive(true);
    }
  } else {

    if (camRef.current) {
      camRef.current.remove();
      camRef.current = null;
    }
    setHandDetectionActive(false);
  }
  setUseCameraBackground(!useCameraBackground);
};



const draw = (p5) => {
  if (useCameraBackground && camRef.current) {
    try {
      p5.push();
      p5.translate(p5.width, 0);
      p5.scale(-1, 1);
      p5.image(camRef.current, 0, 0, p5.width, p5.height);
      p5.pop();
    } catch (error) {
      console.error("Error dibujando cámara:", error);
      p5.background(200);
    }
  } else {
    p5.background(200);
  }
  const hands = handPoseDetectorRef.current?.getHands() || [];
  hands.forEach(hand => {
    if (!hand.keypoints) return;
    
    const color = hand.handedness === "Left" ? "#FF00FF" : "#800080";
    hand.keypoints.forEach(({ x, y }) => {
      p5.fill(color);
      p5.noStroke();
      p5.ellipse(x, y, 18, 18);
    });

    // Punto verde para el dedo índice (como referencia)
    const indexFinger = hand.keypoints[8];
    if (indexFinger) {
      p5.fill(0, 255, 0);
      p5.ellipse(indexFinger.x, indexFinger.y, 10, 10);
    }
  });
    shapes.forEach(({ type, x, y, color, size }, index) => {
      if (mode === "select" && selectedFigure === index) {
        p5.stroke(0, 0, 255); // Borde azul para selección
        p5.strokeWeight(2);
        p5.fill(color);
      } else {
        p5.noStroke();
        p5.fill(color);
      }

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
          drawPolygon(p5, x, y, 5, size / 2);
          break;
        case "hexagon":
          drawPolygon(p5, x, y, 6, size / 2);
          break;
        default:
          break;
      }
    });

    // Previsualización en modo crear
    if (mode === "create" && previewPosition) {
      p5.fill(selectedColor);
      p5.stroke(150);
      p5.strokeWeight(1);

      switch (selectedShape) {
        case "triangle":
          p5.triangle(
            previewPosition.x, previewPosition.y - selectedSize / 2,
            previewPosition.x - selectedSize / 2, previewPosition.y + selectedSize / 2,
            previewPosition.x + selectedSize / 2, previewPosition.y + selectedSize / 2
          );
          break;
        case "circle":
          p5.ellipse(previewPosition.x, previewPosition.y, selectedSize, selectedSize);
          break;
        case "square":
          p5.rect(
            previewPosition.x - selectedSize / 2,
            previewPosition.y - selectedSize / 2,
            selectedSize,
            selectedSize
          );
          break;
        case "pentagon":
          drawPolygon(p5, previewPosition.x, previewPosition.y, 5, selectedSize / 2);
          break;
        case "hexagon":
          drawPolygon(p5, previewPosition.x, previewPosition.y, 6, selectedSize / 2);
          break;
        default:
          break;
      }
    }

    // Punto verde para la mano
    if (handPosition) {
      p5.fill(0, 255, 0);
      p5.ellipse(handPosition.x, handPosition.y, 10, 10);
    }
  };


  const mousePressed = (p5) => {
    if (p5.mouseX < 0 || p5.mouseX > p5.width || p5.mouseY < 0 || p5.mouseY > p5.height) {
      return;
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
            setSelectedFigure(index);
            setUserMetrics((prev) => ({
              ...prev,
              currentDragStart: { x: p5.mouseX, y: p5.mouseY },
            }));
            break;
          }
        }
      });
    }
    

    if (mode === "create") {
      setShapes((prev) => [
        ...prev,
        { type: selectedShape, x: p5.mouseX, y: p5.mouseY, color: selectedColor, size: selectedSize },
      ]);
      setUserMetrics((prev) => ({
        ...prev,
        currentDragStart: Date.now(),
        currentDragCoords: { x: p5.mouseX, y: p5.mouseY },
      }));
      updateFigureMetrics();
    } else if (mode === "move") {
      for (let i = 0; i < shapes.length; i++) {
        const { x, y, size } = shapes[i];
        if (p5.dist(p5.mouseX, p5.mouseY, x, y) < size / 2) {
          setSelectedFigure(i);
          setUserMetrics((prev) => ({
            ...prev,
            currentDragStart: Date.now(),
            currentDragCoords: { x: p5.mouseX, y: p5.mouseY },
          }));
          break;
        }
      }
    } else if (mode === "delete") {
      for (let i = 0; i < shapes.length; i++) {
        const { x, y, size } = shapes[i];
        if (p5.dist(p5.mouseX, p5.mouseY, x, y) < size / 2) {
          setShapes((prevShapes) => prevShapes.filter((_, index) => index !== i));
          break;
        }
      }
    }
  };

  const mouseDragged = (p5) => {
    if (mode === "move" && selectedFigure !== null) {
      setShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        newShapes[selectedFigure] = {
          ...newShapes[selectedFigure],
          x: p5.mouseX,
          y: p5.mouseY,
        };
        return newShapes;
      });
    }
    if (selectedFigure !== null && mode === "select") {
      const scaleFactor = 0.7;
      setShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        const figure = newShapes[selectedFigure];

        const dx = p5.mouseX - userMetrics.currentDragStart.x;
        const dy = p5.mouseY - userMetrics.currentDragStart.y;

        const deltaSize = Math.max(dx, dy) * scaleFactor;
        const newSize = Math.max(2, figure.size + deltaSize);

        newShapes[selectedFigure] = { ...figure, size: newSize };
        return newShapes;
      });
    }
  };

  const mouseMoved = (p5) => {
    if (mode === "create") {
      setPreviewPosition({ x: p5.mouseX, y: p5.mouseY });
    }

    if (mode === "select") {
      let isOverCorner = false;

      shapes.forEach(({ type, x, y, size }) => {
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
            p5.cursor('nwse-resize');
            isOverCorner = true;
            break;
          }
        }
      });

      if (!isOverCorner) {
        p5.cursor('default');
      }
    }
  };

  const handleHandMove = useCallback((x, y) => {
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
  }, [selectedFigure]);

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
    if (mode === "move" && userMetrics.currentDragStart && userMetrics.currentDragCoords) {
      const dragDuration = Date.now() - userMetrics.currentDragStart;
      const dragEndCoords = { x: p5.mouseX, y: p5.mouseY };
      const dragDistance = Math.sqrt(
        Math.pow(dragEndCoords.x - userMetrics.currentDragCoords.x, 2) +
        Math.pow(dragEndCoords.y - userMetrics.currentDragCoords.y, 2)
      );

      setUserMetrics((prev) => ({
        ...prev,
        dragTimes: [...prev.dragTimes, dragDuration],
        dragDistances: [...prev.dragDistances, dragDistance],
        currentDragStart: null,
        currentDragCoords: null,
      }));
    }
  };


  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedFigure(null);
    setPreviewPosition(null);
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

  const drawPolygon = (p5, x, y, n, radius) => {
    p5.beginShape();
    for (let i = 0; i < n; i++) {
      p5.vertex(x + Math.cos(i * p5.TWO_PI / n) * radius, y + Math.sin(i * p5.TWO_PI / n) * radius);
    }
    p5.endShape(p5.CLOSE);
  };

  const handleGesture = (gestureType, position) => {
    const now = Date.now();
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
      <div className="controls-container">
        <button className={`big-button ${mode === "create" ? "selected-button2" : ""}`} onClick={() => handleModeChange("create")}>
          Crear
        </button>

        {mode === "create" && (
          <div className="options-panel">
            <button onClick={() => setShowShapeOptions(!showShapeOptions)}>
              Figura
            </button>
            {showShapeOptions && (
              <div className="dropdown-options">
                <button onClick={() => setSelectedShape("triangle")} className={selectedShape === "triangle" ? "selected-button" : ""}>
                  <svg width="40" height="40">
                    <polygon points="20,5 5,35 35,35" fill={selectedShape === "triangle" ? selectedColor : "gray"} />
                  </svg>
                  <span>Triángulo</span>
                </button>
                <button onClick={() => setSelectedShape("circle")} className={selectedShape === "circle" ? "selected-button" : ""}>
                  <svg width="40" height="40">
                    <circle cx="20" cy="20" r="15" fill={selectedShape === "circle" ? selectedColor : "gray"} />
                  </svg>
                  <span>Círculo</span>
                </button>
                <button onClick={() => setSelectedShape("square")} className={selectedShape === "square" ? "selected-button" : ""}>
                  <svg width="40" height="40">
                    <rect x="5" y="5" width="30" height="30" fill={selectedShape === "square" ? selectedColor : "gray"} />
                  </svg>
                  <span>Cuadrado</span>
                </button>
                <button onClick={() => setSelectedShape("pentagon")} className={selectedShape === "pentagon" ? "selected-button" : ""}>
                  <svg width="40" height="40">
                    <polygon points="20,5 5,15 10,35 30,35 35,15" fill={selectedShape === "pentagon" ? selectedColor : "gray"} />
                  </svg>
                  <span>Pentágono</span>
                </button>
                <button onClick={() => setSelectedShape("hexagon")} className={selectedShape === "hexagon" ? "selected-button" : ""}>
                  <svg width="40" height="40">
                    <polygon points="20,5 5,15 5,35 20,45 35,35 35,15" fill={selectedShape === "hexagon" ? selectedColor : "gray"} />
                  </svg>
                  <span>Hexágono</span>
                </button>
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


        <button 
        onClick={toggleCameraBackground}
        className={`big-button ${useCameraBackground ? "selected-button2" : ""}`}
      >
        {useCameraBackground ? "Fondo Gris" : "Fondo Cámara"}
      </button>
      


        
      </div>

      <HandPoseDetector
      ref={handPoseDetectorRef}
      onHandMove={handleHandMove}
      onHandClick={handleHandClick}
      onGesture={handleGesture}
    />

<div className="canvas-wrapper" style={{ position: 'relative', zIndex: 5 }}>
<Sketch
          setup={
          setup}
    draw={draw}
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