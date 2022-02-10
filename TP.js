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
let lave, lave2, spotLight, ambient, endingLight1, endingLight2, endingLight3

// Personnage, animation et déplacements
let character, characterLoaded
let zombie, zombieSpawned, zombieKilled
let zombieAnimations = []
let mixer, activeAnimation
let mixerZombie
let chest
let chestOpended = false
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
// Le player collider remplacera notre personnages dans le calculs des positions
const playerCollider = new Capsule(new THREE.Vector3(0, 0.001, 0), new THREE.Vector3(0, 1, 0), 1);
let worldMap

// Gestion de la progression du chargement des imports
manager.onStart = function (url, itemsLoaded, itemsTotal) {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};

// Lors du chargement de tous les imports, on supprime la barre de progression du chargement
manager.onLoad = function () {
    console.log('Loading complete!');
    characterLoaded = true
    const myProgress = document.getElementById("myProgress");
    myProgress.remove()
    progressText.remove()
};
const elem = document.getElementById("myBar");
const progressText = document.getElementById("progressText");

// Au fur et ç mesure du chargement, on montre la progression dans le HTML barre de chargement.
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    elem.style.width = (itemsLoaded / itemsTotal * 100) + '%';
    progressText.innerHTML = 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.'
    
};

// On log les éventuelles erreurs
manager.onError = function (url) {
    console.log('There was an error loading ' + url);
};


/**
 * Fonction d'initialisation de la plupart des fonctions de l'application.
 */
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
    camera.rotation.order = 'YXZ'; // Sert à donner l'odre dans lequel les axes de la caméra doivent changer, pour la vue FPS
    
    window.addEventListener('resize', onWindowResize);
    
    
    /*
     * Camera locker sur le navigateur
     * Le pointerLock sert à verrouiller le curseur dans le navigateur (souris ne bouge pas)
     */
    const controles = new PointerLockControls(camera, document.body);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    
    // Si on fait click sur la fnêtre, le curseur se lock
    instructions.addEventListener('click', function () {
        controles.lock();
    });
    
    // Lorsque le curseur est lock, les instructions disparaissent
    controles.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    
    // Lorse que le curseur est délock, les instructions réapparaissent comme un menu pause.
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
    scene.add(ambient)
    
    // Lumière associée à la lave latérale
    lave = new THREE.PointLight(0x821b0a, 0.7, 8)
    lave.position.set(-13, 2, -26)
    lave.castShadow = true;
    scene.add(lave)
    
    // Lumière associée à la lave du fond
    lave2 = new THREE.PointLight(0x821b0a, 0.7, 8)
    lave2.position.set(-4, 2, -50)
    lave2.castShadow = true;
    scene.add(lave2)
    
    /// GUI
    
    const gui = new GUI();
    
    let time = 18
    const parametre = {
        time: time
    }
    
    // Fonction qui change la position de la lumière et sa couleur en fonction du temps
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
    
    // Créons un audio listener pour l'ajouter à la caméra.
    const listener = new THREE.AudioListener();
    camera.add(listener);
    
    // On créée des audios positionnés par rapport à la caméra (listener). Cela permet d'orienter le son en fonction de sa distance et position
    const sound = new THREE.PositionalAudio(listener);
    const sound2 = new THREE.PositionalAudio(listener);
    
    // On charge un son que l'on ajoute à la fonction audion positionné
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
        cube.visible = false
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
        cube2.visible = false
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
            // Les animations sont associées à un mixer, lui-même associé à un modèle (ici character, notre personnage)
            
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
                            
                        })
                    })
                })
            })
        })
        
        // Donne la taille de l'objet ( à trois centième)
        let scale = 0.03
        object.scale.set(scale, scale, scale);
        
        // Pour chaque sous objet qui compose l'objet, on va s'assurer qu'il peut intéragir avec les ombres (recevoir) et en produire
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })
        character = object
        character.animations[0] = animationActions[4]
        scene.add(object);
    });
    
    // On importe le coffre
    const loader3 = new FBXLoader(manager);
    loader3.load('/animation/Chest.fbx', function (object) {
        const anim = new FBXLoader(manager);
        
        anim.load('/animation/Chest_Ouverture.fbx', (anim) => {
            
            // AnimationMixer permet de jouer de jouer des animations pour un objet ciblé, ici "pers"
            
            mixerChest = new THREE.AnimationMixer(object);
            
            // ClipAction est un ensemble d'attributs et de sous fonctions utile à l'animation 3D de l'objet, puis qu'on range dans un tableau.
            
            ouverture = mixerChest.clipAction(anim.animations[0]);
            ouverture.clampWhenFinished = true
            ouverture.timeScale = 0.2
            ouverture.loop = THREE.LoopOnce
            
        })
        
        let scale = 0.02
        object.scale.set(scale, scale, scale);
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })
        scene.add(object);
        chest = object
        chest.position.set(-5, 2, -45)
        
        // Lors de la fin du projet, on va positionner 3 PointsLights (comme des lucioles) autour du coffre
        endingLight1 = new THREE.PointLight(0x00FF00, 0.7, 8)
        endingLight1.position.copy(chest.position)
        endingLight1.position.x -= 4
        
        endingLight2 = new THREE.PointLight(0x00FF00, 0.7, 8)
        endingLight2.position.copy(chest.position)
        endingLight2.position.x += 4
        
        endingLight3 = new THREE.PointLight(0x0000FF, 0.7, 8)
        endingLight3.position.copy(chest.position)
        endingLight3.position.y += 2
        
        // On s'assure que les lumières ne soient visibles qu'à la fin du projet.
        endingLight1.visible = endingLight2.visible = endingLight3.visible = false
        scene.add(endingLight2, endingLight1, endingLight3)
        
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
            // Les deux prochaines lignes permettent
            death.loop = THREE.LoopOnce // Permet de jouer l'animation qu'une seule fois
            death.clampWhenFinished = true // Permet de freeze le personnage sur la dernière image de l'animation (éviter la T-Pose à la fin de l'animation)
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
        zombie.position.set(-5, 0, -35)
        zombie.visible = false
        
        zombieDeathSound = new THREE.PositionalAudio(listener);
        
        // On charge un son qui sera le rale d'agonie du zombie (donc on l'ajoute au zombie pour la position.
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

