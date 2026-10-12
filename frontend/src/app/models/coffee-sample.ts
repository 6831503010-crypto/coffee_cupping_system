import { AromaEvaluation } from './aroma-evaluation';
import { FlavorEvaluation } from './flavor-evaluation';

export interface CoffeeSample {
  id: number;
  aroma: AromaEvaluation;
  flavor: FlavorEvaluation;
}
