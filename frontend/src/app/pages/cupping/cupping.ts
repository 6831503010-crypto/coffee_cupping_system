import {
  Component,
  computed,
  ElementRef,
  inject,
  ViewChild,
  signal
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { CoffeeSample } from '../../models/coffee-sample';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-cupping',
  imports: [
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './cupping.html',
  styleUrl: './cupping.css'
})
export class Cupping {

  private readonly HISTORY_KEY =
    'aromaArtisans.cuppingHistory.v1';

  private readonly router = inject(Router);

  finalizing = signal(false);
  readonly fivePointScale = [1, 2, 3, 4, 5];

  readonly colorOptions = [
    'Low',
    'Medium',
    'High'
  ];

  readonly scoreOptions = Array.from(
    { length: 17 },
    (_, index) => 6 + index * 0.25
  );

  readonly aromaQualityGroups = [
    {
      parent: 'Floral',
      children: []
    },
    {
      parent: 'Fruity',
      children: [
        'Berry',
        'Dried Fruit',
        'Citrus Fruit'
      ]
    },
    {
      parent: 'Roasted',
      children: [
        'Cereal',
        'Burnt',
        'Tobacco'
      ]
    },
    {
      parent: 'Sour/Fermented',
      children: [
        'Sour',
        'Fermented'
      ]
    },
    {
      parent: 'Nutty/Cocoa',
      children: [
        'Nutty',
        'Cocoa'
      ]
    },
    {
      parent: 'Green/Vegetative',
      children: []
    },
    {
      parent: 'Spice',
      children: []
    },
    {
      parent: 'Sweet',
      children: [
        'Vanilla/Vanillin',
        'Brown Sugar'
      ]
    },
    {
      parent: 'Other',
      children: [
        'Chemical',
        'Musty/Earthy',
        'Woody'
      ]
    }
  ];

  readonly mainTasteOptions = [
    'Salty',
    'Bitter',
    'Sour',
    'Umami',
    'Sweet'
  ];


  previousSample() {

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    if (this.activeSample() > 1) {
      this.activeSample.update(
        current => current - 1
      );
    }

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(this.activeSample());
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(this.activeSample());
    }

