import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";

export function drawThreeGeo({
  json,
  radius,
  materialOptions,
  data,
  colorScale,
}) {
  const container = new THREE.Object3D();
  container.userData.update = (t) => {
    for (let i = 0; i < container.children.length; i++) {
      container.children[i].userData.update?.(t);
    }
  };

  // Align GeoJSON with Three.js space
  container.rotation.x = -Math.PI * 0.5;

  const x_values = [];
  const y_values = [];
  const z_values = [];
  const json_features = createFeatureArray(json);

  let coordinate_array = [];

  // Main loop to process every feature in GeoJSON
  for (let geom_num = 0; geom_num < json_features.length; geom_num++) {
    const feature = json_features[geom_num];
    const geometry = feature.geometry;
    const properties = feature.properties || {};

    const countryName = properties.name || "Unknown";
    const value = data[countryName] || 0;

    // Color logic
    let hexColor;
    if (value > 0) {
      hexColor = colorScale(value);
    } else {
      hexColor = "#bfbfbfff"; // Fallback gray
    }
    const color = new THREE.Color(hexColor);
    const countryOptions = {
      ...materialOptions,
      color: color,
      value: value,
      name: countryName,
    };

    // Geometry type handling
    if (geometry.type == "Point") {
      convertToSphereCoords(geometry.coordinates, radius);
      drawParticle(x_values[0], y_values[0], z_values[0], countryOptions);
    } else if (geometry.type == "MultiPoint") {
      for (
        let point_num = 0;
        point_num < geometry.coordinates.length;
        point_num++
      ) {
        convertToSphereCoords(geometry.coordinates[point_num], radius);
        drawParticle(x_values[0], y_values[0], z_values[0], countryOptions);
      }
    } else if (geometry.type == "LineString") {
      coordinate_array = createCoordinateArray(geometry.coordinates);
      for (
        let point_num = 0;
        point_num < coordinate_array.length;
        point_num++
      ) {
        convertToSphereCoords(coordinate_array[point_num], radius);
      }
      drawLine(x_values, y_values, z_values, countryOptions);
    } else if (geometry.type == "Polygon") {
      // First draw outline (LineString)
      for (
        let segment_num = 0;
        segment_num < geometry.coordinates.length;
        segment_num++
      ) {
        coordinate_array = createCoordinateArray(
          geometry.coordinates[segment_num]
        );
        for (
          let point_num = 0;
          point_num < coordinate_array.length;
          point_num++
        ) {
          convertToSphereCoords(coordinate_array[point_num], radius);
        }
        drawLine(x_values, y_values, z_values, countryOptions);
      }
      // Next, fill the mesh (Delaunay)
      drawMesh(geometry.coordinates, radius, countryOptions);
    } else if (geometry.type == "MultiLineString") {
      for (
        let segment_num = 0;
        segment_num < geometry.coordinates.length;
        segment_num++
      ) {
        coordinate_array = createCoordinateArray(
          geometry.coordinates[segment_num]
        );
        for (
          let point_num = 0;
          point_num < coordinate_array.length;
          point_num++
        ) {
          convertToSphereCoords(coordinate_array[point_num], radius);
        }
        drawLine(x_values, y_values, z_values, countryOptions);
      }
    } else if (geometry.type == "MultiPolygon") {
      for (
        let polygon_num = 0;
        polygon_num < geometry.coordinates.length;
        polygon_num++
      ) {
        for (
          let segment_num = 0;
          segment_num < geometry.coordinates[polygon_num].length;
          segment_num++
        ) {
          coordinate_array = createCoordinateArray(
            geometry.coordinates[polygon_num][segment_num]
          );
          for (
            let point_num = 0;
            point_num < coordinate_array.length;
            point_num++
          ) {
            convertToSphereCoords(coordinate_array[point_num], radius);
          }
          drawLine(x_values, y_values, z_values, countryOptions);
        }
        // Fill mesh (Delaunay)
        drawMesh(geometry.coordinates[polygon_num], radius, countryOptions);
      }
    }
  }

  // Helper function to parse feature types
  function createFeatureArray(json) {
    let feature_array = [];
    if (json.type == "Feature") {
      feature_array.push(json);
    } else if (json.type == "FeatureCollection") {
      for (
        let feature_num = 0;
        feature_num < json.features.length;
        feature_num++
      ) {
        feature_array.push(json.features[feature_num]);
      }
    } else if (json.type == "GeometryCollection") {
      for (let geom_num = 0; geom_num < json.geometries.length; geom_num++) {
        feature_array.push({
          geometry: json.geometries[geom_num],
          properties: {},
        });
      }
    }
    return feature_array;
  }

  // Helper function to interpolate lines for smoothness
  function createCoordinateArray(feature) {
    const temp_array = [];
    let interpolation_array = [];
    for (let point_num = 0; point_num < feature.length; point_num++) {
      const point1 = feature[point_num];
      const point2 = feature[point_num - 1];
      if (point_num > 0) {
        if (needsInterpolation(point2, point1)) {
          interpolation_array = [point2, point1];
          interpolation_array = interpolatePoints(interpolation_array);
          for (
            let inter_point_num = 0;
            inter_point_num < interpolation_array.length;
            inter_point_num++
          ) {
            temp_array.push(interpolation_array[inter_point_num]);
          }
        } else {
          temp_array.push(point1);
        }
      } else {
        temp_array.push(point1);
      }
    }
    return temp_array;
  }

  function needsInterpolation(point2, point1) {
    const lon1 = point1[0];
    const lat1 = point1[1];
    const lon2 = point2[0];
    const lat2 = point2[1];
    const lon_distance = Math.abs(lon1 - lon2);
    const lat_distance = Math.abs(lat1 - lat2);
    return lon_distance > 5 || lat_distance > 5;
  }

  function interpolatePoints(interpolation_array) {
    let temp_array = [];
    let point1, point2;
    for (
      let point_num = 0;
      point_num < interpolation_array.length - 1;
      point_num++
    ) {
      point1 = interpolation_array[point_num];
      point2 = interpolation_array[point_num + 1];
      if (needsInterpolation(point2, point1)) {
        temp_array.push(point1);
        temp_array.push(getMidpoint(point1, point2));
      } else {
        temp_array.push(point1);
      }
    }
    temp_array.push(interpolation_array[interpolation_array.length - 1]);
    if (temp_array.length > interpolation_array.length) {
      temp_array = interpolatePoints(temp_array);
    }
    return temp_array;
  }

  function getMidpoint(point1, point2) {
    return [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
  }

  // Function to project points/lines onto the sphere
  function convertToSphereCoords(coordinates_array, sphere_radius) {
    const lon = coordinates_array[0];
    const lat = coordinates_array[1];
    x_values.push(
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((lon * Math.PI) / 180) *
        sphere_radius
    );
    y_values.push(
      Math.cos((lat * Math.PI) / 180) *
        Math.sin((lon * Math.PI) / 180) *
        sphere_radius
    );
    z_values.push(Math.sin((lat * Math.PI) / 180) * sphere_radius);
  }

  function drawParticle(x, y, z, options) {
    let geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([x, y, z], 3)
    );
    const particle_material = new THREE.PointsMaterial({
      color: options.color,
      size: 0.05,
    });
    const particle = new THREE.Points(geo, particle_material);
    particle.userData = {
      country: options.name,
      value: options.value,
    };
    container.add(particle);
    clearArrays();
  }

  function drawLine(x_values, y_values, z_values, options) {
    const lineGeo = new LineGeometry();
    const verts = [];
    for (let i = 0; i < x_values.length; i++) {
      verts.push(x_values[i], y_values[i], z_values[i]);
    }
    lineGeo.setPositions(verts);
    const lineMaterial = new LineMaterial({
      color: options.color,
      linewidth: 2,
      fog: true,
      depthWrite: false,
    });
    const line = new Line2(lineGeo, lineMaterial);
    line.renderOrder = 1;
    line.frustumCulled = false;
    line.computeLineDistances();
    line.userData = {
      country: options.name,
      value: options.value,
    };

    container.add(line);
    clearArrays();
  }

  // Mesh generation for country coloring, using Delaunay triangulations
  function drawMesh(polygonCoordinates, radius, options) {
    const outerRing = polygonCoordinates[0];
    const holes = polygonCoordinates.slice(1);

    const points2D = [];

    // Density for creating triangles, highly detailed for borders and not so detailed for interior to keep performance
    const borderStep = 0.25; // Higher detail
    const gridStep = 2.0; // Lower detail

    // Helper to densify polygon edges using D3's spherical interpolation
    function densifyPoly(ring) {
      for (let i = 0; i < ring.length - 1; i++) {
        const p1 = ring[i];
        const p2 = ring[i + 1];
        points2D.push(p1);

        // Calculate the distance on the sphere in radians using D3
        const distRad = (window.d3 || d3).geoDistance(p1, p2);

        // Convert to degrees for comparison with borderStep
        const distDeg = distRad * (180 / Math.PI);

        if (distDeg > borderStep) {
          // D3 interpolator that handles curvature automatically
          const interpolator = (window.d3 || d3).geoInterpolate(p1, p2);
          const numSegments = Math.ceil(distDeg / borderStep);
          for (let j = 1; j < numSegments; j++) {
            const t = j / numSegments;
            points2D.push(interpolator(t));
          }
        }
      }
    }

    // Add border points (highly detailed)
    densifyPoly(outerRing);
    holes.forEach(densifyPoly);

    // Add internal grid point (less detailed)

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    outerRing.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y > minY) minY = y;
      if (y > maxY) maxY = y;
    });
    for (let x = Math.ceil(minX); x <= maxX; x += gridStep) {
      for (let y = Math.ceil(minY); y <= maxY; y += gridStep) {
        const pt = [x, y];
        if (isInside(pt, outerRing, holes)) {
          points2D.push(pt);
        }
      }
    }

    // Triangulate using D3
    const delaunay = (window.d3 || d3).Delaunay.from(points2D);
    const triangles = delaunay.triangles;
    const numTriangles = triangles.length / 3;

    const vertices = [];

    // Filter triangles (Centroid Check)
    for (let i = 0; i < numTriangles; i++) {
      const t0 = triangles[i * 3];
      const t1 = triangles[i * 3 + 1];
      const t2 = triangles[i * 3 + 2];

      const p0 = points2D[t0];
      const p1 = points2D[t1];
      const p2 = points2D[t2];

      const cx = (p0[0] + p1[0] + p2[0]) / 3;
      const cy = (p0[1] + p1[1] + p2[1]) / 3;
      const centroid = [cx, cy];

      // Check if centroid is outside, and if so discard
      if (isInside(centroid, outerRing, holes)) {
        pushVertex(p0, radius, vertices);
        pushVertex(p1, radius, vertices);
        pushVertex(p2, radius, vertices);
      }
    }

    // Build Three.js geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: options.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 0;
    mesh.userData = { country: options.name, value: options.value };
    container.add(mesh);
  }

  // Helper to correctly project mesh vertices to globe sphere

  function pushVertex(point, radius, array) {
    const lon = point[0];
    const lat = point[1];

    // Degrees to radians
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    // Projection that matches convertToSphereCoords's
    const x = Math.cos(latRad) * Math.cos(lonRad) * radius;
    const y = Math.cos(latRad) * Math.sin(lonRad) * radius;
    const z = Math.sin(latRad) * radius;

    array.push(x, y, z);
  }

  function isInside(point, outer, holes) {
    // Strictly must be in outer ring, and not in any hole
    if (!d3.polygonContains(outer, point)) return false;
    for (let i = 0; i < holes.length; i++) {
      if (d3.polygonContains(holes[i], point)) return false;
    }
    return true;
  }

  function clearArrays() {
    x_values.length = 0;
    y_values.length = 0;
    z_values.length = 0;
  }
  return container;
}