/**
 * Permet de rezdimensionner l'image de rendu à chaque modification de la résolution / ratio d'aspect de la fenêtre
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/*** Controles du mouvement du personnage, de la caméra ***/

// Bind des comportements aux touches concernées
document.addEventListener("keydown", onDocumentKeyDown, false);

document.addEventListener("keyup", onDocumentKeyUp, false);

/**
 * Gère les comportements associées aux touches.
 *
 * Dans event.code ou event.which, on récupère la touche appuyé.
 * A l'aide de if, on joue certaines animations en fonction de et on joue aussi les fonctions de vecteurs mouvement.
 * @param event
 */
function onDocumentKeyDown(event) {
    
    // Sert pour la fonction controls qui gère les vercteurs, on range les touches appuyés dans un array référencé dans controls
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
        console.log(character.position)
    }
    if (keyCode === 80) {
        FPSview = !FPSview
        character.visible = !character.visible
        console.log("FPS view : turned to " + FPSview)
    }
    if (keyCode === 107) {
        ouverture.play()
        console.log(ouverture)
        endThisShit()
    }
}

/**
 * Gère les comportements associées aux touches.
 *
 * Dans event.code ou event.which, on récupère la touche lachée.
 * A l'aide de if, on stop les animations pour les touches lachées.
 * @param event
 */
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
 * Vérfie si le personnage est en train de bouger à l'aide du tableau keyStates (qui donne les touches appuyées.
 * Si oui, on arrete l'animation "idle (ne fait rien sur place)"
 * Si non, on lance / continue l'animation "idle".
 *
 * On échappe le cas des rotation sur le côté avec les touches A E
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
    
    camera.getWorldDirection(playerDirection);  // donne là où regarde la caméra
    playerDirection.y = 0;                      // on enlève tout mouvement en y qui nous intéresse pas (c''est le travail de la gravité
    playerDirection.normalize();                // On normalise le vecteur (le rendre vecteur unitaire, distance de 1)
    
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
    playerDirection.cross(camera.up);           // On prend le vecteur et renvoie sa perpendiculaire pour avancer sur les côtés
    
    return playerDirection;
    
}

/**
 * @returns {THREE.Vector3} Le vecteur pour augmenter l'élévation du perso
 */
