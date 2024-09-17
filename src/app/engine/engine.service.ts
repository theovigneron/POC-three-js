import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GridHelper, TextureLoader } from 'three';

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

  private createCone(
    radius: number,
    height: number,
    radialSegments: number
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
      color: 0x2b7ec1, // Couleur des cônes
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

    const wallMaterialfront = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 1,
      metalness: 0,
    });

    // Mur avant
    const frontWallGeometry = new THREE.BoxGeometry(width, height, thickness);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, height / 2, -length / 2 + thickness / 2);
    this.scene.add(frontWall);
    this.addConesToWall(frontWall, width, length, height, thickness, 'front');

    // Mur arrière
    const backWallGeometry = new THREE.BoxGeometry(width, height, thickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, length / 2 - thickness / 2);
    this.scene.add(backWall);
    this.addConesToWall(backWall, width, length, height, thickness, 'back');

    // Mur gauche
    const leftWallGeometry = new THREE.BoxGeometry(thickness, height, length);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2 + thickness / 2, height / 2, 0);
    this.scene.add(leftWall);
    this.addConesToWall(leftWall, width, length, height, thickness, 'left');

    // Mur droit
    const rightWallGeometry = new THREE.BoxGeometry(thickness, height, length);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterialfront);
    rightWall.position.set(width / 2 - thickness / 2, height / 2, 0);
    this.scene.add(rightWall);
    this.addConesToWall(rightWall, width, length, height, thickness, 'right');

    // Sol
    const floorGeometry = new THREE.BoxGeometry(width, thickness, length);
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.position.set(0, 0, 0);
    this.scene.add(floor);

    // Toit
    const roofGeometry = new THREE.BoxGeometry(width, thickness, length);
    const roof = new THREE.Mesh(roofGeometry, wallMaterial);
    roof.position.set(0, height + thickness / 2, 0);
    this.scene.add(roof);

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

    // Ajouter le sol cadrillé
    this.addCheckeredFloor(width, length);
  }

  private addConesToWall(
    wall: THREE.Mesh,
    width: number,
    length: number,
    height: number,
    thickness: number,
    wallType: 'front' | 'back' | 'left' | 'right'
  ): void {
    const coneRadius = 0.5; // Rayon des cônes
    const coneHeight = 1; // Hauteur des cônes
    const radialSegments = 4; // Segments radiaux du cône

    const cone = this.createCone(coneRadius, coneHeight, radialSegments);
    let numConesRow, numConesColumn, x, y, z;
    const slantHeight = Math.sqrt(
      Math.pow(coneRadius, 2) + Math.pow(coneRadius, 2)
    );
    console.log(coneRadius * 2 - slantHeight);
    switch (wallType) {
      case 'front':
        numConesRow = Math.floor((height - thickness * 2) / slantHeight);
        numConesColumn = Math.floor((width - thickness * 2) / slantHeight);
        console.log(numConesColumn);

        for (let i = 0; i <= numConesColumn; i++) {
          let x, y, z;
          const coneInstance = cone.clone();
          x = -width / 2 + thickness + slantHeight / 2 + i * slantHeight;
          y = 0;
          z = -length / 2 + thickness + coneHeight / 2;
          coneInstance.rotation.x = Math.PI / 2;
          coneInstance.position.set(x, y, z);
          this.scene.add(coneInstance);
          // for (let j = 0; j < numConesRow; j++) {

          // }
        }
        break;
      // case 'back':
      //   numConesRow = Math.floor(height / spacing + coneRadius * 2);
      //   numConesColumn = Math.floor(width / spacing + coneRadius * 2);
      //   for (let i = 0; i < numConesColumn; i++) {
      //     for (let j = 0; j < numConesRow; j++) {
      //       let x, y, z;
      //       const coneInstance = cone.clone();
      //       x = -width / 2 + thickness + coneRadius + i * spacing;
      //       y = 0.25 + j * spacing;
      //       z = length / 2 - thickness - coneRadius;
      //       coneInstance.rotation.x = -Math.PI / 2;
      //       coneInstance.position.set(x, y, z);
      //       this.scene.add(coneInstance);
      //     }
      //   }
      //   break;
      // case 'left':
      //   numConesRow = Math.floor(length / spacing + coneRadius * 2);
      //   numConesColumn = Math.floor(height / spacing + coneRadius * 2);
      //   for (let i = 0; i < numConesColumn; i++) {
      //     for (let j = 0; j < numConesRow; j++) {
      //       let x, y, z;
      //       const coneInstance = cone.clone();
      //       x = -(width / 2);
      //       y = spacing / 2 + i * spacing;
      //       z = -length / 2 + spacing / 2 + j * spacing;
      //       coneInstance.rotation.z = -Math.PI / 2;
      //       coneInstance.position.set(
      //         -width / 2 + thickness + coneRadius,
      //         y,
      //         z
      //       );
      //       this.scene.add(coneInstance);
      //     }
      //   }
      //   break;
      // case 'right':
      //   numConesRow = Math.floor(length / spacing + coneRadius * 2);
      //   numConesColumn = Math.floor(height / spacing + coneRadius * 2);
      //   for (let i = 0; i < numConesColumn; i++) {
      //     for (let j = 0; j < numConesRow; j++) {
      //       const coneInstance = cone.clone();
      //       x = width / 2 - thickness - coneRadius;
      //       y = spacing / 2 + i * spacing;
      //       z = -length / 2 + spacing / 2 + j * spacing;
      //       coneInstance.rotation.z = Math.PI / 2;
      //       coneInstance.position.set(x, y, z);
      //       this.scene.add(coneInstance);
      //     }
      //   }
      //   break;
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
