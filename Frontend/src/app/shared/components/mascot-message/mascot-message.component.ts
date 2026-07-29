import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MascotCharacter = 'girl' | 'raccoon' | 'squirrel' | 'frog' | 'robot';

// Kılavuz bölüm 5 ile birebir eşleşen ifade/poz isimleri.
export type GirlMood = 'prep'
export type RaccoonMood = 'happy' | 'focused' | 'shocked';
export type SquirrelMood = 'calm' | 'scared' | 'excited';
export type FrogMood = 'happy' | 'thinking' | 'mouth-open' | 'combo';
export type RobotMood = 'normal' | 'working' | 'approved';

export type MascotMood = GirlMood | RaccoonMood | SquirrelMood | FrogMood | RobotMood;

@Component({
  selector: 'app-mascot-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mascot-message.component.html',
  styleUrl: './mascot-message.component.scss'
})
export class MascotMessageComponent {
  @Input({ required: true }) character!: MascotCharacter;
  @Input({ required: true }) mood!: MascotMood;
  @Input({ required: true }) message!: string;
  /** İkincil, daha küçük satır (opsiyonel). Kılavuz: balon en fazla iki kısa satır. */
  @Input() subMessage?: string;

  get imageSrc(): string {
    return `assets/characters/${this.character}-${this.mood}.png`;
  }
}