function getUpVector() {
    
    return new THREE.Vector3(0, 5, 0)   // Un vecteur qui ne pointe qu'en hauteur pour sauter
    
}

/**
 * @returns {THREE.Vector3} Le vecteur pour baisser l'élévation du perso (seulement en debug)
 */
function getDownVector() {
    
    return new THREE.Vector3(0, -5, 0)
    
}


/**
 * Fonction qui utilises le tableau keyStates où sont rangées toutes les touches appuyées,
 * pour savoir quels mouvements le personnages doit effectuer.
 */
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

/**
 * Fonction Octree qui va verifier si le playerCollider (capsule simulant le personnage) touche un élément du monde Octree
 */
function playerCollisions() {
    
    // On effectue la vérification des collisions
    const result = worldOctree.capsuleIntersect(playerCollider);
    
    // On range dans le playerCollider la position du personnage
    if (result) {
        playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
    
}

/**
 * Fonction qui gère le déplacement du personnage en fonction de la gravité et des collisions.
 * @param deltaTime
 */
function updatePlayer(deltaTime) {
    
    playerVelocity.add(playerVelocity);
    
    // Gravité : On retire un valeur à la position y du personnage (relativisée par le deltaTime)
    if (gravityOn === true) {
        playerVelocity.y -= GRAVITY * deltaTime
    }
    
    // On range dans deltaPosition tous les vecteurs de mouvements additionés dans la fonction controls()
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime * 5);
    
    // Respwan si on tombe en el vido
    if (character.position.y < -30) {
        deltaPosition.y = Math.abs(character.position.y) + 10
    }
    
    /*On ajoute dans playerCollider (notre capsule représentant la position du personnage)
     tous les mouvements du personnages avec le traitement de la gravité*/
    playerCollider.translate(deltaPosition);
    
    /*On joue les collisions avec la positions post mouvement de notre personnage pour savoir si il doit être retenu par un mur
     Player position range dans playerCollider la position finale du personnage en fonction des collisions.
     On range dans la position du personnage cette position finale.
     */
    playerCollisions();
    character.position.copy(playerCollider.end);
    
    // Si la caméra est en vue FPS, c'est la caméra qui prend les positions du personnage
    if (FPSview) {
        camera.position.copy(playerCollider.end)
    }
    
}

/**
 * On calcule la position de la caméra par rapport au personnage.
 * La caméra est lockée sur le personnage
 * On calcule la position de où la caméra doit regarder, qui est un peu à droite du personnage pour une caméra plus TPS
 */
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

/**
 * Quand on a finis avec tout ça (ouf enfin j'en peux plus)
 * On désactive la lumière du soleil pour un effet, on fait apparaitre les spotlight du coffre et on l'ouvre.
 *
 * ET ON SE CASSE MAINTENANT C'EST FINI BYE.
 */
function endThisShit() {
    spotLight.visible = false
    endingLight1.visible = true
    endingLight2.visible = true
    endingLight3.visible = true
    scene.remove(ambient)
    spotLight.color.setHex(0xffffff)
    scene.background = new THREE.Color(0x0e1625)
    ambient = new THREE.AmbientLight(0x0e1625, 0.6)
    scene.add(ambient);
    ouverture.play()
}

function animate() {
    deltaTime = clock.getDelta()
    
    // On n'effectue la plupart des calculs que si tous les modèles ont été chargés
    if (characterLoaded) {
        controls()
        updatePlayer(deltaTime)
        if (!FPSview) {
            TPSCamera()
        } else {
            camera.position.y += 3
        }
        
        character.position.y -= 2   // repositionne le personnage pour éviter le clipping dans le sol après le calcul des collisions
        shouldIdle()                // Est-ce que le personnage doit jouer son animation Idle
        
        // Condition pour fairz apparaitre le zombie (on ne l'a joue que si il n'est jamais apparu
        if (!zombieSpawned) {
            isZombie()
        }
        
        // On joue la fin du jeu seulement si le zombie a été tué et si le personnage est assez proche.
        if ((character.position.distanceTo(chest.position) < 6) && zombieKilled === true && chestOpended === false) {
            chestOpended = true
            endThisShit()
        }
    }
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
    
    // Les mixers update permettent de mettre à jour les animations.
    mixer.update(deltaTime)
    mixerZombie.update(deltaTime)
    mixerChest.update(deltaTime)
}


init()

animate()
