import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { drawThreeGeo } from "./src/threeGeoJSON.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// Skybox
const textureURLs = [
  "./assets/px.png",
  "./assets/nx.png",
  "./assets/py.png",
  "./assets/ny.png",
  "./assets/pz.png",
  "./assets/nz.png",
];

const texture = new THREE.CubeTextureLoader().load(textureURLs);
scene.background = texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed *= 0.15;

// Globe radius slightly smaller than country surfaces to prevent overlapping
const geometry = new THREE.SphereGeometry(1.95, 32, 16);
const lineMat = new THREE.LineBasicMaterial({
  color: "#ff9000",
  transparent: true,
  opacity: 0.2,
});
const edges = new THREE.EdgesGeometry(geometry, 1);
const line = new THREE.LineSegments(edges, lineMat);
scene.add(line);

const oceanMaterial = new THREE.MeshBasicMaterial({
  color: "black",
  transparent: true,
  opacity: 0.5,
  depthWrite: true,
});
const ocean = new THREE.Mesh(geometry, oceanMaterial);
ocean.renderOrder = 1;
scene.add(ocean);

let worldGeoJSON = null;

// Load GeoJSON once with data.csv as a sample
Promise.all([
  fetch("./geojson/countries.json").then((res) => res.json()),
  fetch("./data.csv").then((res) => res.text()),
]).then(([geoJsonData, csvText]) => {
  worldGeoJSON = geoJsonData;

  // Parse default data.csv assumming Country,Value format
  const data = d3.csvParseRows(csvText);
  const dataMap = {};
  const values = [];

  data.forEach((row) => {
    if (row.length >= 2) {
      const val = parseFloat(row[1]);
      if (!isNaN(val)) {
        dataMap[row[0]] = val;
        values.push(val);
      }
    }
  });

  updateGlobe(dataMap, values);
});

// Update function for handling newly uploaded csv files
function updateGlobe(dataMap, values) {
  const oldGroup = scene.getObjectByName("earthGroup");
  if (oldGroup) {
    scene.remove(oldGroup);
  }

  const colorScale = d3.scaleQuantile().domain(values).range(d3.schemeOrRd[9]);

  const countries = drawThreeGeo({
    json: worldGeoJSON,
    radius: 2,
    data: dataMap,
    colorScale: colorScale,
  });

  countries.name = "earthGroup";
  scene.add(countries);
}

// User interaction logic
const visualizeBtn = document.getElementById("visualize-btn");
const fileInput = document.getElementById("csv-file");
const keywordInput = document.getElementById("keyword-input");
const fileLabel = document.getElementById("file-label");

visualizeBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  const keyword = keywordInput.value.trim();

  if (!file) {
    alert("Please select a CSV file first.");
    return;
  }

  if (!keyword) {
    alert("Please enter a column keyword (e.g., 2025).");
    return;
  }
  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;

    // D3 CSV parsing, convert string into array of objects
    const data = d3.csvParse(text);
    const dataMap = {};
    const values = [];

    // Find country key, assuming first column is country name
    if (data.length == 0) return;
    const countryKey = data.columns[0];
    data.forEach((row) => {
      const countryName = row[countryKey];

      // Look for value associated with user's keyword
      const rawValue = row[keyword];
      if (rawValue !== undefined) {
        const val = parseFloat(rawValue.replace(/,/g, "")); // Remove commas
        if (!isNaN(val)) {
          dataMap[countryName] = val;
          values.push(val);
        }
      }
    });
    if (values.length === 0) {
      alert(
        `No data found for keyword: "${keyword}". Check your spelling of CSV headers.`
      );
      return;
    }
    // Update UI and globe
    fileLabel.innerText = `Now Visualizing: ${file.name} (${keyword})`;
    updateGlobe(dataMap, values);
  };
  reader.readAsText(file);
});

// Mouse & animation
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const tooltip = document.createElement("div");
tooltip.style.position = "absolute";
tooltip.style.backgroundColor = "white";
tooltip.style.padding = "5px";
tooltip.style.borderRadius = "5px";
tooltip.style.display = "none";
document.body.appendChild(tooltip);

function onMouseMove(event) {
  mouse.x = (event.clientX / w) * 2 - 1;
  mouse.y = -(event.clientY / h) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  raycaster.params.Line.threshold = 0.1;

  const earthGroup = scene.getObjectByName("earthGroup");

  if (earthGroup) {
    const objectsToCheck = [ocean, ...earthGroup.children];
    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object;

      if (hit.userData.country) {
        const data = hit.userData;

        tooltip.style.display = "block";
        tooltip.style.left = event.clientX + 10 + "px";
        tooltip.style.top = event.clientY + 10 + "px";
        tooltip.innerHTML = `<b>${hit.userData.country}</b><br/>Value: ${
          hit.userData.value
            ? Math.round(hit.userData.value).toLocaleString()
            : "N/A"
        }`;
      } else {
        tooltip.style.display = "none";
      }
    } else {
      tooltip.style.display = "none";
    }
  }
}

window.addEventListener("mousemove", onMouseMove);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}

animate();
