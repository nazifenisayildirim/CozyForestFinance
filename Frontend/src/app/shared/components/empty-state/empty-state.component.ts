import { Component, Input } from '@angular/core';
import { MascotMessageComponent, MascotCharacter, MascotMood } from '../mascot-message/mascot-message.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MascotMessageComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() character: MascotCharacter = 'raccoon';
  @Input() mood: MascotMood = 'focused';
  @Input() message = 'Henüz kayıt yok.';
}
