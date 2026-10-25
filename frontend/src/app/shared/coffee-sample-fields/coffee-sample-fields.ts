import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoffeeSampleDraft } from '../../services/coffee-inventory.service';

@Component({
  selector: 'app-coffee-sample-fields',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './coffee-sample-fields.html',
  styleUrl: './coffee-sample-fields.css'
})
export class CoffeeSampleFields {
  @Input({ required: true }) sample!: CoffeeSampleDraft;
  @Input() idPrefix = 'coffee';
  @Input() disabled = false;
}
