import {
  ElementRef,
  Injectable,
  model,
  NgZone,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GridHelper, TextureLoader } from 'three';
import { CSG } from 'three-csg-ts';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private gridHelper: GridHelper;
  private cube: THREE.Mesh;
  private floor: THREE.Mesh;

  private frameId: number = null;
  private textureLoader: TextureLoader = new TextureLoader();

  constructor(private ngZone: NgZone) {}

  ngOnDestroy(): void {
    this.cleanUp();
  }

  private loadGLBModel(
    url: string,
    position: THREE.Vector3,
    scale: number = 1,
    rotation: { x?: number; y?: number; z?: number } = {}
  ): void {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.position.copy(position);
        model.scale.set(scale, scale, scale);
        if (rotation.x !== undefined) model.rotation.x = rotation.x;
        if (rotation.y !== undefined) model.rotation.y = rotation.y;
        if (rotation.z !== undefined) model.rotation.z = rotation.z;
        this.scene.add(model);
      },
      undefined,
      (error) => console.error('Error loading GLB model:', error)
    );
  }

  private createText(text: string, position: THREE.Vector3): void {
    // Charger la police
    const loader = new FontLoader();
    loader.load('assets/fonts/helvetiker_bold.typeface.json', (font) => {
      const geometry = new TextGeometry(text, {
        font: font,
        size: 0.25,
        height: 0.05,
        curveSegments: 32,
      });

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Couleur du texte
        roughness: 0.7,
        metalness: 0.0,
      });

      const textMesh = new THREE.Mesh(geometry, material);
      textMesh.position.copy(position);
      textMesh.rotateY(Math.PI);
      this.scene.add(textMesh);
    });
  }

  private createCone(
    radius: number,
    height: number,
    radialSegments: number,
    color: number = 0x2b7ec1
  ): THREE.Mesh {
    const coneGeometry = new THREE.ConeGeometry(
      radius,
      height,
      radialSegments,
      1,
      false,
      -Math.PI / 4
    );
    const coneMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.2,
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    return cone;
  }

  private cleanUp(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
    }
  }

  public createScene(
    canvas: ElementRef<HTMLCanvasElement>,
    width: number,
    length: number,
    height: number,
    thickness: number
  ): void {
    this.initCanvas(canvas);
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.initObjects(width, length, height, thickness);
    this.initControls();
    this.addHelpers();

    // Charger le modèle GLB
    const modelPosition = new THREE.Vector3(
      width / 2 - thickness * 1.25,
      height,
      length / 2 - thickness * 1.25
    ); // Position du modèle
    this.loadGLBModel('assets/glbFile/spot.glb', modelPosition, 1, {
      x: Math.PI,
      y: -Math.PI / 4,
    });
  }

  private initCanvas(canvas: ElementRef<HTMLCanvasElement>): void {
    this.canvas = canvas.nativeElement;
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0xeeeeee);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    this.scene.add(this.camera);
  }

  private initLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.2);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);
    this.scene.add(ambientLight);
  }

  private initObjects(
    width: number,
    length: number,
    height: number,
    thickness: number
  ): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xafb1ae,
      roughness: 0.2,
      metalness: 0.55,
    });

    // Mur avant sans porte
    const frontWallGeometry = new THREE.BoxGeometry(width, height, thickness);
    const frontWallMesh = new THREE.Mesh(frontWallGeometry, wallMaterial);

    // Créer la géométrie de la porte
    const doorWidth = 1.05;
    const doorHeight = 2;
    const doorThickness = thickness + 0.1;

    const doorGeometry = new THREE.BoxGeometry(
      doorWidth,
      doorHeight,
      doorThickness
    );
    const doorMesh = new THREE.Mesh(doorGeometry);

    // Utiliser CSG pour soustraire la porte du mur
    const csgWall = CSG.fromMesh(frontWallMesh);
    const csgDoor = CSG.fromMesh(doorMesh);
    const subtractedWall = csgWall.subtract(csgDoor);
    // Convertir en mesh après la soustraction
    const wallWithDoor = CSG.toMesh(
      subtractedWall,
      frontWallMesh.matrix,
      wallMaterial
    );

    // Ajouter le mur avec la porte à la scène
    wallWithDoor.position.set(0, height / 2, -length / 2 + thickness / 2);
    this.scene.add(wallWithDoor);

    // Ajouter les autres murs (sans modifications)
    this.addWalls(width, length, height, thickness, wallMaterial);

    // Charger la texture d'environnement (cubeMap)
    const envTexture = new THREE.CubeTextureLoader()
      .setPath('assets/cubemap/')
      .load([
        'px.jpg',
        'checkerboard.png',
        'checkerboard.png',
        'checkerboard.png',
        'checkerboard.png',
        'checkerboard.png',
      ]);

    this.scene.environment = envTexture;
    // this.addConesToWall(width, length, height, thickness);

    // Ajouter le sol cadrillé
    this.addCheckeredFloor(width, length);

    // Ajouter le texte au-dessus de la porte
    const textPosition = new THREE.Vector3(
      width / 2 - thickness,
      height, // Positionner légèrement au-dessus du mur
      -length / 2
    );
    this.createText('SIEPEL', textPosition);
  }

  private addWalls(
    width: number,
    length: number,
    height: number,
    thickness: number,
    wallMaterial: THREE.Material
  ): void {
    // Mur arrière (sans porte)
    const backWallGeometry = new THREE.BoxGeometry(width, height, thickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, length / 2 - thickness / 2);
    this.scene.add(backWall);

    // Mur gauche
    const leftWallGeometry = new THREE.BoxGeometry(thickness, height, length);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2 + thickness / 2, height / 2, 0);
    this.scene.add(leftWall);

    // Mur droit
    const rightWallGeometry = new THREE.BoxGeometry(thickness, height, length);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(width / 2 - thickness / 2, height / 2, 0);
    this.scene.add(rightWall);

    // Toit
    const roofGeometry = new THREE.BoxGeometry(width, thickness, length);
    const roof = new THREE.Mesh(roofGeometry, wallMaterial);
    roof.position.set(0, height + thickness / 2, 0);
    this.scene.add(roof);

    // Sol (déjà existant dans votre code, je laisse pour la cohérence)
    const floorGeometry = new THREE.BoxGeometry(width, thickness, length);
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.position.set(0, 0, 0);
    this.scene.add(floor);
  }

  private addConesToWall(
    width: number,
    length: number,
    height: number,
    thickness: number,
    coneHeight: number = 0.25,
    coneRadius: number = 0.125,
    radialSegments: number = 4
  ): void {
    const cone = this.createCone(coneRadius, coneHeight, radialSegments);
    const slantHeight = Math.sqrt(
      Math.pow(coneRadius, 2) + Math.pow(coneRadius, 2)
    );

    // Calcul du nombre de cônes en fonction des dimensions du mur
    const numConesRow = Math.floor((length - thickness) / slantHeight);
    const numConesColumn = Math.floor((width - thickness) / slantHeight);
    const numConesHeight = Math.floor((height - thickness) / slantHeight);
    const quarterwidth = (width - thickness * 2) / 8;
    const quarterlength = (length - thickness * 2) / 8;
    // Fonction pour créer et positionner un cône
    const addCone = (
      x: number,
      y: number,
      z: number,
      rotationX: number,
      rotationY: number,
      rotationZ: number,
      newCone?: THREE.Mesh
    ) => {
      let coneInstance = cone.clone();
      if (newCone) {
        coneInstance = newCone.clone();
      }
      coneInstance.rotation.set(rotationX, rotationY, rotationZ);
      coneInstance.position.set(x, y, z);
      this.scene.add(coneInstance);
    };

    // Création des cônes sur les différents murs
    for (let i = 0; i <= numConesHeight; i++) {
      for (let j = 0; j < numConesColumn; j++) {
        // Mur avant
        addCone(
          -width / 2 + thickness + slantHeight / 2 + j * slantHeight,
          coneRadius + i * slantHeight,
          -length / 2 + thickness + coneHeight / 2,
          Math.PI / 2,
          0,
          0
        );

        // Mur arrière
        addCone(
          -width / 2 + thickness + slantHeight / 2 + j * slantHeight,
          coneRadius + i * slantHeight,
          length / 2 - thickness - coneRadius,
          -Math.PI / 2,
          0,
          0
        );
      }
    }

    for (let i = 0; i < numConesHeight; i++) {
      for (let j = 0; j < numConesRow; j++) {
        // Mur gauche
        addCone(
          -width / 2 + thickness + coneRadius,
          slantHeight + thickness / 2 + i * slantHeight,
          -length / 2 + thickness + slantHeight / 2 + j * slantHeight,
          0,
          0,
          -Math.PI / 2
        );
        // Mur droit

        addCone(
          width / 2 - thickness - coneRadius,
          slantHeight + thickness / 2 + i * slantHeight,
          -length / 2 + thickness + slantHeight / 2 + j * slantHeight,
          0,
          0,
          Math.PI / 2
        );
      }
    }

    for (let i = 0; i < numConesColumn; i++) {
      for (let j = 0; j < numConesRow; j++) {
        // Mur du haut
        addCone(
          -width / 2 + thickness + coneRadius + i * slantHeight,
          height - thickness / 2,
          -length / 2 + thickness + slantHeight / 2 + j * slantHeight,
          0,
          0,
          Math.PI
        );
        // Mur du bas
        if (
          quarterwidth * 3 < i * slantHeight &&
          quarterwidth * 5 > i * slantHeight &&
          quarterlength * 3 < j * slantHeight &&
          quarterlength * 5 > j * slantHeight
        ) {
          addCone(
            -width / 2 + thickness + coneRadius + i * slantHeight,
            thickness + coneHeight / 2,
            -length / 2 + thickness + slantHeight / 2 + j * slantHeight,
            0,
            0,
            0,
            this.createCone(coneRadius, 0.001, 4, 0x0f0f00)
          );
        } else {
          addCone(
            -width / 2 + thickness + coneRadius + i * slantHeight,
            thickness - coneHeight / 2,
            -length / 2 + thickness + slantHeight / 2 + j * slantHeight,
            0,
            0,
            0
          );
        }
      }
    }
  }

  private addCheckeredFloor(width: number, length: number): void {
    const size = Math.max(width, length); // Taille du sol
    const divisions = Math.max(width, length) / 2; // Nombre de divisions pour le cadrillage
    const cbGeometry = new THREE.PlaneGeometry(
      size,
      size,
      divisions,
      divisions
    );

    // Charger la texture de sol cadrillé
    const checkerTexture = this.loadTexture('assets/checkerboard.png');
    checkerTexture.wrapS = THREE.RepeatWrapping;
    checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.repeat.set(divisions / 10, divisions / 10); // Ajuster la répétition de la texture

    // Créer un matériau avec la texture de sol cadrillé
    const cbMaterial = new THREE.MeshStandardMaterial({
      map: checkerTexture,
      side: THREE.DoubleSide,
    });

    // Créer le maillage pour le sol
    this.floor = new THREE.Mesh(cbGeometry, cbMaterial);
    this.floor.rotation.x = -Math.PI / 2; // Rotation du sol pour qu'il soit horizontal
    this.floor.position.y = -0.5; // Positionner le sol
    this.scene.add(this.floor);
  }

  private loadTexture(url: string): THREE.Texture {
    return this.textureLoader.load(
      url,
      () => console.log('Texture loaded successfully'),
      undefined,
      (error) => console.error('Error loading texture:', error)
    );
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
  }

  private addHelpers(): void {
    this.gridHelper = new GridHelper(10, 10);
    this.gridHelper.position.y = -0.5;
    this.scene.add(this.gridHelper);
  }

  public render(): void {
    this.frameId = requestAnimationFrame(() => this.render());
    this.renderer.render(this.scene, this.camera);
  }

  public resize(): void {
    const { innerWidth: width, innerHeight: height } = window;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
