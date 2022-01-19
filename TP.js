import * as THREE from './node_modules/three/src/three.js'

const scene = new THREE.Scene();

// Configuration cameras
let camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 1000 );
camera.position.set( 0, 10, 0 );

// Configuration du renderer
let renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );