import * as THREE from 'three';
import {GUI} from "/node_modules/three/examples/jsm/libs/lil-gui.module.min.js   ";
import {FBXLoader} from "/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import {MTLLoader} from "/node_modules/three/examples/jsm/loaders/MTLLoader.js";
import {OBJLoader} from "/node_modules/three/examples/jsm/loaders/OBJLoader.js";
import {Octree} from "/node_modules/three/examples/jsm/math/Octree.js";
import {Capsule} from "/node_modules/three/examples/jsm/math/Capsule.js";
import Stats from "/node_modules/three/examples/jsm/libs/stats.module.js";
import {PointerLockControls} from "/node_modules/three/examples/jsm/controls/PointerLockControls.js";

// Logique de rendering
let clock, renderer, deltaTime
let scene = new THREE.Scene()
scene.background = new THREE.Color(0xe6a06d)
clock = new THREE.Clock()
const manager = new THREE.LoadingManager();

// Lumière
let lightHelper, shadowCameraHelper, lave, lave2, spotLight, ambient

// Personnage, animation et déplacements
let character, characterLoaded
let zombie, zombieSpawned, zombieKilled
let zombieAnimations = []
let mixer, activeAnimation
let mixerZombie
let chest
let mixerChest
let ouverture
const keyStates = {};
let animationActions = []
const playerDirection = new THREE.Vector3();
const playerVelocity = new THREE.Vector3(0, 0, 0);
const GRAVITY = 300
let gravityOn = false
let rotationY = 0.15

// Audio
let lavaFlat, zombieDeathSound, ominousMusic

// Caméra
let camera
let FPSview = false


// Framework collision
const worldOctree = new Octree();
const playerCollider = new Capsule(new THREE.Vector3(0, 0.001, 0), new THREE.Vector3(0, 1, 0), 1);
let worldMap

// Gestion de la progression du chargement des imports
manager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};
manager.onLoad = function () {
    console.log('Loading complete!');
    characterLoaded = true
    const myProgress = document.getElementById("myProgress");
    myProgress.remove()
    progressText.remove()
};
const elem = document.getElementById("myBar");
const progressText = document.getElementById("progressText");
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    elem.style.width = (itemsLoaded / itemsTotal * 100) + '%';
    progressText.innerHTML = 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.'
    
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
    
    
    /*
     Camera locker sur le navigateur
     */
    const controles = new PointerLockControls(camera, document.body);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    
    instructions.addEventListener('click', function () {
        controles.lock();
    });
    
    controles.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    
    controles.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });
    
    scene.add(controles.getObject());
    
    
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
    
    /*Lumières et ombres*/
    
    // Lumière ambiante, donne ton et couleur générale
    ambient = new THREE.AmbientLight('white', 0.1)
    
    // Lumière dirigée qui donne des ombres
    spotLight = new THREE.SpotLight(0xe6a06d, 1);
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
    lightHelper = new THREE.SpotLightHelper(spotLight);
    scene.add(lightHelper);
    shadowCameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
    scene.add(shadowCameraHelper);
    scene.add(ambient)
    
    lave = new THREE.PointLight(0x821b0a, 0.7, 8)
    lave.position.set(-13, 2, -26)
    lave.castShadow = true;
    scene.add(lave)
    
    lave2 = new THREE.PointLight(0x821b0a, 0.7, 8)
    lave2.position.set(-4, 2, -50)
    lave2.castShadow = true;
    scene.add(lave2)
    
    /// GUI
    
    const gui = new GUI();
    const spotlightFolder = gui.addFolder('spotlight')
    
    const params = {
        'light color': spotLight.color.getHex(),
        intensity: spotLight.intensity,
        distance: spotLight.distance,
        angle: spotLight.angle,
        penumbra: spotLight.penumbra,
        decay: spotLight.decay,
        focus: spotLight.shadow.focus
    };
    
    spotlightFolder.addColor(params, 'light color').onChange(function (val) {
        
        spotLight.color.setHex(val);
        
    });
    
    spotlightFolder.add(params, 'intensity', 0, 2).onChange(function (val) {
        
        spotLight.intensity = val;
        
    });
    
    
    spotlightFolder.add(params, 'distance', 50, 200).onChange(function (val) {
        
        spotLight.distance = val;
        
    });
    
    spotlightFolder.add(params, 'angle', 0, Math.PI / 3).onChange(function (val) {
        
        spotLight.angle = val;
        
    });
    
    spotlightFolder.add(params, 'penumbra', 0, 1).onChange(function (val) {
        
        spotLight.penumbra = val;
        
    });
    
    spotlightFolder.add(params, 'decay', 1, 2).onChange(function (val) {
        
        spotLight.decay = val;
        
    });
    
    spotlightFolder.add(params, 'focus', 0, 1).onChange(function (val) {
        
        spotLight.shadow.focus = val;
        
    });
    
    let time = 18
    const parametre = {
        time: time
    }
    gui.add(parametre, 'time', 0, 24).onChange(function (val) {
        spotLight.position.x = -100 + (8.333333 * val)
        spotLight.position.y = 60
        spotLight.position.z = 40 + (-3.33333 * val)
        if (val <= 6) {
            scene.remove(ambient)
            spotLight.color.setHex(0xffffff)
            scene.background = new THREE.Color(0x0e1625)
            ambient = new THREE.AmbientLight(0x0e1625, 0.1)
            scene.add(ambient);
        }
        if (val >= 6 && val <= 10) {
            scene.remove(ambient)
            spotLight.color.setHex(0xb55b43)
            scene.background = new THREE.Color(0xe6c56d)
            ambient = new THREE.AmbientLight(0xe6c56d, 0.1)
            scene.add(ambient);
        }
        if (val >= 11 && val <= 14) {
            scene.remove(ambient)
            spotLight.color.setHex(0xf5ed97)
            scene.background = new THREE.Color(0x80c1fe)
            ambient = new THREE.AmbientLight(0x80c1fe, 0.1)
            scene.add(ambient);
        }
        if (val >= 15 && val <= 18) {
            scene.remove(ambient)
            spotLight.color.setHex(0xe6a06d)
            scene.background = new THREE.Color(0xe6a06d)
            ambient = new THREE.AmbientLight(0xe6a06d, 0.1)
            scene.add(ambient);
        }
        if (val >= 19 && val <= 24) {
            scene.remove(ambient)
            spotLight.color.setHex(0xcccccc)
            scene.background = new THREE.Color(0x0e1625)
            ambient = new THREE.AmbientLight(0x0e1625, 0.1)
            scene.add(ambient);
        }
    })
    
    // create an AudioListener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);
    
    // create the PositionalAudio object (passing in the listener)
    const sound = new THREE.PositionalAudio(listener);
    const sound2 = new THREE.PositionalAudio(listener);
    
    // load a sound and set it as the PositionalAudio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('audio/minecraft-lava-ambience-sound.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setRefDistance(20);
        sound.setRolloffFactor(1);
        sound.setDistanceModel("linear");
        sound.setVolume(0.3);
        sound.play();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(-12, 0, -24)
        cube.add(sound)
        scene.add(cube);
    });
    audioLoader.load('audio/minecraft-waterambience-sound.mp3', function (buffer) {
        sound2.setBuffer(buffer);
        sound2.setRefDistance(20);
        sound2.setDistanceModel("linear");
        sound2.setVolume(0.7);
        sound2.play();
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        const cube2 = new THREE.Mesh(geometry, material);
        cube2.position.set(3, 0, -35)
        cube2.add(sound2)
        scene.add(cube2);
    });
    
    lavaFlat = sound
    
    
    /*CHargement des modèles complexes importés et des animations*/
    // Perso principal
    const loader = new FBXLoader(manager);
    loader.load('/animation/Character1.fbx', function (object) {
        
        const anim = new FBXLoader(manager);
        anim.load('/animation/Character@Walking.fbx', (anim) => {
            
            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"
            
            mixer = new THREE.AnimationMixer(object);
            
            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.
            
            const forwardWalk = mixer.clipAction(anim.animations[0]);
            animationActions.push(forwardWalk)
            
            const anim2 = new FBXLoader(manager);
            anim2.load('/animation/Character@LeftStrafeWalk.fbx', (anim) => {
                
                let actions = mixer.clipAction(anim.animations[0]);
                animationActions.push(actions)
                const anim3 = new FBXLoader(manager);
                anim3.load('/animation/Character@WalkStrafeRight.fbx', (anim) => {
                    
                    let actions = mixer.clipAction(anim.animations[0]);
                    animationActions.push(actions)
                    const anim4 = new FBXLoader(manager);
                    anim4.load('/animation/Character@WalkingBackwards.fbx', (anim) => {
                        
                        let actions = mixer.clipAction(anim.animations[0]);
                        animationActions.push(actions)
                        const anim5 = new FBXLoader(manager);
                        anim5.load('/animation/Character@idle.fbx', (anim) => {
                            
                            let actions = mixer.clipAction(anim.animations[0]);
                            animationActions.push(actions)
                            console.log(animationActions)
                            
                        })
                    })
                })
            })
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
        character.animations[0] = animationActions[4]
        // character.rotateY(-3)
        scene.add(object);
    });
    
    const loader3 = new FBXLoader(manager);
    loader3.load('/animation/Chest.fbx', function (object) {
        const anim = new FBXLoader(manager);
        
        anim.load('/animation/Chest_Ouverture.fbx', (anim) => {
            
            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"
            
            mixerChest = new THREE.AnimationMixer(object);
            
            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.
            
            ouverture = mixerChest.clipAction(anim.animations[0]);
            ouverture.clampWhenFinished = true
            
        })
        
        let scale = 0.02
        object.scale.set(scale, scale, scale);
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })
        // character.rotateY(-3)
        scene.add(object);
        chest = object
        chest.position.set(-5, 2, -45)
    });
    
    
    const loader2 = new FBXLoader(manager);
    loader2.load('/animation/zombie.fbx', function (object) {
        
        const anim = new FBXLoader(manager);
        anim.load('/animation/zombie@idle.fbx', (anim) => {
            
            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"
            
            mixerZombie = new THREE.AnimationMixer(object);
            
            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.
            
            const idle = mixerZombie.clipAction(anim.animations[0]);
            idle.play()
            zombieAnimations.push(idle)
            
        })
        const anim2 = new FBXLoader(manager);
        anim2.load('/animation/zombie@death.fbx', (anim) => {
            
            let death = mixerZombie.clipAction(anim.animations[0]);
            death.loop = THREE.LoopOnce
            death.clampWhenFinished = true
            zombieAnimations.push(death)
            
        })
        let scale = 0.03
        object.scale.set(scale, scale, scale);
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })
        zombie = object
        
        scene.add(object);
        // zombie.rotateY(90)
        zombie.position.set(-5, 0, -35)
        zombie.visible = false
        
        zombieDeathSound = new THREE.PositionalAudio(listener);
        
        // load a sound and set it as the PositionalAudio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('audio/codZombieYa.mp3', function (buffer) {
            zombieDeathSound.setBuffer(buffer);
            zombieDeathSound.setRefDistance(20);
            zombieDeathSound.setVolume(0.3);
            zombie.add(zombieDeathSound)
        });
        
        ominousMusic = new THREE.PositionalAudio(listener);
        
        const audioLoader2 = new THREE.AudioLoader();
        audioLoader2.load('audio/naruto-nervous.mp3', function (buffer) {
            ominousMusic.setBuffer(buffer);
            ominousMusic.setRefDistance(20);
            ominousMusic.setDistanceModel("linear");
            ominousMusic.setVolume(0.2);
            zombie.add(ominousMusic)
        });
        
    });
    
    const mtlLoader = new MTLLoader(manager)
    mtlLoader.load("./Animation/final.mtl", function (materials) {
        materials.preload();
        
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
        console.log("le volume est à " + lavaFlat.getDistanceModel())
        console.log("c'est a  " + lavaFlat.getRolloffFactor())
    }
    if (keyWhich === "ControlRight") {
        zombieAnimations[0].stop()
        zombieAnimations[0].play()
        console.log("wesh")
        console.log(zombieAnimations[1])
        console.log(keyStates)
    }
    if (keyCode === 80) {
        FPSview = !FPSview
        character.visible = !character.visible
        console.log("FPS view : turned to " + FPSview)
    }
    if (keyCode === 107) {
        ouverture.play()
        console.log(ouverture)
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

/**
 * Vérfie si le personnage est en train de bouger. Si oui, on arrete l'animation "sur place"
 * Si non, on lance / continue l'animation "sur place".
 * On échappe le cas des rotation sur le côté
 */
function shouldIdle() {
    let isactive = false
    
    for (let keyState of Object.keys(keyStates)) {
        
        if (keyStates[keyState] === true) {
            if (keyState === "KeyQ" || keyState === "KeyE") {
                return
            }
            isactive = true
        }
        
    }
    if (isactive === true) {
        animationActions[4].stop()
    } else {
        animationActions[4].play()
    }
}

/*** Addition des vecteurs de mouvements pour la direction ***/

/**
 * Prend la direction de la caméra pour rendre un vecteur unitaire dans sa direction
 * @returns {THREE.Vector3} Le vecteur unitaire de la direction de la caméra (utilsiéer pour aller en avant ou en arrière)
 */
function getForwardVector() {
    
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    
    return playerDirection;
    
}

/**
 * Prend la direction de la caméra pour rendre un vecteur unitaire normal dans sa direction
 * @returns {THREE.Vector3} Le vecteur unitaire normal de la direction de la caméra (utilsiéer pour aller à droite ou à gauche)
 */
function getSideVector() {
    
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);
    
    return playerDirection;
    
}

/**
 * @returns {THREE.Vector3} Le vecteur pour augmenter l'élévation du perso
 */
function getUpVector() {
    
    return new THREE.Vector3(0, 5, 0)
    
}

/**
 * @returns {THREE.Vector3} Le vecteur pour baisser l'élévation du perso
 */
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
document.addEventListener('mouseup', () => {
    document.body.requestPointerLock();
});
document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
    }
});

document.addEventListener('mousedown', (event) => {
    /*
     * Ce code ne joue que si le bouton gauche de la souris est pressé, si le zombie a bien spawn
     * et si le zombie n'a pas encore été tué.
     */
    if (event.button === 0 && zombieSpawned && !zombieKilled) {
        console.log("pian")
        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(), camera)
        const objects = raycaster.intersectObjects(zombie.children);
        if (objects.length > 0) {
            zombieAnimations[1].play()
            zombieAnimations[0].crossFadeTo(zombieAnimations[1])
            zombieDeathSound.play()
            zombieKill()
        }
    }
    
    
})

/**
 * Gère quand le zombie doit apparaître.
 * Il apparait en fonctiond la distance entre lui et le personnage.
 */
function isZombie() {
    if (character.position.distanceTo(zombie.position) < 13) {
        spawnZombie()
    }
}

/**
 * Gère l'apparation du zombie.
 * Provoque son apparition, joue la musique creepy et change les lumière pour une ambiance oppressante.
 */
function spawnZombie() {
    zombieSpawned = true
    zombie.visible = true
    ominousMusic.play()
    scene.remove(ambient)
    spotLight.position.copy(zombie.position)
    spotLight.position.y = 6
    spotLight.position.z -= 10
    spotLight.lookAt(zombie.position)
    scene.background = new THREE.Color(0x0e1625)
    ambient = new THREE.AmbientLight(0x0e1625, 0.1)
    scene.add(ambient);
}

/**
 * Gère le meurte du zombie.
 * Provoque sa disparation, l'arrêt de la musique creepy et le retour des lumière au normal.
 **/
function zombieKill() {
    zombieKilled = true
    ominousMusic.stop()
    scene.remove(ambient)
    spotLight.color.setHex(0xe6a06d)
    scene.background = new THREE.Color(0xe6a06d)
    ambient = new THREE.AmbientLight(0xe6a06d, 0.1)
    scene.add(ambient);
    spotLight.position.x = -100 + (8.333333 * 16)
    spotLight.position.y = 60
    spotLight.position.z = 40 + (-3.33333 * 16)
}

function endThisShit(){

}

function animate() {
    deltaTime = clock.getDelta()
    
    if (characterLoaded) {
        controls()
        updatePlayer(deltaTime)
        if (!FPSview) {
            TPSCamera()
        } else {
            camera.position.y += 3
        }
        
        // controling.update();
        character.position.y -= 2
        shouldIdle()
        if (!zombieSpawned) {
            isZombie()
        }
    }
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
    lightHelper.update()
    shadowCameraHelper.update()
    
    
    mixer.update(deltaTime)
    mixerZombie.update(deltaTime)
    mixerChest.update(deltaTime)
}


init()

animate()