    this.scrollToFormTop();
  }


  nextSample() {

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    const current = this.activeSample();
    const total = this.samples().length;

    const next =
      current < total
        ? current + 1
        : 1;

    this.activeSample.set(next);

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(next);
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(next);
    }

    this.scrollToFormTop();
  }


  private scrollToFormTop() {

    requestAnimationFrame(() => {

      this.cuppingPanel
        ?.nativeElement
        .scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    });
  }

  confirmAroma() {

    this.saveAromaForm();

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isAromaComplete(sample)
        )
        .map(sample => sample.id);

    if (incompleteSamples.length > 0) {

      this.aromaValidationActive.set(true);

      this.aromaErrorSamples.set(
        incompleteSamples
      );

      const firstIncomplete =
        incompleteSamples[0];

      this.activeSample.set(
        firstIncomplete
      );

      this.loadAromaForm(
        firstIncomplete
      );

      this.scrollToFirstAromaError();

      return;
    }




    this.aromaValidationActive.set(false);

    this.aromaErrorSamples.set([]);

    this.aromaLocked.set(true);

    this.aromaForm.disable({
      emitEvent: false
    });
  }

  private scrollToFirstAromaError() {

    requestAnimationFrame(() => {

      const firstError =
        this.cuppingPanel
          ?.nativeElement
          .querySelector(
            '.validation-error'
          );

      firstError?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

    });
  }

  isAromaQualitySelected(
    quality: string
  ): boolean {

    return this.aromaForm
      .controls
      .qualities
      .value
      .includes(quality);
  }


  onAromaQualityChange(
    quality: string,
    event: Event
  ) {

    const checkbox =
      event.target as HTMLInputElement;

    const current =
      this.aromaForm.controls.qualities.value;

    let updated: string[];

    if (checkbox.checked) {

      updated = current.includes(quality)
        ? current
        : [...current, quality];

    } else {

      updated = current.filter(
        value => value !== quality
      );
    }

    this.aromaForm
      .controls
      .qualities
      .setValue(updated);

    this.saveAromaForm();

    if (this.aromaValidationActive()) {
      this.refreshAromaValidation();
    }
  }

  aromaForm = new FormGroup({
    dry: new FormControl<number | null>(
      null,
      Validators.required
    ),

    break: new FormControl<number | null>(
      null,
      Validators.required
    ),

    color: new FormControl<string | null>(
      null,
      Validators.required
    ),

    qualityScore: new FormControl<number | null>(
      null,
      Validators.required
    ),

    qualities: new FormControl<string[]>(
      [],
      {
        nonNullable: true
      }
    )
  });

  flavorForm = new FormGroup({
    flavor: new FormControl<number | null>(
      null,
      Validators.required
    ),

    aftertaste: new FormControl<number | null>(
      null,
      Validators.required
    ),

    acidity: new FormControl<number | null>(
      null,
      Validators.required
    ),

    body: new FormControl<number | null>(
      null,
      Validators.required
    ),

    balance: new FormControl<number | null>(
      null,
      Validators.required
    ),

    overall: new FormControl<number | null>(
      null,
      Validators.required
    ),

    acidityIntensity: new FormControl<number | null>(
      null,
      Validators.required
    ),

    bodyLevel: new FormControl<number | null>(
      null,
      Validators.required
    ),

    flavorQualities: new FormControl<string[]>(
      [],
      {
        nonNullable: true
      }
    ),

    mainTastes: new FormControl<string[]>(
      [],
      {
        nonNullable: true
      }
    )
  });


  onFlavorFormChange() {

    this.saveFlavorForm();

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  isFlavorQualitySelected(
    quality: string
  ): boolean {

    return this.flavorForm
      .controls
      .flavorQualities
      .value
      .includes(quality);
  }


  onFlavorQualityChange(
    quality: string,
    event: Event
  ) {

    const checkbox =
      event.target as HTMLInputElement;

    const current =
      this.flavorForm
        .controls
        .flavorQualities
        .value;

    const updated =
      checkbox.checked
        ? (
            current.includes(quality)
              ? current
              : [...current, quality]
          )
        : current.filter(
            value => value !== quality
          );

    this.flavorForm
      .controls
      .flavorQualities
      .setValue(updated);

    this.saveFlavorForm();

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  isMainTasteSelected(
    taste: string
  ): boolean {

    return this.flavorForm
      .controls
      .mainTastes
      .value
      .includes(taste);
  }


  onMainTasteChange(
    taste: string,
    event: Event
  ) {

    const checkbox =
      event.target as HTMLInputElement;

    const current =
      this.flavorForm
        .controls
        .mainTastes
        .value;

    const updated =
      checkbox.checked
        ? (
            current.includes(taste)
              ? current
              : [...current, taste]
          )
        : current.filter(
            value => value !== taste
          );

    this.flavorForm
      .controls
      .mainTastes
      .setValue(updated);

    this.saveFlavorForm();

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

  private getFlavorMissingFields(
    sample: CoffeeSample
  ): string[] {

    const missing: string[] = [];
    const flavor = sample.flavor;

    if (flavor.flavor === null) {
      missing.push('flavor');
    }

    if (flavor.aftertaste === null) {
      missing.push('aftertaste');
    }

    if (flavor.acidity === null) {
      missing.push('acidity');
    }

    if (flavor.body === null) {
      missing.push('body');
    }

    if (flavor.balance === null) {
      missing.push('balance');
    }

    if (flavor.overall === null) {
      missing.push('overall');
    }

    if (flavor.acidityIntensity === null) {
      missing.push('acidityIntensity');
    }

    if (flavor.bodyLevel === null) {
      missing.push('bodyLevel');
    }

    if (
      !flavor.flavorQualities ||
      flavor.flavorQualities.length === 0
    ) {
      missing.push('flavorQualities');
    }

    if (
      !flavor.mainTastes ||
      flavor.mainTastes.length === 0
    ) {
      missing.push('mainTastes');
    }

    if (
      this.getDefectiveCupCount(sample) > 0 &&
      flavor.defectType !== 'taint' &&
      flavor.defectType !== 'fault'
    ) {
      missing.push('defectType');
    }

    return missing;
  }


  isFlavorComplete(
    sample: CoffeeSample
  ): boolean {

    return (
      this.getFlavorMissingFields(sample)
        .length === 0
    );
  }


  hasFlavorError(
    field: string
  ): boolean {

    return this.activeFlavorMissingFields()
      .includes(field);
  }


  hasFlavorSampleError(
    sampleId: number
  ): boolean {

    return this.flavorErrorSamples()
      .includes(sampleId);
  }


  private refreshFlavorValidation() {

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isFlavorComplete(sample)
        )
        .map(sample => sample.id);

    this.flavorErrorSamples.set(
      incompleteSamples
    );
  }


  private scrollToFirstFlavorError() {

    requestAnimationFrame(() => {

      const firstError =
        this.cuppingPanel
          ?.nativeElement
          .querySelector(
            '.validation-error'
          );

      firstError?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

    });
  }


  goToReview() {

    this.saveFlavorForm();

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isFlavorComplete(sample)
        )
        .map(sample => sample.id);

    if (incompleteSamples.length > 0) {

      this.flavorValidationActive.set(true);

      this.flavorErrorSamples.set(
        incompleteSamples
      );

      const firstIncomplete =
        incompleteSamples[0];

      this.activeSample.set(
        firstIncomplete
      );

      this.loadFlavorForm(
        firstIncomplete
      );

      this.scrollToFirstFlavorError();

      return;
    }

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('review');
    this.activeSample.set(1);

    this.scrollToFormTop();
  }


  private getAromaMissingFields(
  sample: CoffeeSample
): string[] {

  const missing: string[] = [];

  if (!sample.aroma.dry) {
    missing.push('dry');
  }

  if (!sample.aroma.break) {
    missing.push('break');
  }

  if (!sample.aroma.color) {
    missing.push('color');
  }

  if (!sample.aroma.qualityScore) {
    missing.push('qualityScore');
  }

  if (sample.aroma.qualities.length === 0) {
      missing.push('aromaQualities');
    }

    return missing;
  }


  isAromaComplete(
    sample: CoffeeSample
  ): boolean {

    return (
      this.getAromaMissingFields(sample).length === 0
    );
  }


  hasAromaError(
    field: string
  ): boolean {

    return this.activeAromaMissingFields()
      .includes(field);
  }


  hasAromaSampleError(
    sampleId: number
  ): boolean {

    return this.aromaErrorSamples()
      .includes(sampleId);
  }

  onAromaFormChange() {

    if (this.aromaLocked()) {
      return;
    }

    this.saveAromaForm();

    if (this.aromaValidationActive()) {
      this.refreshAromaValidation();
    }
  }

  private refreshAromaValidation() {

    const incompleteSamples =
      this.samples()
        .filter(
          sample => !this.isAromaComplete(sample)
        )
        .map(sample => sample.id);

    this.aromaErrorSamples.set(
      incompleteSamples
    );
  }

  @ViewChild('cuppingPanel')
  cuppingPanel?: ElementRef<HTMLElement>;

  sampleCount = new FormControl<number | null>(
    null,
    {
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(10)
      ]
    }
  );

  sampleCountError = signal('');
  currentStage = signal<'aroma' | 'flavor' | 'review'>('aroma');

  sessionStarted = signal(false);

  selectedSampleCount = signal(0);
  aromaLocked = signal(false);

  aromaValidationActive = signal(false);

  aromaErrorSamples = signal<number[]>([]);

  flavorValidationActive = signal(false);

  flavorErrorSamples = signal<number[]>([]);


  changeSampleCount(change: number) {

    const value = this.sampleCount.value;

    let count =
      typeof value === 'number'
        ? value
        : Number(value);

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 10
    ) {
      count = 1;
    } else {
      count += change;
    }

    count = Math.max(
      1,
      Math.min(10, count)
    );

    this.sampleCount.setValue(count);

    this.sampleCountError.set('');
  }


  decreaseDisabled(): boolean {

    const count = this.sampleCount.value;

    return (
      count === null ||
      !Number.isInteger(count) ||
      count <= 1 ||
      count > 10
    );
  }


  increaseDisabled(): boolean {

    const count = this.sampleCount.value;

    return (
      Number.isInteger(count) &&
      count !== null &&
      count >= 10
    );
  }


  clearSampleCountError() {
    this.sampleCountError.set('');
  }


  startCupping() {

    const count = this.sampleCount.value;
    this.currentStage.set('aroma');
    if (
      count === null ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 10
    ) {

      this.sampleCountError.set(
        'Please enter a whole number from 1 to 10.'
      );

      return;
    }

    this.selectedSampleCount.set(count);
    const newSamples = Array.from(
      { length: count },
      (_, index) =>
        this.createSample(index + 1)
    );

    this.aromaLocked.set(false);

    this.aromaValidationActive.set(false);

    this.aromaErrorSamples.set([]);

    this.flavorValidationActive.set(false);

    this.flavorErrorSamples.set([]);

    this.aromaForm.enable({
      emitEvent: false
    });

    this.samples.set(newSamples);

    this.activeSample.set(1);

    this.loadAromaForm(1);

    this.sampleCountError.set('');

    this.sessionStarted.set(true);

    requestAnimationFrame(() => {

      this.cuppingPanel?.nativeElement
        .scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

    });
  }

  samples = signal<CoffeeSample[]>([]);

  activeSample = signal(1);

  activeSampleData = computed(() =>
    this.samples().find(
      sample => sample.id === this.activeSample()
    )
  );

  activeAromaMissingFields = computed(() => {

    if (!this.aromaValidationActive()) {
      return [];
    }

    const sample = this.activeSampleData();

    return sample
      ? this.getAromaMissingFields(sample)
      : [];
  });


  activeFlavorMissingFields = computed(() => {

    if (!this.flavorValidationActive()) {
      return [];
    }

    const sample = this.activeSampleData();

    return sample
      ? this.getFlavorMissingFields(sample)
      : [];
  });

  private createSample(id: number): CoffeeSample {
    return {
      id,

      aroma: {
        dry: null,
        break: null,
        color: null,
        qualityScore: null,
        qualities: []
      },

      flavor: {
        flavor: null,
        aftertaste: null,
        acidity: null,
        body: null,
        balance: null,
        overall: null,

        acidityIntensity: null,
        bodyLevel: null,

        uniformity: [
          false,
          false,
          false,
          false,
          false
        ],

        cleanCup: [
          false,
          false,
          false,
          false,
          false
        ],

        sweetness: [
          false,
          false,
          false,
          false,
          false
        ],

        defectType: null,

        flavorQualities: [],
        mainTastes: []
      }
    };
  }

  private saveAromaForm() {

    const sampleId = this.activeSample();

    const values =
      this.aromaForm.getRawValue();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          aroma: {
            ...sample.aroma,

            dry: values.dry,
            break: values.break,
            color: values.color,
            qualityScore: values.qualityScore,
            qualities: [...values.qualities]
          }
        };
      })
    );
  }


  private loadAromaForm(sampleId: number) {

    const sample = this.samples().find(
      item => item.id === sampleId
    );

    if (!sample) {
      return;
    }

    this.aromaForm.reset(
      {
        dry: sample.aroma.dry,
        break: sample.aroma.break,
        color: sample.aroma.color,
        qualityScore: sample.aroma.qualityScore,
        qualities: [...sample.aroma.qualities]
      },
      {
        emitEvent: false
      }
    );
  }


  calculateCupScore(values: boolean[] | undefined): number {
    if (!Array.isArray(values)) {
      return 0;
    }

    return values.filter(Boolean).length * 2;
  }


  isCupSelected(
    group: 'uniformity' | 'cleanCup' | 'sweetness',
    cupIndex: number
  ): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return sample.flavor[group][cupIndex] ?? false;
  }


  onCupChange(
    group: 'uniformity' | 'cleanCup' | 'sweetness',
    cupIndex: number,
    event: Event
  ) {

    this.saveFlavorForm();

    const checkbox =
      event.target as HTMLInputElement;

    const checked = checkbox.checked;
    const sampleId = this.activeSample();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        const flavor = {
          ...sample.flavor,
          uniformity: [...sample.flavor.uniformity],
          cleanCup: [...sample.flavor.cleanCup],
          sweetness: [...sample.flavor.sweetness]
        };

        if (group === 'sweetness') {
          flavor.sweetness[cupIndex] = checked;
        } else {
          flavor.uniformity[cupIndex] = checked;
          flavor.cleanCup[cupIndex] = checked;
        }

        if (
          flavor.uniformity.filter(value => !value).length === 0
        ) {
          flavor.defectType = null;
        }

        return {
          ...sample,
          flavor
        };
      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  getDefectiveCupCount(
    sample: CoffeeSample | undefined
  ): number {

    if (!sample) {
      return 0;
    }

    return sample.flavor.uniformity
      .filter(value => !value)
      .length;
  }


  cupLabel(count: number): string {
    return count <= 1
      ? 'cup'
      : 'cups';
  }


  getDefectPoints(
    defectType: 'taint' | 'fault' | null
  ): number {

    if (defectType === 'taint') {
      return -2;
    }

    if (defectType === 'fault') {
      return -4;
    }

    return 0;
  }


  getDefectLabel(
    defectType: 'taint' | 'fault' | null
  ): string {

    if (defectType === 'taint') {
      return 'Taint(-2)';
    }

    if (defectType === 'fault') {
      return 'Fault(-4)';
    }

    return '0';
  }


  calculateDefectDeduction(
    sample: CoffeeSample | undefined
  ): number {

    if (!sample) {
      return 0;
    }

    return (
      this.getDefectiveCupCount(sample) *
      this.getDefectPoints(sample.flavor.defectType)
    );
  }


  setDefectType(
    defectType: 'taint' | 'fault'
  ) {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,
            defectType
          }
        };
      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }


  private saveFlavorForm() {

    const sampleId = this.activeSample();

    const values =
      this.flavorForm.getRawValue();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            flavor: values.flavor,
            aftertaste: values.aftertaste,
            acidity: values.acidity,
            body: values.body,
            balance: values.balance,
            overall: values.overall,
            acidityIntensity: values.acidityIntensity,
            bodyLevel: values.bodyLevel,
            flavorQualities: [...values.flavorQualities],
            mainTastes: [...values.mainTastes]
          }
        };
      })
    );
  }


  private loadFlavorForm(sampleId: number) {

    const sample = this.samples().find(
      item => item.id === sampleId
    );

    if (!sample) {
      return;
    }

    this.flavorForm.reset(
      {
        flavor: sample.flavor.flavor,
        aftertaste: sample.flavor.aftertaste,
        acidity: sample.flavor.acidity,
        body: sample.flavor.body,
        balance: sample.flavor.balance,
        overall: sample.flavor.overall,
        acidityIntensity: sample.flavor.acidityIntensity,
        bodyLevel: sample.flavor.bodyLevel,
        flavorQualities: [...sample.flavor.flavorQualities],
        mainTastes: [...sample.flavor.mainTastes]
      },
      {
        emitEvent: false
      }
    );
  }

  selectSample(id: number) {

    if (id === this.activeSample()) {
      return;
    }

    if (this.currentStage() === 'aroma') {
      this.saveAromaForm();
    }

    if (this.currentStage() === 'flavor') {
      this.saveFlavorForm();
    }

    this.activeSample.set(id);

    if (this.currentStage() === 'aroma') {
      this.loadAromaForm(id);
    }

    if (this.currentStage() === 'flavor') {
      this.loadFlavorForm(id);
    }
  }


  goToFlavor() {

    if (!this.aromaLocked()) {
      return;
    }

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');

    this.activeSample.set(1);

    this.loadFlavorForm(1);

    this.scrollToFormTop();
  }

  formatScore(value: unknown): string {

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    return Number.isInteger(number)
      ? String(number)
      : String(
          parseFloat(
            number.toFixed(2)
          )
        );
  }


  calculateBaseScore(
    sample: CoffeeSample
  ): number {

    return (
      (Number(sample.aroma.qualityScore) || 0) +
      (Number(sample.flavor.flavor) || 0) +
      (Number(sample.flavor.aftertaste) || 0) +
      (Number(sample.flavor.acidity) || 0) +
      (Number(sample.flavor.body) || 0) +
      this.calculateCupScore(
        sample.flavor.uniformity
      ) +
      this.calculateCupScore(
        sample.flavor.cleanCup
      ) +
      (Number(sample.flavor.balance) || 0) +
      this.calculateCupScore(
        sample.flavor.sweetness
      ) +
      (Number(sample.flavor.overall) || 0)
    );
  }


  calculateFinalScore(
    sample: CoffeeSample
  ): number {

    return (
      this.calculateBaseScore(sample) +
      this.calculateDefectDeduction(sample)
    );
  }


  formatDefectDeduction(
    sample: CoffeeSample
  ): string {

    return this.formatScore(
      Math.abs(
        this.calculateDefectDeduction(sample)
      )
    );
  }


  backToFlavor() {

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');
    this.activeSample.set(1);

    this.loadFlavorForm(1);

    this.scrollToFormTop();
  }


  editFlavor(id: number) {

    this.flavorValidationActive.set(false);
    this.flavorErrorSamples.set([]);

    this.currentStage.set('flavor');
    this.activeSample.set(id);

    this.loadFlavorForm(id);

    this.scrollToFormTop();
  }


  private readExistingHistory(): any[] {

    try {

      const parsed = JSON.parse(
        localStorage.getItem(this.HISTORY_KEY) || '[]'
      );

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch {

      return [];
    }
  }


  finalizeEvaluation() {

    if (this.finalizing()) {
      return;
    }

    this.finalizing.set(true);

    const completedAt =
      new Date().toISOString();

    const savedSamples =
      this.samples().map(sample => ({
        id: sample.id,

        aroma: {
          ...sample.aroma,
          qualities: [
            ...sample.aroma.qualities
          ]
        },

        flavor: {
          ...sample.flavor,

          uniformity: [
            ...sample.flavor.uniformity
          ],

          cleanCup: [
            ...sample.flavor.cleanCup
          ],

          sweetness: [
            ...sample.flavor.sweetness
          ],

          flavorQualities: [
            ...sample.flavor.flavorQualities
          ],

          mainTastes: [
            ...sample.flavor.mainTastes
          ]
        },

        finalScore:
          this.calculateFinalScore(sample)
      }));

    const record = {
      id: `${Date.now()}`,
      completedAt,
      samples: savedSamples
    };

    const existing =
      this.readExistingHistory();

    localStorage.setItem(
      this.HISTORY_KEY,
      JSON.stringify([
        record,
        ...existing
      ])
    );

    this.router.navigate(['/history']);
  }

}
