import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

import { EngineComponent } from './engine/engine.component';
import { TestComponent } from './test/test.component';
@Component({
  selector: 'app-root',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  imports: [EngineComponent, TestComponent],
})
export class AppComponent {}
