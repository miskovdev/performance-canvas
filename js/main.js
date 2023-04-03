/**
 * Script that renders 100k graphic elements all at once.
 * All renders and calculations made in workers and split into 10 layers.
 *
 * 1. Render 100k objects +
 * 2. The color of the graphical objects is changeable +
 * 3. A "color update event" will change the color property of a random graphical object to a new random value +
 * 4. Each graphical object is mouse-clickable / selectable which opens a small popup showing the current color +
 * 5. Pure HTML5 / JavaScript frontend application +
 * 6. No frameworks +
 * 7. Canvas +
 * 8. Should be runnable in modern browsers like Chrome, Edge +
 * 9. Typical office-like computer must be sufficient for running the application +
 *    > Tested on laptop with intel core i3-6100u and 8GB RAM. After loading I got smooth 60fps experience.
 *
 * @author Eduard Miskov
 * @see {@link https://miskovdev.pro/performance-canvas/}
 */
let canvasList = document.querySelectorAll("canvas");

canvasList.forEach((canvas, idx) => {
    let cWorker = canvas.transferControlToOffscreen();
    let lastSelected = null;

    cWorker.width = document.body.clientWidth;
    cWorker.height = window.innerHeight;

    let worker = new Worker("js/worker.js");
    worker.postMessage({
        type: "canvas",
        canvas: cWorker,
        windowParams: {
            innerWidth: document.body.clientWidth,
            index: idx,
        }
    }, [cWorker]);

    // Let worker know that we are trying to click on element
    canvas.addEventListener("click", function(e) {
        let canvasLeft = canvas.offsetLeft + canvas.clientLeft,
            canvasTop = canvas.offsetTop + canvas.clientTop;

        worker.postMessage({
            type: "click",
            event: {
                pageX: e.pageX,
                pageY: e.pageY,
                canvasLeft,
                canvasTop,
                index: idx,
            }
        });
    }, false);

    // Retrieve data about selected element
    worker.onmessage = function(e) {
        showInfoBox(e.data.element, idx);
        lastSelected = e.data.element;
    };

    // Close info box and tell worker it is closed
    canvas.addEventListener("click", (e) => {
        infoBox.classList.remove("visible");
        worker.postMessage({
            type: "close",
            event: lastSelected
        });
    });
});

let infoBox = document.querySelector(".info");

function showInfoBox(element, idx) {
    const colorSelected = RGBToHex(
        element.rgb.red,
        element.rgb.green,
        element.rgb.blue
    );

    const column = infoBox.querySelector("[data-field='column']");
    column.innerText = "Column: " + element.column;

    const row = infoBox.querySelector("[data-field='row']");
    row.innerText = "Row: " + (element.row + element.totalRows * idx);

    const color = infoBox.querySelector("[data-field='color']");
    color.innerText = "Color: " + colorSelected;

    const colorBox = infoBox.querySelector(".info-color");
    colorBox.style.backgroundColor = colorSelected;

    infoBox.classList.add("visible");
}

// Helper
function RGBToHex(r,g,b) {
    return "#" + [r,g,b].map(c => {
        let hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}
