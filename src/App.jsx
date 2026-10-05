import { useState } from "react";
import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <section id="center">
        {/* <div className="beat bg-red-500">h</div>
         */}
        <div className="beat">
          <div className="beatCore">beat</div>
          <div className="beatStroke1"></div>
          <div className="beatStroke2"></div>
          <div className="beatStroke3"></div>
          <div className="beatStroke4"></div>
          <div className="beatStroke5"></div>
          <div className="beatStroke6"></div>
          <div className="beatStroke7"></div>
        </div>
        {/* 
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button> */}
      </section>
    </>
  );
}

export default App;
