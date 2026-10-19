import {
  Component,
  OnInit,
  DestroyRef,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IndividualSessionService,
  SessionView
} from '../../services/individual-session.service';

@Component({
  selector: 'app-cupping',
  imports: [
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './cupping.html',
  styleUrl: './cupping.css'
})
export class Cupping implements OnInit {

  private readonly HISTORY_KEY =
    'aromaArtisans.cuppingHistory.v1';

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  private readonly individualSessions = inject(IndividualSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessionIdParam =
    this.route.snapshot.queryParamMap.get('sessionId');

  readonly isSavedSession = this.sessionIdParam !== null;

  loadingSession = signal(false);
  sessionLoadError = signal('');
  savedSession = signal<SessionView | null>(null);

  ngOnInit(): void {
    if (!this.isSavedSession) {
      return;
    }

    const sessionId = Number(this.sessionIdParam);

    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      this.sessionLoadError.set('Invalid session ID.');
      return;
    }

    this.loadingSession.set(true);

    this.individualSessions.get(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this.loadingSession.set(false);

          if (!session.canEvaluate) {
            this.sessionLoadError.set(
              'You are not an evaluator for this session.'
            );
            return;
          }

          if (session.samples.length === 0) {
            this.sessionLoadError.set(
              'This session does not contain any coffee samples.'
            );
            return;
          }

          this.savedSession.set(session);

          // Preserve sequential positions for Previous/Next navigation.
          // Database IDs and full sample details remain in savedSession.
          this.samples.set(
            session.samples.map((_, index) =>
              this.createSample(index + 1)
            )
          );

          this.selectedSampleCount.set(session.samples.length);
          this.activeSample.set(1);
          this.currentStage.set('aroma');

          this.aromaLocked.set(false);
          this.aromaValidationActive.set(false);
          this.aromaErrorSamples.set([]);
          this.flavorValidationActive.set(false);
          this.flavorErrorSamples.set([]);

          this.aromaForm.enable({ emitEvent: false });
          this.loadAromaForm(1);
          this.sessionStarted.set(true);
        },
        error: () => {
          this.loadingSession.set(false);
          this.sessionLoadError.set(
            'Unable to load this session. Check your login and access, then refresh.'
          );
        }
      });
  }

  sampleDetails(position: number) {
    return this.savedSession()?.samples[position - 1];
  }

  sampleLabel(position: number): string {
    return this.sampleDetails(position)?.sampleCode
      ?? String(position);
  }


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

  groupSelectedQualities(
    values: string[] | undefined
  ): { parent: string; children: string[] }[] {

    if (!Array.isArray(values) || values.length === 0) {
      return [];
    }

    const selected = new Set(values);
    const known = new Set<string>();

    const groups: {
      parent: string;
      children: string[];
    }[] = [];

    for (const group of this.aromaQualityGroups) {

      known.add(group.parent);

      group.children.forEach(
        child => known.add(child)
      );

      const children = group.children.filter(
        child => selected.has(child)
      );

      if (
        selected.has(group.parent) ||
        children.length > 0
      ) {
        groups.push({
          parent: group.parent,
          children
        });
      }
    }

    // Preserve any unrecognized descriptors.
    for (const quality of selected) {
      if (!known.has(quality)) {
        groups.push({
          parent: quality,
          children: []
        });
      }
    }

    return groups;
  }

  private updateQualitySelection(
    current: string[],
    quality: string,
    checked: boolean
  ): string[] {

    const updated = new Set(current);

    const parentGroup = this.aromaQualityGroups.find(
      group => group.parent === quality
    );

    const childGroup = this.aromaQualityGroups.find(
      group => group.children.includes(quality)
    );

    if (checked) {

      // Selecting a child also selects its parent.
      if (childGroup) {
        updated.add(childGroup.parent);
      }

      updated.add(quality);

    } else if (parentGroup) {

      // Unchecking a parent clears its children.
      updated.delete(parentGroup.parent);

      parentGroup.children.forEach(
        child => updated.delete(child)
      );

    } else {

      // Unchecking a child keeps its parent.
      updated.delete(quality);

    }

    return [...updated];
  }


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

      this.scrollToFirstError();

      return;
    }




    this.aromaValidationActive.set(false);

    this.aromaErrorSamples.set([]);

    this.aromaLocked.set(true);

    this.aromaForm.disable({
      emitEvent: false
    });
  }

  private scrollToFirstError() {

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

    const updated = this.updateQualitySelection(
      current,
      quality,
      checkbox.checked
    );

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
    ),

    otherTastingNotes: new FormControl<string>(
      '',
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
    otherTastingNotes: new FormControl<string>(
      '',
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

    const updated = this.updateQualitySelection(
      current,
      quality,
      checkbox.checked
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

      this.scrollToFirstError();

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
    if (this.isSavedSession) {
      return;
    }


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
        qualities: [],
        otherTastingNotes: ''
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

        uniformity: Array(5).fill(false),

        cleanCup: Array(5).fill(false),

        sweetness: Array(5).fill(false),

        defectType: null,

        flavorQualities: [],
        otherTastingNotes: ''
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
            qualities: [...values.qualities],
            otherTastingNotes: values.otherTastingNotes
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
        qualities: [...sample.aroma.qualities],
        otherTastingNotes:sample.aroma.otherTastingNotes
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

  areUniformityAndCleanCupAllSelected(): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return (
      sample.flavor.uniformity.every(Boolean) &&
      sample.flavor.cleanCup.every(Boolean)
    );
  }


  toggleUniformityAndCleanCupAll() {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    const shouldSelectAll =
      !this.areUniformityAndCleanCupAllSelected();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        const newValues = Array(5).fill(shouldSelectAll);

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            uniformity: [...newValues],
            cleanCup: [...newValues],

            // Any bulk change resets the defect choice.
            // If all cups are checked, there are no defects.
            // If all are unchecked, the user must choose
            // Taint or Fault again.
            defectType: null
          }
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
            otherTastingNotes:values.otherTastingNotes
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
        otherTastingNotes:sample.flavor.otherTastingNotes
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

  areAllSweetnessSelected(): boolean {

    const sample = this.activeSampleData();

    if (!sample) {
      return false;
    }

    return sample.flavor.sweetness.every(Boolean);
  }


  toggleSweetnessAll() {

    this.saveFlavorForm();

    const sampleId = this.activeSample();

    const shouldSelectAll =
      !this.areAllSweetnessSelected();

    this.samples.update(samples =>
      samples.map(sample => {

        if (sample.id !== sampleId) {
          return sample;
        }

        return {
          ...sample,

          flavor: {
            ...sample.flavor,

            sweetness: Array(5).fill(shouldSelectAll)
          }
        };

      })
    );

    if (this.flavorValidationActive()) {
      this.refreshFlavorValidation();
    }
  }

}
