import React from "react";
import wbp from "./img/webpack.jpg";
import PictureComponent from "../plugins/PictureComponent";

// const webpackImage = <HTMLInputElement>document.getElementById("webpackimg");
// webpackImage.src = wbp;

export default function App() {
  return (
    <>
      <h1>Hello, React 18 with TypeScript!</h1>
      {/* <img id="webpackimg" src={wbp} alt="Webpack Image" /> */}
      <PictureComponent
        id="webpackimg"
        src={wbp}
        alt="Webpack Image"
        className="wpClass-img"
      />
    </>
  );
}
