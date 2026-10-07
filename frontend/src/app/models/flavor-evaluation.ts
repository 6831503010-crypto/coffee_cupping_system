export type DefectType = 'taint' | 'fault' | null;

export interface FlavorEvaluation {
  flavor: number | null;
  aftertaste: number | null;
  acidity: number | null;
  body: number | null;
  balance: number | null;
  overall: number | null;

  acidityIntensity: number | null;
  bodyLevel: number | null;

  uniformity: boolean[];
  cleanCup: boolean[];
  sweetness: boolean[];

  defectType: DefectType;

  flavorQualities: string[];
  mainTastes: string[];
}
