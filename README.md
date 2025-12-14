# 3D Data Globe

A Three.js visualization tool that maps CSV data onto a 3D interactive globe. Users can upload custom datasets, filter by specific columns, and visualize values through a D3 color scale mapped to the spherical surface. The main purpose of this project is to demonstrate the integration of libraries and techniques, in this case D3 and Three.js, to explore 3D graphics and data visualization.

<img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/7206cd8a-bb8a-49b4-9669-6260f4717311" />

# Features

- **Dynamic CSV Loading**: Parse and visualize custom datasets in real-time without reloading the page using D3's CSV parsing.
- **Interactive 3D View**: Pan, zoom, and rotate the globe with interaction handling.
- **Data Tooltips**: Hover over countries to retrieve precise values via raycasting.

# How to Run:

## Prerequisites

You will need [Node.js](https://nodejs.org/) installed on your computer.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/NicoDiazAg/3d-data-globe
    cd 3d-data-globe
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the local server:
    ```bash
    npx vite
    ```
4.  Open the local URL provided in the terminal.

## Usage

1.  **Upload Data**: Click "Choose File" and select a CSV file (a sample `data.csv` is included).
2.  **Filter**: Type the column header you wish to visualize (e.g., "2025" or "Population") and click **Visualize**.
3.  **Interact**:
    - **Left Click + Drag**: Rotate Globe
    - **Scroll**: Zoom In/Out
    - **Hover**: View details for specific countries

# Credits & Attributions

This project was built using the following open-source libraries and resources:

## Core Tech Stack

- **[Three.js](https://threejs.org/)**: The primary WebGL engine used for scene management, camera, and rendering.
- **[D3.js](https://d3js.org/)**: Used for parsing CSV data, generating color scales (`d3-scale`), and handling spherical math (`d3-geo`).
- **[Vite](https://vitejs.dev/)**: Used for the development server and bundling.

## Algorithms & Techniques

- **GeoJSON Rendering**: Adapted from [ThreeGeoJSON](https://github.com/jdomingu/ThreeGeoJSON) by jdomingu.
- **Polygon Triangulation**: Implemented using **[d3-delaunay](https://github.com/d3/d3-delaunay)** (based on **[Delaunator](https://github.com/mapbox/delaunator)**) to cover complex country shapes into WebGL-ready meshes.
- **Edge Resampling (Densification)**: The technique to prevent lines from clipping through the sphere was inspired by approaches in **[three-geojson](https://github.com/gkjohnson/three-geojson)** by gkjohnson and **[three-geojson-geometry](https://github.com/vasturiano/three-geojson-geometry)** by vasturiano.
- **Interaction**: Raycaster logic adapted from **[Three.js Docs](https://threejs.org/docs/#Raycaster)**.

## Assets & Data

- **Country Data**: Natural Earth vectors provided by **[martynafford/natural-earth-geojson](https://github.com/martynafford/natural-earth-geojson)**.
- **Skybox Texture**: "Deep Space" background from **[FreeStylized](https://freestylized.com/skybox/sky_27/)**.

## Additional References

- Rotating Earth logic inspired by [Prisoner849 on CodePen](https://codepen.io/prisoner849/pen/oNopjyb).
- Main globe visualization modified from [3d-globe-with-threejs](https://github.com/bobbyroe/3d-globe-with-threejs).
