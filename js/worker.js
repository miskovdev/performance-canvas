/**
 * Script that renders 100k graphic elements all at once.
 * All renders and calculations made in workers and split into 10 layers.
 * @author Eduard Miskov
 * @see {@link https://miskovdev.pro/performance-canvas/}
 */
let canvasW = null;
let context = null;
let map = [];
let windowParams = null;
let elementsCount = 100000;
let canvasCount = 10;

// Element properties
const width = 16;
const height = 16;
const gap = 4;
const selectedLineWidth = 4;
const selectedBorderColor = "#115df2";

let elementCols = null;
let elementRows = null;
let leftover = null;

// Waiting to receive the OffScreenCanvas or Click Event
self.onmessage = function(e) {
    switch (e.data.type) {
        case "canvas":
            canvasW = e.data.canvas;
            context = canvasW.getContext("2d");
            windowParams = e.data.windowParams;

            // Calculating approximate number of elements for horizontal and vertical axis
            elementCols = Math.floor(windowParams.innerWidth / (width + gap));
            elementRows = Math.floor(elementsCount / canvasCount / elementCols);
            canvasW.height = elementRows * (height + gap);
            leftover = Math.ceil((windowParams.innerWidth % (width + gap)) / 2); // Helps to center grid on the canvas

            draw(); // Setting up canvas with required columns and rows values
        break;

        case "click":
            const targetX = e.data.event.pageX - e.data.event.canvasLeft - leftover + gap / 2,
                targetY = e.data.event.pageY - e.data.event.canvasTop + gap / 2; // Centering X Y to bind element from clicked area

            const sqCol = Math.floor(targetX / (width + gap));
            const sqRow = Math.floor(targetY / (height + gap)); // Identifying square from global store object

            map[`s${sqCol}:${sqRow}`].selected = true;
            drawSquare(map[`s${sqCol}:${sqRow}`]);

            sendSelectedSquareData(map[`s${sqCol}:${sqRow}`]);
        break;

        case "close":
            if(e.data.event !== null) {
                const closeCol = e.data.event.column;
                const closeRow = e.data.event.row;
                map[`s${closeCol}:${closeRow}`].selected = false;
                console.log(map[`s${closeCol}:${closeRow}`]);
                drawSquare(map[`s${closeCol}:${closeRow}`]);
            }
        break;
    }
};

function draw() {

    // let colorsBase = ['#eb2f27', '#18cb3c', '#e3e54b', '#5888b0']; // bright colors
    let colorsBase = ['#d8d8d8', '#eaeaea', '#c9c9c9', '#bfbfbf']; // shades of gray

    context.fillStyle = 'white';
    context.fillRect(0, 0, canvasW.width, canvasW.height);

    // Create base grid
    for(let i = 0; i < elementCols; i++) {
        for(let j = 0; j < elementRows; j++) {
            const color = colorsBase[Math.floor(Math.random() * 4)]; // Just to make grid less monotonous

            // Storing each square as an object allows for reference to it
            map[`s${i}:${j}`] = {
                rgb: hexToRGB(color),
                selected: false,
                column: i,
                row: j
            }

            drawSquare(map[`s${i}:${j}`]);
        }
    }

    randomSquares();
}

function randomSquares() {
    for(let i = 0; i < 200; i+=1) {
        const newI = Math.floor(Math.random() * elementCols);
        const newJ = Math.floor(Math.random() * elementRows);
        map[`s${newI}:${newJ}`].column = newI;
        map[`s${newI}:${newJ}`].row = newJ;

        map[`s${newI}:${newJ}`].rgb = randomColor();
        initAnimate(map[`s${newI}:${newJ}`]);
    }

    setTimeout(randomSquares, 1000);
}

function initAnimate(element) {
    let counter = 0;
    const steps = 10; // In this case, having more than 10 iterations causes stuttering and creates a large call stack

    // Using closures here to enable iterations with a finish condition,
    // since there is no way to directly pass data to requestAnimationFrame
    function animate() {

        drawSquare(element, {
            counter, steps
        });

        if(counter < steps)
            requestAnimationFrame(animate); // Limited fade-in animation for square color change
        counter++;
    }

    animate();
}

function drawSquare(element, alpha = {}) {
    let opacity = 1;
    let color = element.rgb;
    const x = getX(element.column);
    const y = getY(element.row);

    if(typeof alpha.counter === "number" && alpha.steps > 0) {
        opacity = alpha.counter / alpha.steps;
    }

    context.beginPath();
    context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${opacity})`;
    context.rect(x, y, width, height);
    context.fillRect(x, y, width, height);

    if(element.selected) {
        sendSelectedSquareData(element); // Update if selected and info showed

        context.lineWidth = selectedLineWidth;
        context.strokeStyle = selectedBorderColor;
        context.strokeRect(x + 2, y + 2, width - 4, height - 4);
    }

    context.closePath();
}

function sendSelectedSquareData(element) {
    element.totalRows = elementRows;
    postMessage({ element });
}

// Helpers
function randomColor() {
    return {
        red: Math.floor(Math.random() * 256),
        green: Math.floor(Math.random() * 256),
        blue: Math.floor(Math.random() * 256)
    }
}

function hexToRGB(h) {
    let red = parseInt(h.slice(1, 3), 16);
    let green = parseInt(h.slice(3, 5), 16);
    let blue = parseInt(h.slice(5, 7), 16);
    return { red, green, blue };
}

function getX(column) {
    return leftover + (width + gap) * column;
}

function getY(row) {
    return (height + gap) * row;
}
