import React, { useEffect, useRef } from 'react'
import KenBurnsCanvas2D from "kenburns/lib/Canvas2D"
import rectCrop from "rect-crop"
import bezierEasing from "bezier-easing"


const KenBurnsImg = (props) => {
  console.log(props)
  const {imgSrc} = props
  const useImg = <img src={imgSrc}/>
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    console.log(canvas);  //LOGS "null"
      const context = canvas.getContext("2d"); //HENCE THIS PRODUCES ERROR "can't read getContext() of null"
    var kenBurns = new KenBurnsCanvas2D(context)
    kenBurns.animate(
      useImg,
      rectCrop(0.4, [0.15, 0.38]),
      rectCrop.largest,
      5000,
      bezierEasing(0.6, 0.0, 1.0, 1.0)
    )
  })

  console.log(useImg)
  // return image
  return (
    <canvas 
      id = "myCanvas" 
      ref = {canvasRef}
      sx={{
        width: 400,
        height: 400
      }}>
      {imgSrc ? (<>{useImg}</>) : <div/>}              
    </canvas>
  )
}
export default KenBurnsImg
// https://github.com/gre/kenburns/blob/master/example/index.js
//
// https://gist.github.com/CodeMyUI/e51f7bdc278f2a64bebeb024b0537420
// https://codepen.io/shramee/pen/GjoMEg Kenburns background
// https://codepen.io/planetgrafix/pen/AGmXQK Ken Burns Slideshow with CSS
//
// Check this: https://revealjs.com/react/