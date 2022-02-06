import * as THREE from 'three';
import {Sky} from "/node_modules/three/examples/jsm/objects/Sky.js";
import {GUI} from "/node_modules/three/examples/jsm/libs/lil-gui.module.min.js   ";
import {FBXLoader} from "/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import {MTLLoader} from "/node_modules/three/examples/jsm/loaders/MTLLoader.js";
import {OBJLoader} from "/node_modules/three/examples/jsm/loaders/OBJLoader.js";
import {Octree} from "/node_modules/three/examples/jsm/math/Octree.js";
import {Capsule} from "/node_modules/three/examples/jsm/math/Capsule.js";
import Stats from "/node_modules/three/examples/jsm/libs/stats.module.js";

// Logique de rendering
let clock, renderer, deltaTime
let scene = new THREE.Scene()
clock = new THREE.Clock()
const manager = new THREE.LoadingManager();

// Personnage, animation et déplacements
let character, characterLoaded
let mixer, activeAnimation
const keyStates = {};
let animationActions = []
const playerDirection = new THREE.Vector3();
const playerVelocity = new THREE.Vector3(0, 0, 0);
const GRAVITY = 300
let gravityOn = true
let rotationY = 0.15

// Caméra
let camera, distanteCam
let FPSview = false


// Framework collision
const worldOctree = new Octree();
const playerCollider = new Capsule(new THREE.Vector3(0, 0.001, 0), new THREE.Vector3(0, 1, 0), 1);
let worldMap, sun, sky

// Gestion de la progression du chargement des imports
manager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};
manager.onLoad = function () {
    console.log('Loading complete!');
    characterLoaded = true
};
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};
manager.onError = function (url) {
    console.log('There was an error loading ' + url);
};


function init() {
    
    
    // Configuration du renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    
    // Configuration cameras
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(300, 10, 5);
    camera.rotation.order = 'YXZ';
    
    window.addEventListener('resize', onWindowResize);
    
    (function () {
        const script = document.createElement('script');
        script.onload = function () {
            const stats = new Stats();
            document.body.appendChild(stats.dom);
            requestAnimationFrame(function loop() {
                stats.update();
                requestAnimationFrame(loop)
            });
        };
        
        script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
        document.head.appendChild(script);
    })()
    
    /* Le ciel et le gui*/
    // Add Sky
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    sun = new THREE.Vector3();
    
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
        renderer.render(scene, camera);
        
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
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    
    /*CHargement des modèles complexes importés et des animations*/
    // model
    const loader = new FBXLoader(manager);
    loader.load('/animation/Character1.fbx', function (object) {
        
        const anim = new FBXLoader();
        anim.load('/animation/Character@Walking.fbx', (anim) => {
            
            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"
            
            mixer = new THREE.AnimationMixer(object);
            
            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.
            
            const forwardWalk = mixer.clipAction(anim.animations[0]);
            animationActions.push(forwardWalk)
            
        })
        const anim2 = new FBXLoader();
        anim2.load('/animation/Character@LeftStrafeWalk.fbx', (anim) => {
            
            let actions = mixer.clipAction(anim.animations[0]);
            animationActions.push(actions)
            
        })
        const anim3 = new FBXLoader();
        anim3.load('/animation/Character@WalkStrafeRight.fbx', (anim) => {
            
            let actions = mixer.clipAction(anim.animations[0]);
            animationActions.push(actions)
            
        })
        const anim4 = new FBXLoader();
        anim4.load('/animation/Character@WalkingBackwards.fbx', (anim) => {
            
            let actions = mixer.clipAction(anim.animations[0]);
            animationActions.push(actions)
            
        })
        let scale = 0.03
        object.scale.set(scale, scale, scale);
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })
        character = object
        // distanteCam = Caméra qui suit le personnage
        
        distanteCam = new THREE.Object3D;
        character.add(distanteCam)
        scene.add(object);
        character.position.rotateY(90)
        
    });
    
    const mtlLoader = new MTLLoader(manager)
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
            worldMap = object
            worldOctree.fromGraphNode(object);
        })
    });
    
    
    /*Lumières et ombres*/
    
    // Lumière ambiante, donne ton et couleur générale
    let ambiant = new THREE.AmbientLight('white', 0.1)
    
    // Lumière dirigée qui donne des ombres
    let spotLight = new THREE.SpotLight(0xe6a06d, 1);
    spotLight.position.set(50, 60, -20);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    spotLight.intensity = 1;
    
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 512; // Résolution des ombres
    spotLight.shadow.mapSize.height = 512; // Résolution des ombres
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.focus = 1;
    scene.add(spotLight);
    let lightHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(lightHelper);
    scene.add(ambiant)
    
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/*** Controles du mouvement du personnage, de la caméra ***/

