import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { EngineService } from './engine.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-engine',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./engine.component.scss'],
  templateUrl: './engine.component.html',
  imports: [FormsModule],
})
export class EngineComponent implements OnInit {
  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  public width: number = 25;
  public length: number = 10;
  public height: number = 5;
  public thickness: number = 0.5;

  public constructor(private engServ: EngineService) {}

  public ngOnInit(): void {
    this.engServ.createScene(
      this.rendererCanvas,
      this.width,
      this.length,
      this.height,
      this.thickness
    );
    this.engServ.render();
  }

  public onSubmit(): void {
    this.engServ.createScene(
      this.rendererCanvas,
      this.width,
      this.length,
      this.height,
      this.thickness
    );
    this.engServ.render();
  }
}
