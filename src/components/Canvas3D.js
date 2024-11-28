// src/components/Canvas3D.js
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei'; // Edges para mostrar los bordes pero por ahora no lo usare

const Canvas3D = () => {
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedShape, setSelectedShape] = useState('sphere');
  const [size, setSize] = useState(2); // Tamaño inicial predeterminado
  const [selectedTexture, setSelectedTexture] = useState('none');

  return (
    <div style={{ width: '700px', height: '700px' }}>
      <h3>Selecciona la figura:</h3>
      <select value={selectedShape} onChange={(e) => setSelectedShape(e.target.value)}>
        <option value="sphere">Esfera</option>
        <option value="cube">Cubo</option>
        <option value="cone">Cono</option>
        <option value="cylinder">Cilindro</option>
        <option value="torus">Toroide</option>
      </select>

      <h3>Selecciona el tamaño:</h3>
      <input
        type="number"
        value={size}
        onChange={(e) => setSize(Number(e.target.value))}
        min="0.1" // Valor mínimo permitido
        step="0.1" // Incrementos pequeños para mayor precisión
      />

      <h3>Selecciona el color:</h3>
      <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
        <option value="blue">Azul</option>
        <option value="red">Rojo</option>
        <option value="green">Verde</option>
        <option value="purple">Morado</option>
      </select>

      <h3>Selecciona la textura:</h3>
      <select value={selectedTexture} onChange={(e) => setSelectedTexture(e.target.value)}>
        <option value="none">Ninguna</option>
        <option value="wood">Madera</option>
        <option value="brick">Ladrillo</option>
        <option value="prueba">Prueba</option>
      </select>

      <Canvas gl={{ antialias: true }} camera={{ position: [0, 0, 5] }} style={{ background: "grey" }}>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}> {/* Rotación en dos ejes */}
          {/* Cargar texturas condicionalmente */}
          {selectedTexture !== 'none' && (
            <TextureContent selectedTexture={selectedTexture} />
          )}

          {/* Suelo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="gray" />
          </mesh>

          {/* Renderizar la geometría basada en selectedShape */} {/* Iba a hacerlo con switches pero JSX no lo soporta */}
          {selectedShape === 'sphere' && <sphereGeometry args={[size, 12, 32]} />}
          {selectedShape === 'cube' && <boxGeometry args={[size, size, size]} />}
          {selectedShape === 'cone' && <coneGeometry args={[size, size * 1.5, 32]} />}
          {selectedShape === 'cylinder' && <cylinderGeometry args={[size, size, size * 1.5, 32]} />}
          {selectedShape === 'torus' && <torusGeometry args={[size, size * 0.4, 16, 100]} />}

          {/* Aplicar el color seleccionado */}
          <meshStandardMaterial color={selectedColor} />
          <ambientLight intensity={1} />
          {/* Bordes */}
          {/*
        
          <Edges
            scale={1.05}  // Pa q los bordes no se superpongan
            threshold={15}  // Umbral de detección de bordes
            color="yellow"  // Color 
          />
          */}
          {/* Controles de cámara */}
          <OrbitControls />
        </mesh>
      </Canvas>
    </div>
  );
};

const TextureContent = ({ selectedTexture }) => {
  // Llamar useTexture dentro de un componente interno
  const brickTexture = useTexture('/assets/textures/Bricks097_1K-JPG_Color.jpg');
  const woodTexture = useTexture('/assets/textures/Wood048_1K-JPG_Color.jpg');
  const pruebaTexture = useTexture('/assets/textures/prueba.jfif')
  // Mapeo de las texturas
  const textureMap = {
    none: null,
    wood: woodTexture,
    brick: brickTexture,
    prueba: pruebaTexture
  };

  return <meshStandardMaterial map={textureMap[selectedTexture]} />;
};

export default Canvas3D;


