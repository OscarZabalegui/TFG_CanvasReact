// src/App.js
import React from "react";
import Canvas2D from "./components/Canvas2D";
import Canvas3D from "./components/Canvas3D";

const App = () => {
  return (
    <>
      <div>
        <h2>Canvas 2D</h2>
        <Canvas2D />
      </div>
      <div>
        <h2>Canvas 3D</h2>
        <Canvas3D />
      </div>
    </>
  );
};

export default App;