// Bind des comportements aux touches concernées
document.addEventListener("keydown", onDocumentKeyDown, false);

document.addEventListener("keyup", onDocumentKeyUp, false);

function onDocumentKeyDown(event) {
    keyStates[event.code] = true;
    let keyCode = event.which;
    let keyWhich = event.code
    if (keyCode === 0x0D) {
    }
    if (keyCode === 90) {
        animationActions[0].play()
        activeAnimation = 0
    }
    if (keyCode === 68) {
        animationActions[2].play()
        activeAnimation = 2
    }
    if (keyCode === 81) {
        animationActions[1].play()
        activeAnimation = 1
    }
    if (keyCode === 83) {
        animationActions[3].play()
        activeAnimation = 3
    }
    if (keyCode === 65) {
        character.rotateY(rotationY)
        console.log("bah coucou")
    }
    if (keyCode === 69) {
        character.rotateY(-rotationY)
    }
    if (keyCode === 32) {
        console.log(character.position)
        console.log("La gravité est " + gravityOn ? "actrivée" : "désactivée")
    }
    if (keyCode === 71) {
        gravityOn = !gravityOn
    }
    if (keyWhich === "ShiftRight") {
        console.log(character.position)
        character.visible = !character.visible
    }
    if (keyCode === 80) {
        FPSview = !FPSview
        character.visible = !character.visible
        console.log("FPS view : turned to " + FPSview)
    }
}

function onDocumentKeyUp(event) {
    keyStates[event.code] = false;
    let keyCode = event.which;
    if (keyCode === 0x0D) {
    }
    if (keyCode === 90) {
        animationActions[0].stop()
    }
    if (keyCode === 68) {
        animationActions[2].stop()
    }
    if (keyCode === 81) {
        animationActions[1].stop()
    }
    if (keyCode === 83) {
        animationActions[3].stop()
    }
}

// Addition des vecteurs de mouvements pour la direction
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

function getUpVector() {
    
    return new THREE.Vector3(0, 5, 0)
    
}

function getDownVector() {
    
    return new THREE.Vector3(0, -5, 0)
    
}

function controls() {
    const speedDelta = 1
    playerVelocity.set(0, 0, 0)
    
    // gives a bit of air control
    
    if (keyStates['KeyW']) {
        
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
        
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
    if (keyStates['Space']) {
        
        playerVelocity.add(getUpVector().multiplyScalar(speedDelta));
        
    }
    if (keyStates['ShiftLeft']) {
        
        playerVelocity.add(getDownVector().multiplyScalar(speedDelta));
        
    }
    
    
}


/*** Système de collision ***/

function playerCollisions() {
    
    const result = worldOctree.capsuleIntersect(playerCollider);
    if (result) {
        playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
    
}

function updatePlayer(deltaTime) {
    
    // const result = world.capsuleIntersect(character);
    playerVelocity.add(playerVelocity);
    
    // Gravité
    if (gravityOn === true) {
        playerVelocity.y -= GRAVITY * deltaTime
    }
    
    // Respwan si on tombe en el vido
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime * 5);
    if (character.position.y < -30) {
        deltaPosition.y = Math.abs(character.position.y) + 10
    }
    playerCollider.translate(deltaPosition);
    
    playerCollisions();
    // character.position.add(deltaPosition);
    character.position.copy(playerCollider.end);
    if (FPSview) {
        camera.position.copy(playerCollider.end)
    }
    
}

function TPSCamera() {
    
    const idealOffset = new THREE.Vector3(-2, 4, -5);
    idealOffset.applyQuaternion(character.quaternion);
    idealOffset.add(character.position);
    camera.position.copy(idealOffset);
    
    const idealLookat = new THREE.Vector3(-2, 3, 0);
    idealLookat.applyQuaternion(character.quaternion);
    idealLookat.add(character.position);
    camera.lookAt(idealLookat)
}


/* Gestion de la vue FPS  */
document.addEventListener('mousedown', () => {
    document.body.requestPointerLock();
    console.log(document.pointerLockElement)
});
document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
    }
});


function animate() {
    deltaTime = clock.getDelta()
    
    if (character && characterLoaded && worldMap) {
        controls()
        updatePlayer(deltaTime)
        if (!FPSview) {
            TPSCamera()
        } else {
            camera.position.y += 3
        }
        
        // controling.update();
        character.position.y -= 2
        console.log(character.position.y)
    }
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
    
    
    mixer.update(deltaTime)
}


init()

animate()
