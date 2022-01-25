import * as THREE from 'three';

import {OrbitControls} from "/node_modules/three/examples/jsm/controls/OrbitControls.js"
import {Sky} from "/node_modules/three/examples/jsm/objects/Sky.js";
import {GUI} from "/node_modules/three/examples/jsm/libs/lil-gui.module.min.js   ";
import {FBXLoader} from "/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import {MTLLoader} from "/node_modules/three/examples/jsm/loaders/MTLLoader.js";
import {OBJLoader} from "/node_modules/three/examples/jsm/loaders/OBJLoader.js";
import {Clock, Object3D, Vector3} from "three";

let sun, clock, renderer, camera, cameraControls
let cameraTarget = new THREE.Vector3()
const keyStates = {};
document.addEventListener('keydown', (event) => {

    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {

    keyStates[event.code] = false;

});
const playerDirection = new THREE.Vector3();
const playerVelocity = new THREE.Vector3(0, 0, 0);
let animationActions = []
let character
let mixer, tPose, forwardWalk, backwardWalk, leftWalk, rightWalk
let switche = 0
let deltaTime

let scene = new THREE.Scene()
clock = new THREE.Clock()

function init() {


// Configuration du renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

// Configuration cameras
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(10, 10, 10);


    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();
    window.addEventListener('resize', onWindowResize);


// model
    const loader = new FBXLoader();
    loader.load('/animation/Character1.fbx', function (object) {

        const anim = new FBXLoader();
        anim.load('/animation/Character@Walking.fbx', (anim) => {

            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"

            mixer = new THREE.AnimationMixer(object);

            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.

            const actions = mixer.clipAction(anim.animations[0]);
            animationActions.push(actions)

        })
        let scale = 0.03
        object.scale.set(scale, scale, scale);
        character = object
        scene.add(object);

    });

    /*const mtlLoader = new MTLLoader()
    mtlLoader.load("./Animation/final.mtl", function (materials) {
        materials.preload();
        const axesHelper = new THREE.AxesHelper(20);
        scene.add(axesHelper);

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load("/Animation/final.obj", function (object) {
            object.position.x = 0
            object.position.y = -18
            object.position.z = 0
            let scale = 2
            object.scale.set(scale, scale, scale)
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // scenesMeshes.push(m)
            scene.add(object)
        })
    });*/
// Add Sky
    let sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    sun = new THREE.Vector3();

    let raycaster = new THREE.Raycaster();

/// GUI

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    function guiChanged() {

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
    }

    const gui = new GUI();

    gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
    gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
    gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
    gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged);
    gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged);
    gui.add(effectController, 'azimuth', -180, 180, 0.1).onChange(guiChanged);
    gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);

    guiChanged();

    let ambiant = new THREE.AmbientLight('white')
    scene.add(ambiant)


    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const geometry2 = new THREE.PlaneGeometry(10, 10);
    const material2 = new THREE.MeshBasicMaterial({color: 'red', side: THREE.DoubleSide});
    const plane = new THREE.Mesh(geometry2, material2);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
}

init()



camera.position.z = 5;

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}


document.addEventListener("keydown", onDocumentKeyDown, false);
document.addEventListener("keyup", onDocumentKeyUp, false);

function onDocumentKeyDown(event) {
    let keyCode = event.which;
    if (keyCode === 0x0D) {
        console.log(character);
    }
    if (keyCode === 90) {
        animationActions[0].play()
    }

}
function onDocumentKeyUp(event) {
    let keyCode = event.which;
    if (keyCode === 0x0D) {
        console.log(character);
    }
    if (keyCode === 90) {
        animationActions[0].stop()

    }

}


function getForwardVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;

}

function controls(deltaTime) {
    const speedDelta = 1
    playerVelocity.set(0,0,0)
    // gives a bit of air control

    if (keyStates['KeyW']) {

        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
        console.log(playerVelocity)

    }

    if (keyStates['KeyS']) {

        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));

    }

    if (keyStates['KeyA']) {

        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));

    }

    if (keyStates['KeyD']) {

        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

    }


}

function updatePlayer(deltaTime) {


    playerVelocity.add(playerVelocity);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime*5);

    character.position.add(deltaPosition);
    camera.position.add(deltaPosition)
    cameraTarget.x = character.position.x
    cameraTarget.y = character.position.y + 1
    cameraTarget.z = character.position.z
    cameraControls.target = cameraTarget
    character.lookAt(new THREE.Vector3(0,0,0))

}

function animate() {
    deltaTime = clock.getDelta()
    if (character) {
        controls()
        updatePlayer(deltaTime)
    }
    requestAnimationFrame(animate)
    renderer.render(scene, camera)

    // raycaster.setFromCamera(new THREE.Vector2(), camera);

    //calculate objects intersecting the picking ray

    mixer.update(deltaTime)
    // console.log(intersects[0]);
}

animate()

